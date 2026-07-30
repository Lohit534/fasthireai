/**
 * GET /api/history
 *
 * Fetches the resume optimization history for the authenticated user.
 * Uses the Supabase admin client to bypass client RLS issues.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isOwnerEmail } from "@/types";

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "resumes.json");

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient() as any;

    // Resolve User table ID by email (handles cases where auth.id != User.id)
    let activeUserId = user.id;
    try {
      if (user.email) {
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();
        if (existingUser?.id) {
          activeUserId = existingUser.id;
        }
      }
    } catch (_e) {}

    // Build deduplicated list of IDs to search by
    const userIds = Array.from(new Set([activeUserId, user.id].filter(Boolean)));

    // 1. Fetch from Supabase DB
    let dbData: any[] = [];
    try {
      // Use .in() when we have multiple IDs, .eq() when only one
      let query = admin
        .from("Resume")
        .select("id, userId, jobTitle, company, scoreBefore, scoreAfter, keywordsBefore, keywordsAfter, impactBefore, impactAfter, optimizedText, originalText, jobDescription, keywordsAdded, createdAt, optimizedJson")
        .neq("jobTitle", "SUPPORT_TICKET")
        .neq("jobTitle", "USER_FEEDBACK")
        .order("createdAt", { ascending: false });

      if (userIds.length === 1) {
        query = query.eq("userId", userIds[0]);
      } else {
        query = query.in("userId", userIds);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        dbData = data.filter((r: any) =>
          r.jobDescription && r.jobDescription.trim().length > 0
        );
      } else if (error) {
        logger.warn("[history] DB .in() query error, trying fallback .eq():", error.message);
        // Fallback: try each ID separately
        for (const uid of userIds) {
          try {
            const { data: fallbackData, error: fallbackErr } = await admin
              .from("Resume")
              .select("id, userId, jobTitle, company, scoreBefore, scoreAfter, keywordsBefore, keywordsAfter, impactBefore, impactAfter, optimizedText, originalText, jobDescription, keywordsAdded, createdAt, optimizedJson")
              .eq("userId", uid)
              .neq("jobTitle", "SUPPORT_TICKET")
              .neq("jobTitle", "USER_FEEDBACK")
              .order("createdAt", { ascending: false });

            if (!fallbackErr && Array.isArray(fallbackData)) {
              const filtered = fallbackData.filter((r: any) =>
                r.jobDescription && r.jobDescription.trim().length > 0
              );
              // Deduplicate
              for (const r of filtered) {
                if (!dbData.some((d) => d.id === r.id)) dbData.push(r);
              }
            }
          } catch (_e) {}
        }
      }
    } catch (dbErr: any) {
      logger.warn("[history] DB fetch crashed:", dbErr.message);
    }

    // 2. Fetch from local JSON fallback (only available in local dev, not Vercel)
    let localData: any[] = [];
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf8");
        const allResumes = JSON.parse(fileContent || "[]");
        localData = allResumes.filter((r: any) =>
          userIds.includes(r.userId) &&
          r.jobDescription &&
          r.jobDescription.trim() !== ""
        );
      }
    } catch (_e) {}

    // 3. Merge and deduplicate by id (DB takes priority)
    const combined = [...dbData];
    for (const r of localData) {
      if (!combined.some((d) => d.id === r.id)) combined.push(r);
    }

    // 4. Sort by createdAt descending
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 5. Apply retention cutoff based on plan
    let retentionMonths = 1;
    const isOwner = isOwnerEmail(user.email);
    if (!isOwner) {
      try {
        const { data: creditRow } = await admin
          .from("Credit")
          .select("paidCredits")
          .eq("userId", activeUserId)
          .maybeSingle();
        const paid = creditRow?.paidCredits ?? 0;
        if (paid >= 900000) retentionMonths = 4;
        else if (paid > 0) retentionMonths = 2;
      } catch (_e) {}
    }

    let filtered = combined;
    if (!isOwner) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - retentionMonths);
      filtered = combined.filter((r) => new Date(r.createdAt) >= cutoff);
    }

    // Always return 200 — even if empty
    return NextResponse.json(filtered);
  } catch (error: any) {
    logger.error("[history] GET Unhandled error:", error?.message);
    // Return empty array instead of 500 so frontend shows empty state not error
    return NextResponse.json([]);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resumeId, scoreAfter } = body;

    if (!resumeId || scoreAfter === undefined) {
      return NextResponse.json({ error: "resumeId and scoreAfter are required." }, { status: 400 });
    }

    const admin = getAdminClient() as any;

    // Update in Supabase DB
    const { error: updateErr } = await admin
      .from("Resume")
      .update({ scoreAfter: Math.round(scoreAfter) })
      .eq("id", resumeId);

    if (updateErr) {
      logger.warn("[history PATCH] DB update failed:", updateErr.message);
    }

    // Also update in local JSON file fallback
    try {
      const DATA_DIR = path.join(process.cwd(), "data");
      const FILE_PATH = path.join(DATA_DIR, "resumes.json");
      if (fs.existsSync(FILE_PATH)) {
        const localResumes = JSON.parse(fs.readFileSync(FILE_PATH, "utf8") || "[]");
        const idx = localResumes.findIndex((r: any) => r.id === resumeId);
        if (idx !== -1) {
          localResumes[idx].scoreAfter = Math.round(scoreAfter);
          fs.writeFileSync(FILE_PATH, JSON.stringify(localResumes, null, 2), "utf8");
        }
      }
    } catch (e: any) {
      logger.warn("[history PATCH] Local JSON update failed:", e.message);
    }

    logger.info(`[history PATCH] Updated scoreAfter=${scoreAfter} for resumeId=${resumeId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[history PATCH] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during score update." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query param is required." }, { status: 400 });
    }

    const admin = getAdminClient() as any;

    // Delete from Supabase DB (only if it belongs to this user)
    const { error: deleteErr } = await admin
      .from("Resume")
      .delete()
      .eq("id", id)
      .eq("userId", user.id);

    if (deleteErr) {
      logger.warn("[history DELETE] DB delete failed:", deleteErr.message);
    }

    // Also delete from local JSON file fallback
    try {
      if (fs.existsSync(FILE_PATH)) {
        const localResumes = JSON.parse(fs.readFileSync(FILE_PATH, "utf8") || "[]");
        const filtered = localResumes.filter((r: any) => r.id !== id);
        fs.writeFileSync(FILE_PATH, JSON.stringify(filtered, null, 2), "utf8");
      }
    } catch (e: any) {
      logger.warn("[history DELETE] Local JSON delete failed:", e.message);
    }

    logger.info(`[history DELETE] Deleted resumeId=${id} for userId=${user.id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[history DELETE] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during delete." },
      { status: 500 }
    );
  }
}

