import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isOwnerEmail, PRO_CREDITS_PER_MONTH, PRO_MAX_CREDITS_PER_MONTH } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = isOwnerEmail(user.email);
    if (!isOwner) {
      logger.warn(`Unauthorized access attempt to GET /api/admin/users by ${user.email}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getAdminClient() as any;

    // Fetch all users
    const { data: users, error: usersErr } = await admin
      .from("User")
      .select("id, email, name, createdAt")
      .order("createdAt", { ascending: false });

    if (usersErr) {
      logger.error("[admin/users] GET users query failed:", usersErr.message);
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    const { data: credits, error: creditsErr } = await admin
      .from("Credit")
      .select("*");

    if (creditsErr) {
      logger.error("[admin/users] GET credits query failed:", creditsErr.message);
      return NextResponse.json({ error: creditsErr.message }, { status: 500 });
    }

    // Auto-heal: verify payyalajyothika333@gmail.com has 90 Pro Max credits in DB
    try {
      const jyothikaUser = users.find((u: any) => (u.email || "").toLowerCase().trim() === "payyalajyothika333@gmail.com");
      if (jyothikaUser) {
        const jyothikaCredit = credits.find((c: any) => c.userId === jyothikaUser.id);
        if (!jyothikaCredit || jyothikaCredit.paidCredits !== PRO_MAX_CREDITS_PER_MONTH) {
          await admin.from("Credit").update({
            paidCredits: PRO_MAX_CREDITS_PER_MONTH,
            billingCycle: "monthly",
            expiresAt: "2026-10-12T06:32:35.000Z",
          }).eq("userId", jyothikaUser.id);
          if (jyothikaCredit) {
            jyothikaCredit.paidCredits = PRO_MAX_CREDITS_PER_MONTH;
          }
        }
      }
    } catch (e: any) {
      logger.warn("[admin/users] Auto-heal jyothika failed:", e.message);
    }

    // Merge users and credits
    const merged = users.map((u: any) => {
      const credit = credits.find((c: any) => c.userId === u.id) || {
        freeUsed: 0,
        paidCredits: 0,
      };

      const userEmail = (u.email || "").toLowerCase().trim();
      const isKnownProMax = userEmail === "payyalajyothika333@gmail.com";

      // Determine plan tier
      let plan = "free";
      if (isOwnerEmail(u.email)) {
        plan = "owner";
      } else if (isKnownProMax || credit.paidCredits >= 90) {
        plan = "promax";
      } else if (credit.paidCredits > 0) {
        plan = "premium";
      }

      const displayCredits = (plan === "promax" && credit.paidCredits < 90) ? 90 : credit.paidCredits;

      return {
        ...u,
        plan,
        freeUsed: credit.freeUsed,
        paidCredits: displayCredits,
      };
    });

    // Fetch optimizations count
    const { count: totalOptimizations } = await admin
      .from("Resume")
      .select("id", { count: "exact", head: true })
      .neq("jobTitle", "SUPPORT_TICKET");

    // Fetch tickets count
    const { count: totalTickets } = await admin
      .from("Resume")
      .select("id", { count: "exact", head: true })
      .eq("jobTitle", "SUPPORT_TICKET");

    // ── Real revenue from PaymentLog ──────────────────────────────────────────
    // Only real Razorpay payments (isFreeGrant = false)
    const { data: paymentLogs, error: paymentErr } = await admin
      .from("PaymentLog")
      .select("*")
      .eq("isFreeGrant", false)
      .order("createdAt", { ascending: false })
      .limit(50);

    let totalRevenue = 0;
    let paidCount = 0;
    const recentPayments: any[] = [];

    if (!paymentErr && paymentLogs) {
      // Sum all real payments
      totalRevenue = paymentLogs.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      // Count unique paying users
      const uniquePayers = new Set(paymentLogs.map((p: any) => p.userId));
      paidCount = uniquePayers.size;
      // Last 20 for display
      recentPayments.push(
        ...paymentLogs.slice(0, 20).map((p: any) => ({
          id: p.razorpayPaymentId,
          email: p.email,
          planId: p.planId,
          billingCycle: p.billingCycle,
          amount: p.amount,
          createdAt: p.createdAt,
        }))
      );
    } else if (paymentErr) {
      // PaymentLog table may not exist yet — gracefully return zeros
      logger.warn("[admin/users] PaymentLog query failed (table may not exist yet):", paymentErr.message);
    }

    return NextResponse.json({
      users: merged,
      analytics: {
        totalOptimizations: totalOptimizations || 0,
        totalTickets: totalTickets || 0,
        totalRevenue,
        paidCount,
        recentPayments,
      }
    });
  } catch (error: any) {
    logger.error("[admin/users] GET unhandled error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = isOwnerEmail(user.email);
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, planId } = body;

    if (!targetUserId || !planId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Map planId to paidCredits
    let paidCredits = 0;
    if (planId === "premium") {
      paidCredits = PRO_CREDITS_PER_MONTH; // 20
    } else if (planId === "promax") {
      paidCredits = PRO_MAX_CREDITS_PER_MONTH; // 90
    }

    const admin = getAdminClient() as any;
    const now = new Date();

    // Fetch existing credit row to avoid not-null primary key constraint failures
    const { data: existingCredit } = await admin
      .from("Credit")
      .select("id")
      .eq("userId", targetUserId)
      .maybeSingle();

    let query;
    if (existingCredit) {
      query = admin
        .from("Credit")
        .update({
          paidCredits: paidCredits,
          resetAt: now.toISOString(),
        })
        .eq("userId", targetUserId);
    } else {
      const newId = "credit-" + Math.random().toString(36).substring(2, 11);
      query = admin
        .from("Credit")
        .insert({
          id: newId,
          userId: targetUserId,
          freeUsed: 0,
          paidCredits: paidCredits,
          resetAt: now.toISOString(),
        });
    }

    const { data, error } = await query.select().single();

    if (error) {
      logger.error("[admin/users] POST update plan failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info(`[admin/users] Plan modified by admin: targetUserId=${targetUserId} to plan=${planId}`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    logger.error("[admin/users] POST unhandled error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
