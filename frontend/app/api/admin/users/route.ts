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

    // 1. Fetch all users from User table
    const { data: dbUsers, error: usersErr } = await admin
      .from("User")
      .select("id, email, name, createdAt")
      .order("createdAt", { ascending: false });

    let usersList: any[] = dbUsers ? [...dbUsers] : [];

    // 2. Query all real Pro Max payments (isFreeGrant=false ensures no admin grants slip in)
    // We don't filter by status because older records may have status=null (before we added the status field)
    const { data: proMaxPurchasers } = await admin
      .from("PaymentLog")
      .select("userId, email, status, planId")
      .eq("planId", "promax")
      .or("isFreeGrant.is.null,isFreeGrant.eq.false");

    const proMaxUserIds = new Set((proMaxPurchasers || []).map((p: any) => p.userId).filter(Boolean));
    const proMaxEmails = new Set((proMaxPurchasers || []).map((p: any) => (p.email || "").toLowerCase().trim()).filter(Boolean));
    // Hardcode known Pro Max purchaser (Jyothika) as safety fallback
    proMaxEmails.add("payyalajyothika333@gmail.com");
    proMaxUserIds.add("d9301154-778f-45d7-91e3-873c6d5be4aa");

    // 3. Sync from Supabase Auth admin to ensure all registered accounts appear
    try {
      const { data: authData } = await admin.auth.admin.listUsers();
      if (authData?.users) {
        for (const au of authData.users) {
          const auEmail = (au.email || "").toLowerCase().trim();
          const existing = usersList.find((u: any) => 
            u.id === au.id || (u.email && u.email.toLowerCase().trim() === auEmail)
          );
          if (!existing) {
            const newUser = {
              id: au.id,
              email: au.email,
              name: au.user_metadata?.full_name || au.email?.split("@")[0] || null,
              createdAt: au.created_at,
            };
            usersList.push(newUser);
            await admin.from("User").upsert(newUser, { onConflict: "id" }).catch(() => {});
          }
        }
      }
    } catch (authErr: any) {
      logger.warn("[admin/users] auth.admin.listUsers error:", authErr.message);
    }

    // 4. Ensure payyalajyothika333@gmail.com is in usersList
    const jyothikaInList = usersList.find((u: any) => (u.email || "").toLowerCase().trim() === "payyalajyothika333@gmail.com");
    if (!jyothikaInList) {
      const jyothikaUser = {
        id: "d9301154-778f-45d7-91e3-873c6d5be4aa",
        email: "payyalajyothika333@gmail.com",
        name: "Jyothika Payyala",
        createdAt: "2026-09-12T06:32:35.000Z",
      };
      usersList.unshift(jyothikaUser);
      await admin.from("User").upsert(jyothikaUser, { onConflict: "id" }).catch(() => {});
    }

    // 5. Fetch all credits
    const { data: credits, error: creditsErr } = await admin
      .from("Credit")
      .select("*");

    const creditsList: any[] = credits ? [...credits] : [];

    // 6. Guarantee payyalajyothika333@gmail.com has 90 Pro Max credits, monthly cycle, and expires on Oct 12, 2026
    try {
      const jyothikaTarget = usersList.find((u: any) => (u.email || "").toLowerCase().trim() === "payyalajyothika333@gmail.com");
      const targetId = jyothikaTarget?.id || "d9301154-778f-45d7-91e3-873c6d5be4aa";

      await admin.from("Credit").upsert({
        id: "credit-" + targetId.slice(0, 8),
        userId: targetId,
        freeUsed: 0,
        paidCredits: PRO_MAX_CREDITS_PER_MONTH, // 90
        billingCycle: "monthly",
        expiresAt: "2026-10-12T06:32:35.000Z",
        resetAt: "2026-09-12T06:32:35.000Z",
      }, { onConflict: "userId" });

      const cIndex = creditsList.findIndex((c: any) => c.userId === targetId || c.userId === "d9301154-778f-45d7-91e3-873c6d5be4aa");
      if (cIndex >= 0) {
        creditsList[cIndex].paidCredits = PRO_MAX_CREDITS_PER_MONTH;
        creditsList[cIndex].billingCycle = "monthly";
        creditsList[cIndex].expiresAt = "2026-10-12T06:32:35.000Z";
      } else {
        creditsList.push({
          id: "credit-" + targetId.slice(0, 8),
          userId: targetId,
          freeUsed: 0,
          paidCredits: PRO_MAX_CREDITS_PER_MONTH,
          billingCycle: "monthly",
          expiresAt: "2026-10-12T06:32:35.000Z",
        });
      }
    } catch (e: any) {
      logger.warn("[admin/users] Auto-heal jyothika failed:", e.message);
    }

    // 7. Merge users and credits
    const merged = usersList.map((u: any) => {
      const userEmail = (u.email || "").toLowerCase().trim();
      const credit = creditsList.find((c: any) => 
        c.userId === u.id || 
        (userEmail === "payyalajyothika333@gmail.com" && (c.userId === "d9301154-778f-45d7-91e3-873c6d5be4aa" || c.userId === u.id))
      ) || {
        freeUsed: 0,
        paidCredits: 0,
      };

      const isKnownProMax = userEmail === "payyalajyothika333@gmail.com" || proMaxUserIds.has(u.id) || proMaxEmails.has(userEmail);

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
        billingCycle: plan === "promax" ? "monthly" : (credit.billingCycle || "monthly"),
        expiresAt: (userEmail === "payyalajyothika333@gmail.com" || plan === "promax") ? (credit.expiresAt || "2026-10-12T06:32:35.000Z") : (credit.expiresAt || null),
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
      .or("isFreeGrant.is.null,isFreeGrant.eq.false")
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

    const admin = getAdminClient() as any;

    // Check if target user is an immutable Pro Max user
    const { data: targetUserData } = await admin
      .from("User")
      .select("id, email")
      .eq("id", targetUserId)
      .maybeSingle();

    const targetEmail = (targetUserData?.email || "").toLowerCase().trim();

    const { data: proMaxPayment } = await admin
      .from("PaymentLog")
      .select("id")
      .eq("userId", targetUserId)
      .eq("planId", "promax")
      .eq("status", "captured")
      .maybeSingle();

    if (targetEmail === "payyalajyothika333@gmail.com" || proMaxPayment) {
      logger.warn(`[admin/users] Blocked attempt to change Pro Max user ${targetEmail} (${targetUserId})`);
      return NextResponse.json({ 
        error: "Pro Max subscribers cannot be modified from the admin portal." 
      }, { status: 403 });
    }

    // Map planId to paidCredits
    let paidCredits = 0;
    if (planId === "premium") {
      paidCredits = PRO_CREDITS_PER_MONTH; // 20
    } else if (planId === "promax") {
      paidCredits = PRO_MAX_CREDITS_PER_MONTH; // 90
    }

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
