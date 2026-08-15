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

// GET /api/users — list all users with real Credit records & analytics
export async function GET(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = getAdminClient() as any;

    // 1. Fetch all registered users
    const { data: users, error: usersErr } = await adminClient
      .from("User")
      .select("id, email, name, createdAt")
      .order("createdAt", { ascending: false });

    if (usersErr) throw usersErr;

    // 2. Fetch all credit records from "Credit" table
    const { data: credits, error: creditsErr } = await adminClient
      .from("Credit")
      .select("*");

    if (creditsErr) throw creditsErr;

    // 3. Fetch first 50 early adopters list (for early adopter Pro accounts)
    const { data: first50Users } = await adminClient
      .from("User")
      .select("id")
      .order("createdAt", { ascending: true })
      .limit(50);

    const first50Set = new Set((first50Users || []).map((u: any) => u.id));
    const totalCount = users?.length || 0;

    // 4. Map credit records by userId
    const creditMap: Record<string, any> = {};
    for (const c of credits || []) {
      creditMap[c.userId] = c;
    }

    // 5. Merge user profiles with their real plan & credit balance
    const enriched = (users || []).map((u: any) => {
      const cred = creditMap[u.id] || {};
      const paidCredits = cred.paidCredits ?? 0;
      const freeUsed = cred.freeUsed ?? 0;
      const planId = (cred.planId || "").toLowerCase();
      const isFirst50 = totalCount <= 50 || first50Set.has(u.id);

      let plan: "owner" | "promax" | "premium" | "free" = "free";
      if (isAdminEmail(u.email)) {
        plan = "owner";
      } else if (paidCredits > 900000 || planId === "promax") {
        plan = "promax";
      } else if (paidCredits > 0 || planId === "premium" || isFirst50) {
        plan = "premium";
      } else {
        plan = "free";
      }

      return {
        ...u,
        plan,
        paidCredits: plan === "promax" ? 999999 : paidCredits > 0 ? paidCredits : isFirst50 ? 15 : 0,
        freeUsed,
      };
    });

    // 6. Analytics metrics
    const { count: totalOptimizations } = await adminClient
      .from("Resume")
      .select("id", { count: "exact", head: true });

    const { count: totalTickets } = await adminClient
      .from("SupportMessage")
      .select("id", { count: "exact", head: true });

    const analytics = {
      totalOptimizations: totalOptimizations || 0,
      totalTickets: totalTickets || 0,
    };

    return NextResponse.json({ users: enriched, analytics });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/users — modify a user's plan in Supabase "Credit" table
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
      .from("Credit")
      .upsert(
        {
          userId: targetUserId,
          planId: planId,
          paidCredits: paidCredits,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "userId" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
