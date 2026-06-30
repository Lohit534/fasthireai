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
        dbData = data;
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
        localData = allResumes.filter((r: any) => r.userId === activeUserId || r.userId === user.id);
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

    return NextResponse.json(combined);
  } catch (error: any) {
    logger.error("[history] GET Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during history fetch." },
      { status: 500 }
    );
  }
}
