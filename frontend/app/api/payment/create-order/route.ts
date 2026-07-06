/**
 * POST /api/payment/create-order
 *
 * Creates a Razorpay order for the selected plan and billing cycle.
 * Returns the order ID for use by the frontend Razorpay checkout.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// Plan amount mapping in paise (INR × 100)
const PLAN_AMOUNTS: Record<string, Record<string, number>> = {
  premium: {
    monthly: 9900,   // ₹99
    yearly:  99900,  // ₹999 (2 months free)
  },
  promax: {
    monthly: 19900,  // ₹199
    yearly:  199900, // ₹1999
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    logger.info("[payment/create-order] Auth check:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message || authError
    });

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", debug: authError?.message }, { status: 401 });
    }

    const body = await request.json();
    const { planId, billingCycle } = body;

    if (!planId || !billingCycle) {
      return NextResponse.json({ error: "planId and billingCycle are required." }, { status: 400 });
    }

    const amount = PLAN_AMOUNTS[planId]?.[billingCycle];
    if (!amount) {
      return NextResponse.json({ error: "Invalid plan or billing cycle." }, { status: 400 });
    }

    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      logger.error("[payment/create-order] Razorpay keys not configured.");
      return NextResponse.json({ error: "Payment gateway not configured." }, { status: 500 });
    }

    // Call Razorpay REST API directly (avoids razorpay Node SDK issues on Vercel Edge)
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const receipt = `fh_${user.id.slice(0, 8)}_${Date.now()}`;

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: {
          userId: user.id,
          email: user.email,
          planId,
          billingCycle,
        },
      }),
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.json().catch(() => ({}));
      logger.error("[payment/create-order] Razorpay order creation failed:", err);
      return NextResponse.json({ error: "Failed to create payment order." }, { status: 500 });
    }

    const order = await rzpRes.json();
    logger.info(`[payment/create-order] Order created: ${order.id} for ${user.email}, plan=${planId}`);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    logger.error("[payment/create-order] Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
