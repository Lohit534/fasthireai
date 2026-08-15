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

// GET /api/feedback
export async function GET(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const adminClient = getAdminClient() as any;
    const { data, error } = await adminClient
      .from("Feedback")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/feedback
export async function DELETE(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await request.json();
    const adminClient = getAdminClient() as any;
    const { error } = await adminClient.from("Feedback").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
