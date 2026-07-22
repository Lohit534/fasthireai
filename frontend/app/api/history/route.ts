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

    // Resolve user record ID in public.User to prevent email unique ID mismatch
    let activeUserId = user.id;
    try {
      if (user.email) {
        const admin = getAdminClient() as any;
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();

        if (existingUser) {
          activeUserId = existingUser.id;
          logger.info(`[history] Found existing User record for email ${user.email} with ID ${existingUser.id}. Reusing this ID.`);
        }
      }
    } catch (e: any) {
      logger.warn("[history] Failed to resolve user ID by email:", e.message);
    }

    // 1. Fetch from database with fallback
    let dbData: any[] = [];
    try {
      const admin = getAdminClient() as any;
      const { data, error } = await admin
        .from("Resume")
        .select("*")
        .eq("userId", activeUserId)
        .neq("jobTitle", "SUPPORT_TICKET")
        .order("createdAt", { ascending: false });
      if (!error && data) {
        // Filter to only include optimized resumes (non-empty job description)
        dbData = data.filter((r: any) => r.jobDescription && r.jobDescription.trim() !== "");
      } else if (error) {
        logger.warn("[history] DB fetch returned error:", error.message);
      }
    } catch (dbErr: any) {
      logger.warn("[history] DB fetch crashed, using fallbacks:", dbErr.message);
    }

    // 2. Fetch from local JSON file
    let localData: any[] = [];
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf8");
        const allResumes = JSON.parse(fileContent || "[]");
        // Deduplicate and filter to only include optimized resumes (non-empty job description)
        localData = allResumes.filter((r: any) => 
          (r.userId === activeUserId || r.userId === user.id) &&
          r.jobDescription && 
          r.jobDescription.trim() !== ""
        );
      }
    } catch (jsonErr: any) {
      logger.warn("[history] Local JSON read failed:", jsonErr.message);
    }

    // 3. Merge and deduplicate by id
    const combined = [...dbData];
    for (const r of localData) {
      if (!combined.some((dbR) => dbR.id === r.id)) {
        combined.push(r);
      }
    }

    // Sort by createdAt descending
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Resolve plan tier to determine retention cutoff
    let retentionMonths = 1; // Default free: 1 month
    const isOwner = isOwnerEmail(user.email);
    if (!isOwner) {
      try {
        const admin = getAdminClient() as any;
        const { data: creditRow } = await admin
          .from("Credit")
          .select("paidCredits")
          .eq("userId", activeUserId)
          .maybeSingle();
        const paidCredits = creditRow?.paidCredits ?? 0;
        if (paidCredits >= 900000) {
          retentionMonths = 4;
        } else if (paidCredits > 0) {
          retentionMonths = 2;
        }
      } catch (e) {
        logger.warn("[history] Failed to fetch credits for retention:", e);
      }
    }

    let filtered = combined;
    if (!isOwner) {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
      filtered = combined.filter((r) => {
        const itemDate = new Date(r.createdAt);
        return itemDate >= cutoffDate;
      });
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    logger.error("[history] GET Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during history fetch." },
      { status: 500 }
    );
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
