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

// POST /api/feedback — save feedback message (writes to Supabase Feedback table + Resume table + local fallback)
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

    const feedbackRecord = {
      id: recordId,
      name: senderName,
      email: senderEmail,
      type: type || "general",
      message: message.trim(),
      userId: user?.id || null,
      createdAt: nowISO,
    };

    const adminSupabase = getAdminClient();

    // 1. Save to dedicated "Feedback" table in Supabase
    try {
      await adminSupabase.from("Feedback").insert(feedbackRecord);
      logger.info(`[feedback] Saved to Supabase 'Feedback' table for ${senderEmail}`);
    } catch (e: any) {
      logger.warn("[feedback] Dedicated Feedback table insert failed:", e?.message);
    }

    // 2. Save to "Resume" table as fallback (jobTitle: "USER_FEEDBACK")
    const meta = {
      name: senderName,
      email: senderEmail,
      type: type || "general",
      userEmail: senderEmail,
      status: "pending",
    };
    try {
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
    } catch (e: any) {}

    // 3. Save to local JSON fallback
    const existing = readFeedback();
    const fresh = purgeOlderThan24h(existing);
    fresh.unshift(feedbackRecord);
    writeFeedback(fresh);

    logger.info(`[feedback] New feedback saved from ${senderEmail}: type=${type || "general"}`);
    return NextResponse.json({ success: true, id: recordId });
  } catch (error: any) {
    logger.error("[feedback] Error saving feedback:", error?.message);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}

// GET /api/feedback — admin only, returns all feedback (queries Supabase Feedback + Resume tables + local fallback, auto-purges >24h)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isOwnerEmail(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const adminSupabase = getAdminClient();
    const dbItemsMap = new Map();

    // 1. Query dedicated "Feedback" table
    try {
      const { data: fbRows } = await adminSupabase
        .from("Feedback")
        .select("*")
        .order("createdAt", { ascending: false });

      if (fbRows && Array.isArray(fbRows)) {
        const expiredIds: string[] = [];
        fbRows.forEach((row: any) => {
          const createdAtTime = new Date(row.createdAt).getTime();
          if (now - createdAtTime > TWENTY_FOUR_HOURS) {
            expiredIds.push(row.id);
          } else {
            dbItemsMap.set(row.id, {
              id: row.id,
              name: row.name || "Anonymous",
              email: row.email || "",
              type: row.type || "general",
              message: row.message,
              userId: row.userId,
              createdAt: row.createdAt,
            });
          }
        });

        // Auto-delete expired items asynchronously
        if (expiredIds.length > 0) {
          adminSupabase.from("Feedback").delete().in("id", expiredIds).then(() => {}).catch(() => {});
        }
      }
    } catch (e: any) {}

    // 2. Query fallback "Resume" table (jobTitle: "USER_FEEDBACK")
    try {
      const { data: dbRows } = await adminSupabase
        .from("Resume")
        .select("*")
        .eq("jobTitle", "USER_FEEDBACK")
        .order("createdAt", { ascending: false });

      if (dbRows && Array.isArray(dbRows)) {
        const expiredIds: string[] = [];
        dbRows.forEach((row: any) => {
          const createdAtTime = new Date(row.createdAt).getTime();
          if (now - createdAtTime > TWENTY_FOUR_HOURS) {
            expiredIds.push(row.id);
          } else if (!dbItemsMap.has(row.id)) {
            try {
              const meta = JSON.parse(row.jobDescription || "{}");
              dbItemsMap.set(row.id, {
                id: row.id,
                name: meta.name || row.userId || "Anonymous",
                email: meta.email || meta.userEmail || "",
                type: meta.type || row.company || "general",
                message: row.originalText,
                userId: row.userId,
                createdAt: row.createdAt,
              });
            } catch (e) {
              dbItemsMap.set(row.id, {
                id: row.id,
                name: "Anonymous",
                email: "",
                type: row.company || "general",
                message: row.originalText,
                userId: row.userId,
                createdAt: row.createdAt,
              });
            }
          }
        });

        if (expiredIds.length > 0) {
          adminSupabase.from("Resume").delete().in("id", expiredIds).then(() => {}).catch(() => {});
        }
      }
    } catch (e: any) {}

    // 3. Query local JSON fallback
    const localRecords = purgeOlderThan24h(readFeedback());
    localRecords.forEach((r) => {
      if (r && r.id && !dbItemsMap.has(r.id)) {
        dbItemsMap.set(r.id, r);
      }
    });

    const combined = Array.from(dbItemsMap.values());
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

    const adminSupabase = getAdminClient();

    // 1. Delete from Supabase Feedback table & Resume table
    try {
      await adminSupabase.from("Feedback").delete().eq("id", id);
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
