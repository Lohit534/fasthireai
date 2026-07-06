/**
 * POST /api/payment/verify
 *
 * Verifies Razorpay payment signature using HMAC SHA256.
 * On success, upgrades the user's plan in the database.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import crypto from "crypto";

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

    // ── Verify signature ───────────────────────────────────────────────────────
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      logger.warn(`[payment/verify] Signature mismatch for user ${user.email}! Possible tampering.`);
      return NextResponse.json({ error: "Payment verification failed. Signature mismatch." }, { status: 400 });
    }

    logger.info(`[payment/verify] Payment verified for ${user.email}, plan=${planId}, orderId=${razorpay_order_id}`);

    // ── Upgrade plan in database ───────────────────────────────────────────────
    const upgradeRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": request.headers.get("cookie") || "" },
      body: JSON.stringify({ planId }),
    });

    if (!upgradeRes.ok) {
      const errData = await upgradeRes.json().catch(() => ({}));
      logger.error("[payment/verify] Credits update failed:", errData);
      return NextResponse.json({ error: "Payment verified but plan upgrade failed. Contact support." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      planId,
      billingCycle: billingCycle || "monthly",
      paymentId: razorpay_payment_id,
    });
  } catch (error: any) {
    logger.error("[payment/verify] Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
