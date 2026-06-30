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
import { getAdminClient } from "@/lib/supabase/admin";

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
    const admin = getAdminClient() as any;

    let query = admin.from("Resume").select("*").eq("jobTitle", "SUPPORT_TICKET").order("createdAt", { ascending: false });
    
    if (!isOwner) {
      query = query.eq("userId", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const messages = (data || []).map((row: any) => {
      try {
        const meta = JSON.parse(row.jobDescription || "{}");
        return {
          id: row.id,
          userId: row.userId,
          userEmail: meta.userEmail,
          userPlan: meta.userPlan,
          userCredits: meta.userCredits,
          message: row.originalText,
          reply: row.optimizedText || null,
          status: meta.status,
          createdAt: row.createdAt,
          repliedAt: meta.repliedAt
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json(messages);
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
    const admin = getAdminClient() as any;

    if (body.action === "reply") {
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { messageId, replyText } = body;
      if (!messageId || !replyText) {
        return NextResponse.json({ error: "messageId and replyText are required." }, { status: 400 });
      }

      // Fetch existing
      const { data: existing } = await admin.from("Resume").select("*").eq("id", messageId).single();
      if (!existing) return NextResponse.json({ error: "Message not found." }, { status: 404 });

      const meta = JSON.parse(existing.jobDescription || "{}");
      meta.status = "replied";
      meta.repliedAt = new Date().toISOString();

      const { data, error } = await admin
        .from("Resume")
        .update({
          optimizedText: replyText,
          jobDescription: JSON.stringify(meta)
        })
        .eq("id", messageId)
        .select()
        .single();
        
      if (error) throw error;
      
      return NextResponse.json({ success: true, message: data });
    } else if (body.action === "delete") {
      if (!isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { messageId } = body;
      if (!messageId) {
        return NextResponse.json({ error: "messageId is required." }, { status: 400 });
      }

      const { error } = await admin.from("Resume").delete().eq("id", messageId);
      if (error) throw error;

      return NextResponse.json({ success: true });
    } else {
      const { message, userPlan, userCredits } = body;
      if (!message || typeof message !== "string") {
        return NextResponse.json({ error: "Message is required." }, { status: 400 });
      }

      const meta = {
        userEmail: user.email,
        userPlan: userPlan || "free",
        userCredits: userCredits !== undefined ? userCredits : 0,
        status: "pending",
        repliedAt: null
      };

      const newTicket = {
        userId: user.id,
        jobTitle: "SUPPORT_TICKET",
        company: "FASTHIRE_SUPPORT",
        originalText: message.trim(),
        jobDescription: JSON.stringify(meta),
        optimizedText: "",
        scoreBefore: 0,
        scoreAfter: 0,
        keywordsBefore: 0,
        keywordsAfter: 0,
        impactBefore: 0,
        impactAfter: 0,
        keywordsAdded: [],
        createdAt: new Date().toISOString()
      };

      const { data, error } = await admin
        .from("Resume")
        .insert(newTicket)
        .select()
        .single();
        
      if (error) throw error;

      return NextResponse.json({ success: true, message: data });
    }
  } catch (error: any) {
    logger.error("[messages-api] POST Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
