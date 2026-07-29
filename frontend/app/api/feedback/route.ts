import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";
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

function purgOlderThan24h(records: any[]): any[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return records.filter((r) => new Date(r.createdAt).getTime() > cutoff);
}

// POST /api/feedback — save feedback message
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { name, email, type, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const record = {
      id: "fb-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: name?.trim() || user?.email?.split("@")[0] || "Anonymous",
      email: email?.trim() || user?.email || "",
      type: type || "general",
      message: message.trim(),
      userId: user?.id || null,
      createdAt: new Date().toISOString(),
    };

    const existing = readFeedback();
    // Purge old entries first
    const fresh = purgOlderThan24h(existing);
    fresh.unshift(record);
    writeFeedback(fresh);

    logger.info(`[feedback] New feedback saved from ${record.email}: type=${record.type}`);
    return NextResponse.json({ success: true, id: record.id });
  } catch (error: any) {
    logger.error("[feedback] Error saving feedback:", error?.message);
    return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
  }
}

// GET /api/feedback — admin only, returns all feedback (with 24h purge)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isOwnerEmail(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = readFeedback();
    const fresh = purgOlderThan24h(existing);

    // If some were purged, write the updated list
    if (fresh.length !== existing.length) {
      writeFeedback(fresh);
    }

    return NextResponse.json(fresh);
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

    const existing = readFeedback();
    const updated = existing.filter((r) => r.id !== id);
    writeFeedback(updated);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[feedback] Error deleting feedback:", error?.message);
    return NextResponse.json({ error: "Failed to delete feedback." }, { status: 500 });
  }
}
