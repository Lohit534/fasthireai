import { NextRequest, NextResponse } from "next/server";
import { supabase, getAdminClient } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  const { data } = await supabase.auth.getUser(token);
  if (!data?.user || !isAdminEmail(data.user.email)) return null;
  return data.user;
}

// GET /api/tickets
export async function GET(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const adminClient = getAdminClient() as any;
    const { data, error } = await adminClient
      .from("SupportMessage")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/tickets — reply or delete
export async function POST(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const adminClient = getAdminClient() as any;

    if (body.action === "reply") {
      const { messageId, replyText } = body;
      const { error } = await adminClient
        .from("SupportMessage")
        .update({ reply: replyText, status: "replied", repliedAt: new Date().toISOString() })
        .eq("id", messageId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete") {
      const { messageId } = body;
      const { error } = await adminClient
        .from("SupportMessage")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
