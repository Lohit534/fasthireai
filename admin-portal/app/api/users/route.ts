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

// GET /api/users — list all users with plan/usage info
export async function GET(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = getAdminClient() as any;

    const { data: users, error } = await adminClient
      .from("User")
      .select("id, email, name, createdAt")
      .order("createdAt", { ascending: false });

    if (error) throw error;

    const { data: credits } = await adminClient
      .from("UserCredit")
      .select("userId, paidCredits, freeUsed, planId");

    const { data: resumes } = await adminClient
      .from("Resume")
      .select("userId");

    const { data: tickets } = await adminClient
      .from("SupportMessage")
      .select("userId");

    const creditMap: Record<string, any> = {};
    for (const c of credits || []) {
      creditMap[c.userId] = c;
    }

    const resumeCount: Record<string, number> = {};
    for (const r of resumes || []) {
      resumeCount[r.userId] = (resumeCount[r.userId] || 0) + 1;
    }

    const ticketCount: Record<string, number> = {};
    for (const t of tickets || []) {
      ticketCount[t.userId] = (ticketCount[t.userId] || 0) + 1;
    }

    const enriched = (users || []).map((u: any) => {
      const cred = creditMap[u.id] || {};
      const paidCredits = cred.paidCredits || 0;
      const freeUsed = cred.freeUsed || 0;
      const planId = cred.planId || "";

      let plan: string;
      if (isAdminEmail(u.email)) {
        plan = "owner";
      } else if (paidCredits > 900000) {
        plan = "promax";
      } else if (paidCredits > 0) {
        plan = "premium";
      } else {
        plan = planId || "free";
      }

      return { ...u, plan, paidCredits, freeUsed };
    });

    const analytics = {
      totalOptimizations: resumes?.length || 0,
      totalTickets: tickets?.length || 0,
    };

    return NextResponse.json({ users: enriched, analytics });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/users — update a user's plan
export async function POST(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetUserId, planId } = await request.json();
    if (!targetUserId || !planId) {
      return NextResponse.json({ error: "targetUserId and planId are required" }, { status: 400 });
    }

    const adminClient = getAdminClient() as any;

    let paidCredits = 0;
    if (planId === "premium") paidCredits = 15;
    else if (planId === "promax") paidCredits = 999999;

    const { error } = await adminClient
      .from("UserCredit")
      .upsert({ userId: targetUserId, planId, paidCredits }, { onConflict: "userId" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
