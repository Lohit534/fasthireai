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

    // Resolve User table ID by email
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

    // All IDs/identifiers this user's records could be stored under
    const userIds = Array.from(
      new Set(
        [
          activeUserId,
          user.id,
          user.email,
          user.email ? user.email.toLowerCase().trim() : null,
        ].filter(Boolean)
      )
    );

    // 1. Fetch from Supabase DB across all potential user IDs
    let dbData: any[] = [];
    for (const uid of userIds) {
      try {
        const { data, error } = await admin
          .from("Resume")
          .select("*")
          .eq("userId", uid);

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

    // JS-side filter: exclude system records only
    dbData = dbData.filter((r: any) => {
      if (r.jobTitle && SYSTEM_TITLES.includes(r.jobTitle)) return false;
      const hasContent =
        (r.optimizedText && r.optimizedText.trim().length > 0) ||
        (r.originalText && r.originalText.trim().length > 0) ||
        (r.jobDescription && r.jobDescription.trim().length > 0);
      return hasContent;
    });

    // 2. Fetch from local JSON fallback (local dev fallback)
    let localData: any[] = [];
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf8");
        const allResumes = JSON.parse(fileContent || "[]");
        localData = allResumes.filter((r: any) =>
          userIds.includes(r.userId) &&
          !SYSTEM_TITLES.includes(r.jobTitle) &&
          ((r.optimizedText && r.optimizedText.trim() !== "") ||
            (r.originalText && r.originalText.trim() !== ""))
        );
      }
    } catch (_e) {}

    // 3. Merge and deduplicate by id (DB takes priority over local)
    const combined = [...dbData];
    for (const r of localData) {
      if (!combined.some((d) => d.id === r.id)) combined.push(r);
    }

    // 4. Sort by createdAt descending
    combined.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    logger.info(
      `[history] Returning ${combined.length} history records for user ${user.email}`
    );

    return NextResponse.json(combined);
  } catch (error: any) {
    logger.error("[history] GET Unhandled error:", error?.message);
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
      return NextResponse.json(
        { error: "resumeId and scoreAfter are required." },
        { status: 400 }
      );
    }

    const admin = getAdminClient() as any;

    const { error: updateErr } = await admin
      .from("Resume")
      .update({ scoreAfter: Math.round(scoreAfter) })
      .eq("id", resumeId);

    if (updateErr) {
      logger.warn("[history PATCH] DB update failed:", updateErr.message);
    }

    try {
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

    const uids = Array.from(
      new Set([activeUserId, user.id, user.email, user.email?.toLowerCase().trim()].filter(Boolean))
    );

    for (const uid of uids) {
      try {
        await admin.from("Resume").delete().eq("id", id).eq("userId", uid);
      } catch (_e) {}
    }

    try {
      if (fs.existsSync(FILE_PATH)) {
        const localResumes = JSON.parse(fs.readFileSync(FILE_PATH, "utf8") || "[]");
        const filtered = localResumes.filter((r: any) => r.id !== id);
        fs.writeFileSync(FILE_PATH, JSON.stringify(filtered, null, 2), "utf8");
      }
    } catch (e: any) {
      logger.warn("[history DELETE] Local JSON delete failed:", e.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[history DELETE] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during delete." },
      { status: 500 }
    );
  }
}
