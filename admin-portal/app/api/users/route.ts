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

// GET /api/users — list all users with synchronized plan status, 1-year claim checks, and pricing credits
export async function GET(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = getAdminClient() as any;
    const now = new Date();

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

    // 3. Map credit records by userId
    const creditMap: Record<string, any> = {};
    for (const c of credits || []) {
      creditMap[c.userId] = c;
    }

    // 4. Merge user profiles with exact database credits, 1-year early adopter perk status, and pricing plans
    const enriched = (users || []).map((u: any) => {
      const cred = creditMap[u.id] || {};
      const rawPaidCredits = cred.paidCredits ?? 0;
      const freeUsed = cred.freeUsed ?? 0;
      const planId = (cred.planId || "").toLowerCase();
      const billingCycle = cred.billingCycle || "monthly";

      // Check expiry date if user claimed 1-year perk or purchased subscription
      let isExpired = false;
      if (cred.expiresAt) {
        const exp = new Date(cred.expiresAt);
        if (now > exp) isExpired = true;
      }

      let plan: "owner" | "promax" | "premium" | "free" = "free";
      let displayPaidCredits = rawPaidCredits;

      if (isAdminEmail(u.email)) {
        plan = "owner";
        displayPaidCredits = 999999;
      } else if (!isExpired && (rawPaidCredits > 900000 || planId === "promax")) {
        plan = "promax";
        displayPaidCredits = 999999;
      } else if (!isExpired && (rawPaidCredits > 0 || planId === "premium" || billingCycle === "yearly")) {
        plan = "premium";
        displayPaidCredits = rawPaidCredits > 0 ? rawPaidCredits : 15;
      } else {
        plan = "free";
        displayPaidCredits = 0;
      }

      return {
        ...u,
        plan,
        paidCredits: displayPaidCredits,
        freeUsed,
        billingCycle,
        expiresAt: cred.expiresAt || null,
      };
    });

    // 5. Fetch platform analytics
    const { count: totalOptimizations } = await adminClient
      .from("Resume")
      .select("id", { count: "exact", head: true })
      .neq("jobTitle", "SUPPORT_TICKET");

    const { count: totalTickets } = await adminClient
      .from("Resume")
      .select("id", { count: "exact", head: true })
      .eq("jobTitle", "SUPPORT_TICKET");

    const analytics = {
      totalOptimizations: totalOptimizations || 0,
      totalTickets: totalTickets || 0,
    };

    return NextResponse.json({ users: enriched, analytics });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/users — modify a user's plan and credits in Supabase "Credit" table
export async function POST(request: NextRequest) {
  const admin_user = await verifyAdmin(request);
  if (!admin_user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetUserId, planId, customCredits } = await request.json();
    if (!targetUserId || !planId) {
      return NextResponse.json({ error: "targetUserId and planId are required" }, { status: 400 });
    }

    const adminClient = getAdminClient() as any;
    const now = new Date();

    // Map plan to exact pricing credits and expiry cycle
    let paidCredits = 0;
    let billingCycle = "monthly";
    let expiresAt: string | null = null;

    if (customCredits !== undefined && Number(customCredits) >= 0) {
      paidCredits = Number(customCredits);
    } else if (planId === "premium") {
      paidCredits = 15;
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (planId === "promax") {
      paidCredits = 999999;
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Free plan
      paidCredits = 0;
      expiresAt = null;
    }

    const { error } = await adminClient
      .from("Credit")
      .upsert(
        {
          userId: targetUserId,
          planId: planId,
          paidCredits: paidCredits,
          billingCycle: billingCycle,
          expiresAt: expiresAt,
          updatedAt: now.toISOString(),
        },
        { onConflict: "userId" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, paidCredits });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
