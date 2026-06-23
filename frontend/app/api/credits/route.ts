/**
 * /api/credits
 *
 * GET: Returns the current user's credit balance.
 * POST: Upgrades or downgrades the user's plan and sets corresponding database credits.
 * Uses Supabase JS client (HTTPS/REST) — NO direct Postgres connection.
 * This works on Vercel without any Supabase IPv4 add-on.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { FREE_CREDITS_PER_MONTH, isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify auth session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Owner always gets unlimited — no DB lookup needed
    const isOwner = isOwnerEmail(user.email);
    if (isOwner) {
      return NextResponse.json({
        freeUsed: 0,
        paidCredits: 999999,
        freeRemaining: 999999,
        resetAt: new Date().toISOString(),
        isOwner: true,
      });
    }

    const admin = getAdminClient() as any;
    const now = new Date();

    // Resolve user record ID in public.User to prevent email unique constraint violations or foreign key errors
    let activeUserId = user.id;
    try {
      if (user.email) {
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();

        if (existingUser) {
          activeUserId = existingUser.id;
          logger.info(`[credits] Found existing User record for email ${user.email} with ID ${existingUser.id}. Reusing this ID.`);
        } else {
          // If the user doesn't exist, we insert a new record
          logger.info(`[credits] Creating new User record for email ${user.email} with ID ${user.id}`);
          const { error: insertUserErr } = await admin
            .from("User")
            .insert({
              id: user.id,
              email: user.email.toLowerCase().trim(),
              name: user.user_metadata?.full_name || null,
              createdAt: now.toISOString(),
            });
          if (insertUserErr) {
            logger.error("[credits] Failed to insert new User record:", insertUserErr.message);
          }
        }
      }
    } catch (e: any) {
      logger.error("[credits] Error during User resolution/insertion:", e.message);
    }

    // 3. Fetch or create Credit row
    let { data: creditRow, error: creditFetchErr } = await admin
      .from("Credit")
      .select("*")
      .eq("userId", activeUserId)
      .maybeSingle();

    if (creditFetchErr) {
      logger.error("[credits] Credit fetch error:", creditFetchErr.message);
    }

    if (!creditRow) {
      // Create initial credit row
      const { data: newCredit, error: createErr } = await admin
        .from("Credit")
        .insert({
          userId: activeUserId,
          freeUsed: 0,
          paidCredits: 0,
          resetAt: now.toISOString(),
        })
        .select()
        .single();

      if (createErr) {
        logger.error("[credits] Credit create error:", createErr.message);
        // Return safe default on DB error
        return NextResponse.json({
          freeUsed: 0,
          paidCredits: 0,
          freeRemaining: FREE_CREDITS_PER_MONTH,
          resetAt: now.toISOString(),
          isOwner: false,
        });
      }
      creditRow = newCredit;
    }

    // 4. Monthly reset check
    const resetAt = new Date(creditRow.resetAt);
    let freeUsed = creditRow.freeUsed;
    const paidCredits = creditRow.paidCredits;

    const isNewMonth =
      now.getMonth() !== resetAt.getMonth() ||
      now.getFullYear() !== resetAt.getFullYear();

    if (isNewMonth) {
      freeUsed = 0;
      await admin
        .from("Credit")
        .update({ freeUsed: 0, resetAt: now.toISOString() })
        .eq("userId", activeUserId);
    }

    return NextResponse.json({
      freeUsed,
      paidCredits,
      freeRemaining: Math.max(0, FREE_CREDITS_PER_MONTH - freeUsed),
      resetAt: isNewMonth ? now.toISOString() : creditRow.resetAt,
      isOwner: false,
    });
  } catch (error: any) {
    logger.error("[credits] GET Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during credit evaluation." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify auth session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();
    const isOwner = isOwnerEmail(user.email);

    // Owner is always unlimited - no credits update needed
    if (isOwner) {
      return NextResponse.json({ success: true, message: "Bypassed for owner" });
    }

    const admin = getAdminClient() as any;
    const now = new Date();

    // Map planId to paidCredits
    let paidCredits = 0;
    if (planId === "premium") {
      paidCredits = 15;
    } else if (planId === "team" || planId === "promax") {
      paidCredits = 999999;
    }

    // Upsert or update the credit row
    const { data, error } = await admin
      .from("Credit")
      .upsert(
        {
          userId: user.id,
          freeUsed: 0,
          paidCredits: paidCredits,
          resetAt: now.toISOString(),
        },
        { onConflict: "userId" }
      )
      .select()
      .single();

    if (error) {
      logger.error("[credits] POST update error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info(`[credits] Plan updated successfully for user ${user.email} -> ${planId} (${paidCredits} credits)`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    logger.error("[credits] POST unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during plan upgrade." },
      { status: 500 }
    );
  }
}

