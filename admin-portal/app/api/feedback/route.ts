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

// GET /api/feedback — fetch feedback from Feedback table + fallback Resume table
export async function GET(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const adminClient = getAdminClient() as any;
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const feedbackMap = new Map();

    // 1. Check "Feedback" table
    try {
      const { data: fbRows } = await adminClient
        .from("Feedback")
        .select("*")
        .order("createdAt", { ascending: false });

      if (fbRows && Array.isArray(fbRows)) {
        fbRows.forEach((row: any) => {
          const createdAtTime = new Date(row.createdAt).getTime();
          if (now - createdAtTime <= TWENTY_FOUR_HOURS) {
            feedbackMap.set(row.id, {
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
      }
    } catch (e) {}

    // 2. Check fallback "Resume" table (jobTitle: "USER_FEEDBACK")
    try {
      const { data: dbRows } = await adminClient
        .from("Resume")
        .select("*")
        .eq("jobTitle", "USER_FEEDBACK")
        .order("createdAt", { ascending: false });

      if (dbRows && Array.isArray(dbRows)) {
        dbRows.forEach((row: any) => {
          if (!feedbackMap.has(row.id)) {
            const createdAtTime = new Date(row.createdAt).getTime();
            if (now - createdAtTime <= TWENTY_FOUR_HOURS) {
              try {
                const meta = JSON.parse(row.jobDescription || "{}");
                feedbackMap.set(row.id, {
                  id: row.id,
                  name: meta.name || row.company || "Anonymous",
                  email: meta.email || "",
                  type: meta.type || "general",
                  message: row.originalText || "",
                  userId: row.userId,
                  createdAt: row.createdAt,
                });
              } catch {
                feedbackMap.set(row.id, {
                  id: row.id,
                  name: row.company || "Anonymous",
                  email: "",
                  type: "general",
                  message: row.originalText || "",
                  userId: row.userId,
                  createdAt: row.createdAt,
                });
              }
            }
          }
        });
      }
    } catch (e) {}

    const result = Array.from(feedbackMap.values()).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/feedback — delete feedback record
export async function DELETE(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const adminClient = getAdminClient() as any;

    // Delete from both potential tables
    await adminClient.from("Feedback").delete().eq("id", id);
    await adminClient.from("Resume").delete().eq("id", id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
