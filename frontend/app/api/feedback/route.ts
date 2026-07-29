import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";
import { generateUUID } from "@/lib/utils";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFeedback(): any[] {
  try {
    ensureDir();
    if (fs.existsSync(FEEDBACK_FILE)) {
      const content = fs.readFileSync(FEEDBACK_FILE, "utf8");
      return JSON.parse(content || "[]");
    }
  } catch (e) {
    logger.warn("[feedback] File read error:", e);
  }
  return [];
}

function writeFeedback(data: any[]) {
  try {
    ensureDir();
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    logger.error("[feedback] File write error:", e);
  }
}

function purgeOlderThan24h(records: any[]): any[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return records.filter((r) => new Date(r.createdAt).getTime() > cutoff);
}

// POST /api/feedback — save feedback message (writes to Supabase DB + local fallback)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { name, email, type, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const recordId = generateUUID();
    const nowISO = new Date().toISOString();
    const senderEmail = email?.trim() || user?.email || "";
    const senderName = name?.trim() || user?.email?.split("@")[0] || "Anonymous";

    const meta = {
      name: senderName,
      email: senderEmail,
      type: type || "general",
      userEmail: senderEmail,
      status: "pending",
    };

    // 1. Save to Supabase DB (Resume table with jobTitle: "USER_FEEDBACK")
    try {
      const adminSupabase = getAdminClient();
      await adminSupabase.from("Resume").insert({
        id: recordId,
        userId: user?.id || null,
        jobTitle: "USER_FEEDBACK",
        company: type || "general",
        originalText: message.trim(),
        jobDescription: JSON.stringify(meta),
        scoreBefore: 0,
        scoreAfter: 0,
        keywordsBefore: 0,
        keywordsAfter: 0,
        impactBefore: 0,
        impactAfter: 0,
        keywordsAdded: [],
        createdAt: nowISO,
      });
      logger.info(`[feedback] Saved feedback to Supabase DB for ${senderEmail}`);
    } catch (dbErr: any) {
      logger.warn("[feedback] Supabase insert failed, relying on local JSON:", dbErr?.message);
    }

    // 2. Also save to local JSON fallback
    const record = {
      id: recordId,
      name: senderName,
      email: senderEmail,
      type: type || "general",
      message: message.trim(),
      userId: user?.id || null,
      createdAt: nowISO,
    };

    const existing = readFeedback();
    const fresh = purgeOlderThan24h(existing);
    fresh.unshift(record);
    writeFeedback(fresh);

    logger.info(`[feedback] New feedback saved from ${senderEmail}: type=${type || "general"}`);
    return NextResponse.json({ success: true, id: recordId });
  } catch (error: any) {
    logger.error("[feedback] Error saving feedback:", error?.message);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}

// GET /api/feedback — admin only, returns all feedback (queries Supabase DB + local fallback, auto-purges >24h)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isOwnerEmail(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const expiredIdsToDelete: string[] = [];

    // 1. Fetch from Supabase DB
    let dbItems: any[] = [];
    try {
      const adminSupabase = getAdminClient();
      const { data: dbRows, error: dbErr } = await adminSupabase
        .from("Resume")
        .select("*")
        .eq("jobTitle", "USER_FEEDBACK")
        .order("createdAt", { ascending: false });

      if (!dbErr && dbRows) {
        dbItems = dbRows
          .map((row: any) => {
            const createdAtTime = new Date(row.createdAt).getTime();
            if (now - createdAtTime > TWENTY_FOUR_HOURS) {
              expiredIdsToDelete.push(row.id);
              return null;
            }

            try {
              const meta = JSON.parse(row.jobDescription || "{}");
              return {
                id: row.id,
                name: meta.name || row.userId || "Anonymous",
                email: meta.email || meta.userEmail || "",
                type: meta.type || row.company || "general",
                message: row.originalText,
                userId: row.userId,
                createdAt: row.createdAt,
              };
            } catch (e) {
              return {
                id: row.id,
                name: "Anonymous",
                email: "",
                type: row.company || "general",
                message: row.originalText,
                userId: row.userId,
                createdAt: row.createdAt,
              };
            }
          })
          .filter(Boolean);
      }
    } catch (dbErr: any) {
      logger.warn("[feedback] DB fetch error, using local fallback:", dbErr?.message);
    }

    // Auto-clean expired DB items (>24h)
    if (expiredIdsToDelete.length > 0) {
      try {
        const adminSupabase = getAdminClient();
        await adminSupabase.from("Resume").delete().in("id", expiredIdsToDelete);
        logger.info(`[feedback] Auto-deleted ${expiredIdsToDelete.length} expired feedback item(s) from DB.`);
      } catch (e) {}
    }

    // 2. Fetch from local JSON fallback
    const localRecords = purgeOlderThan24h(readFeedback());

    // 3. Merge DB and local records (avoiding duplicates)
    const recordsMap = new Map();
    [...dbItems, ...localRecords].forEach((item) => {
      if (item && item.id && !recordsMap.has(item.id)) {
        recordsMap.set(item.id, item);
      }
    });

    const combined = Array.from(recordsMap.values());
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(combined);
  } catch (error: any) {
    logger.error("[feedback] Error fetching feedback:", error?.message);
    return NextResponse.json({ error: "Failed to fetch feedback." }, { status: 500 });
  }
}

// DELETE /api/feedback — admin only, delete a specific feedback by id
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isOwnerEmail(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    // 1. Delete from Supabase DB
    try {
      const adminSupabase = getAdminClient();
      await adminSupabase.from("Resume").delete().eq("id", id);
    } catch (e) {}

    // 2. Delete from local JSON fallback
    const existing = readFeedback();
    const updated = existing.filter((r) => r.id !== id);
    writeFeedback(updated);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[feedback] Error deleting feedback:", error?.message);
    return NextResponse.json({ error: "Failed to delete feedback." }, { status: 500 });
  }
}
