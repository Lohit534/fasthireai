/**
 * GET /api/history
 *
 * Fetches the resume optimization history for the authenticated user.
 * Uses the Supabase admin client to bypass client RLS issues.
 *
 * IMPORTANT: Do NOT use .neq("jobTitle", ...) in Supabase queries.
 * In PostgreSQL, `col != value` also excludes rows where col IS NULL,
 * which means all real optimization records (with non-system jobTitles)
 * can be silently dropped. All jobTitle filtering is done in JS instead.
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

// Titles used for system/internal records — never show in user history
const SYSTEM_TITLES = ["SUPPORT_TICKET", "USER_FEEDBACK"];

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient() as any;

    // Resolve User table ID by email (handles auth.id != User.id mismatch)
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

    // All IDs this user's records could be stored under
    const userIds = Array.from(new Set([activeUserId, user.id].filter(Boolean)));

    // 1. Fetch from Supabase DB
    //    - Use select("*") to get all columns
    //    - NO .neq() on jobTitle in SQL — PostgreSQL neq also excludes NULLs
    //    - Filter system records in JS after fetching
    let dbData: any[] = [];
    try {
      for (const uid of userIds) {
        try {
          const { data, error } = await admin
            .from("Resume")
            .select("*")
            .eq("userId", uid)
            .order("createdAt", { ascending: false });

          if (!error && Array.isArray(data)) {
            for (const r of data) {
              if (!dbData.some((d) => d.id === r.id)) {
                dbData.push(r);
              }
            }
          } else if (error) {
            logger.warn(`[history] DB fetch error for uid=${uid}:`, error.message);
          }
        } catch (_e) {}
      }

      // JS-side filter: exclude system records and records without a job description
      dbData = dbData.filter((r: any) => {
        if (r.jobTitle && SYSTEM_TITLES.includes(r.jobTitle)) return false;
        if (!r.jobDescription || r.jobDescription.trim().length === 0) return false;
        return true;
      });
    } catch (dbErr: any) {
      logger.warn("[history] DB fetch crashed:", dbErr.message);
    }

    // 2. Fetch from local JSON fallback (local dev only — not available on Vercel)
    let localData: any[] = [];
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf8");
        const allResumes = JSON.parse(fileContent || "[]");
        localData = allResumes.filter((r: any) =>
          userIds.includes(r.userId) &&
          r.jobDescription &&
          r.jobDescription.trim() !== "" &&
          !SYSTEM_TITLES.includes(r.jobTitle)
        );
      }
    } catch (_e) {}

    // 3. Merge and deduplicate by id (DB takes priority over local)
    const combined = [...dbData];
    for (const r of localData) {
      if (!combined.some((d) => d.id === r.id)) combined.push(r);
    }

    // 4. Sort by createdAt descending
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 5. Apply retention cutoff based on user plan
    let retentionMonths = 1; // free: 1 month
    const isOwner = isOwnerEmail(user.email);
    if (!isOwner) {
      try {
        const { data: creditRow } = await admin
          .from("Credit")
          .select("paidCredits")
          .eq("userId", activeUserId)
          .maybeSingle();
        const paid = creditRow?.paidCredits ?? 0;
        if (paid >= 900000) retentionMonths = 4;      // Pro Max
        else if (paid > 0) retentionMonths = 2;       // Premium
      } catch (_e) {}
    }

    let filtered = combined;
    if (!isOwner) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - retentionMonths);
      filtered = combined.filter((r) => new Date(r.createdAt) >= cutoff);
    }

    logger.info(`[history] Returning ${filtered.length} records for user ${user.email} (from ${combined.length} total)`);

    // Always return 200 with array — frontend shows empty state if []
    return NextResponse.json(filtered);

  } catch (error: any) {
    logger.error("[history] GET Unhandled error:", error?.message);
    // Never return 500 — return empty array so frontend shows empty state, not error
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

    // Resolve activeUserId
    let activeUserId = user.id;
    try {
      if (user.email) {
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();
        if (existingUser?.id) activeUserId = existingUser.id;
      }
    } catch (_e) {}

    // Delete from Supabase DB (check both possible userId values)
    for (const uid of Array.from(new Set([activeUserId, user.id]))) {
      try {
        await admin
          .from("Resume")
          .delete()
          .eq("id", id)
          .eq("userId", uid);
      } catch (_e) {}
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
