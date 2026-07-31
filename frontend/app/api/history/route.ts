/**
 * GET /api/history
 *
 * Fetches the resume optimization history for the authenticated user.
 * Supports both Server Cookie Auth and Authorization Bearer Token header.
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
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Fallback: If server cookie auth returned no user, check Authorization Bearer token header
    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
            authError = null;
          }
        } catch (_e) {}
      }
    }

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

    // 1. Fetch from Supabase DB across all potential user IDs using .in() query & fallback loop
    let dbData: any[] = [];
    try {
      const { data, error } = await admin
        .from("Resume")
        .select("*")
        .in("userId", userIds);

      if (!error && Array.isArray(data)) {
        dbData = data;
      } else {
        if (error) logger.warn(`[history] DB .in query warning:`, error.message);
      }
    } catch (_e) {}

    // Always run fallback loop to ensure no matching user record is missed
    for (const uid of userIds) {
      try {
        const { data: singleData } = await admin
          .from("Resume")
          .select("*")
          .eq("userId", uid);
        if (Array.isArray(singleData)) {
          for (const r of singleData) {
            if (!dbData.some((d) => d.id === r.id)) {
              dbData.push(r);
            }
          }
        }
      } catch (_e) {}
    }

    // JS-side filter: exclude system records only
    dbData = dbData.filter((r: any) => {
      if (r.jobTitle && SYSTEM_TITLES.includes(r.jobTitle)) return false;
      return true; // Return all user optimization records
    });

    // 2. Fetch from local JSON fallback (local dev fallback)
    let localData: any[] = [];
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf8");
        const allResumes = JSON.parse(fileContent || "[]");
        localData = allResumes.filter((r: any) =>
          userIds.includes(r.userId) &&
          !SYSTEM_TITLES.includes(r.jobTitle)
        );
      }
    } catch (_e) {}

    // 3. Merge and deduplicate by id (DB takes priority over local)
    const combined = [...dbData];
    for (const r of localData) {
      if (!combined.some((d) => d.id === r.id)) combined.push(r);
    }

    // 4. Sort by createdAt descending (newest optimizations after July 27 appear at top)
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
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
            authError = null;
          }
        } catch (_e) {}
      }
    }

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
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
            authError = null;
          }
        } catch (_e) {}
      }
    }

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
