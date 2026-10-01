import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function verifyAdmin(request: NextRequest): Promise<{ user: any; token: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  try {
    const adminClient = getAdminClient(token);
    const { data } = await adminClient.auth.getUser(token);
    if (data?.user && isAdminEmail(data.user.email)) {
      return { user: data.user, token };
    }
  } catch {
    // Continue to JWT fallback
  }

  const payload = parseJwtPayload(token);
  if (payload?.email && isAdminEmail(payload.email)) {
    const isExpired = payload.exp && payload.exp * 1000 < Date.now();
    if (!isExpired) {
      return {
        user: {
          id: payload.sub || "admin-user",
          email: payload.email,
          user_metadata: payload.user_metadata || {},
          role: payload.role || "authenticated",
        },
        token,
      };
    }
  }

  return null;
}

// GET /api/tickets — fetch support tickets from Resume table (jobTitle: "SUPPORT_TICKET")
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const adminClient = getAdminClient(auth.token) as any;
    const { data, error } = await adminClient
      .from("Resume")
      .select("*")
      .eq("jobTitle", "SUPPORT_TICKET")
      .order("createdAt", { ascending: false });

    if (error) {
      console.warn("[tickets/GET] Supabase notice:", error.message);
      return NextResponse.json([]);
    }

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
  const auth = await verifyAdmin(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const adminClient = getAdminClient(auth.token) as any;

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
