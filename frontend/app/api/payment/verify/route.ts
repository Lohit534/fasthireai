/**
 * POST /api/payment/verify
 *
 * Verifies Razorpay payment signature using HMAC SHA256.
 * On success, upgrades the user's plan in the database directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Plan → paidCredits mapping
const PLAN_CREDITS: Record<string, number> = {
  premium: 15,
  promax:  999999,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
      return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Payment gateway not configured." }, { status: 500 });
    }

    // ── 1. Verify HMAC SHA256 signature ───────────────────────────────────────
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      logger.warn(`[payment/verify] Signature mismatch for user ${user.email}! Possible tampering.`);
      return NextResponse.json({ error: "Payment verification failed. Signature mismatch." }, { status: 400 });
    }

    logger.info(`[payment/verify] Payment verified ✓ user=${user.email} plan=${planId} paymentId=${razorpay_payment_id}`);

    // ── 2. Resolve public.User ID (may differ from auth UID) ──────────────────
    const admin = getAdminClient() as any;
    let activeUserId = user.id;
    if (user.email) {
      const { data: existingUser } = await admin
        .from("User")
        .select("id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (existingUser) {
        activeUserId = existingUser.id;
      } else {
        await admin.from("User").insert({
          id: user.id,
          email: user.email.toLowerCase().trim(),
          name: user.user_metadata?.full_name || null,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // ── 3. Upsert credits directly ─────────────────────────────────────────────
    const paidCredits = PLAN_CREDITS[planId] ?? 0;
    const { error: creditErr } = await admin
      .from("Credit")
      .upsert(
        {
          userId: activeUserId,
          freeUsed: 0,
          paidCredits,
          resetAt: new Date().toISOString(),
        },
        { onConflict: "userId" }
      );

    if (creditErr) {
      logger.error("[payment/verify] Credits upsert failed:", creditErr.message);
      return NextResponse.json({ error: "Payment verified but plan upgrade failed. Contact support." }, { status: 500 });
    }

    logger.info(`[payment/verify] Credits upgraded: userId=${activeUserId} plan=${planId} credits=${paidCredits}`);

    return NextResponse.json({
      success: true,
      planId,
      billingCycle: billingCycle || "monthly",
      paymentId: razorpay_payment_id,
      paidCredits,
    });
  } catch (error: any) {
    logger.error("[payment/verify] Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
