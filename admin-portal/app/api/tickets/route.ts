import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  const adminClient = getAdminClient();
  const { data } = await adminClient.auth.getUser(token);
  if (!data?.user || !isAdminEmail(data.user.email)) return null;
  return data.user;
}

// GET /api/tickets — fetch support tickets from Resume table (jobTitle: "SUPPORT_TICKET")
export async function GET(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const adminClient = getAdminClient() as any;
    const { data, error } = await adminClient
      .from("Resume")
      .select("*")
      .eq("jobTitle", "SUPPORT_TICKET")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    const formattedMessages = (data || []).map((row: any) => {
      try {
        const meta = JSON.parse(row.jobDescription || "{}");
        return {
          id: row.id,
          userId: row.userId,
          userEmail: meta.userEmail || "Anonymous",
          userPlan: meta.userPlan || "free",
          userCredits: meta.userCredits ?? 0,
          message: row.originalText || "",
          reply: row.optimizedText || null,
          status: meta.status || (row.optimizedText ? "replied" : "pending"),
          createdAt: row.createdAt,
          repliedAt: meta.repliedAt || null,
        };
      } catch (e) {
        return {
          id: row.id,
          userId: row.userId,
          userEmail: "Anonymous",
          userPlan: "free",
          userCredits: 0,
          message: row.originalText || "",
          reply: row.optimizedText || null,
          status: row.optimizedText ? "replied" : "pending",
          createdAt: row.createdAt,
          repliedAt: null,
        };
      }
    });

    return NextResponse.json(formattedMessages);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/tickets — reply to or delete a ticket
export async function POST(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const adminClient = getAdminClient() as any;

    if (body.action === "reply") {
      const { messageId, replyText } = body;
      if (!messageId || !replyText) {
        return NextResponse.json({ error: "messageId and replyText are required." }, { status: 400 });
      }

      const { data: existing, error: getErr } = await adminClient
        .from("Resume")
        .select("*")
        .eq("id", messageId)
        .eq("jobTitle", "SUPPORT_TICKET")
        .single();

      if (getErr || !existing) {
        return NextResponse.json({ error: "Message not found." }, { status: 404 });
      }

      let meta: any = {};
      try {
        meta = JSON.parse(existing.jobDescription || "{}");
      } catch {
        meta = {};
      }
      meta.status = "replied";
      meta.repliedAt = new Date().toISOString();

      const { error: updateErr } = await adminClient
        .from("Resume")
        .update({
          optimizedText: replyText.trim(),
          jobDescription: JSON.stringify(meta),
        })
        .eq("id", messageId);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      const { messageId } = body;
      if (!messageId) {
        return NextResponse.json({ error: "messageId is required." }, { status: 400 });
      }

      const { error: delErr } = await adminClient
        .from("Resume")
        .delete()
        .eq("id", messageId);

      if (delErr) throw delErr;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
