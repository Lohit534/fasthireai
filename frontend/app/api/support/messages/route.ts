/**
 * /api/support/messages
 *
 * GET: Retrieves the user's tickets (or all tickets if the user is an owner).
 * POST:
 *   - For users: Sends a new ticket message to the admin.
 *   - For admin: Replies to an existing ticket message.
 *
 * Uses a localized JSON file within the workspace to avoid database connectivity issues.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";
import { generateUUID } from "@/lib/utils";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "support_messages.json");

function readMessages(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, JSON.stringify([]), "utf8");
      return [];
    }
    const data = fs.readFileSync(FILE_PATH, "utf8");
    return JSON.parse(data || "[]");
  } catch (e) {
    logger.error("[messages-api] Read failed:", e);
    return [];
  }
}

function writeMessages(messages: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(messages, null, 2), "utf8");
  } catch (e) {
    logger.error("[messages-api] Write failed:", e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = isOwnerEmail(user.email);
    const messages = readMessages();

    if (isOwner) {
      return NextResponse.json(messages);
    } else {
      const userMsgs = messages.filter((m) => m.userId === user.id);
      return NextResponse.json(userMsgs);
    }
  } catch (error: any) {
    logger.error("[messages-api] GET Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const isOwner = isOwnerEmail(user.email);
    const messages = readMessages();

    if (body.action === "reply") {
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { messageId, replyText } = body;
      if (!messageId || !replyText) {
        return NextResponse.json({ error: "messageId and replyText are required." }, { status: 400 });
      }

      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) {
        return NextResponse.json({ error: "Message not found." }, { status: 404 });
      }

      messages[msgIndex].reply = replyText;
      messages[msgIndex].status = "replied";
      messages[msgIndex].repliedAt = new Date().toISOString();

      writeMessages(messages);
      return NextResponse.json({ success: true, message: messages[msgIndex] });
    } else {
      const { message, userPlan, userCredits } = body;
      if (!message || typeof message !== "string") {
        return NextResponse.json({ error: "Message is required." }, { status: 400 });
      }

      const newMsg = {
        id: generateUUID(),
        userId: user.id,
        userEmail: user.email,
        userPlan: userPlan || "free",
        userCredits: userCredits !== undefined ? userCredits : 0,
        message: message.trim(),
        reply: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        repliedAt: null
      };

      messages.unshift(newMsg);
      writeMessages(messages);

      return NextResponse.json({ success: true, message: newMsg });
    }
  } catch (error: any) {
    logger.error("[messages-api] POST Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
