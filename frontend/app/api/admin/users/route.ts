import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isOwnerEmail } from "@/types";

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

    // Merge users and credits
    const merged = users.map((u: any) => {
      const credit = credits.find((c: any) => c.userId === u.id) || {
        freeUsed: 0,
        paidCredits: 0,
      };

      // Determine plan tier
      let plan = "free";
      if (isOwnerEmail(u.email)) {
        plan = "owner";
      } else if (credit.paidCredits === 15) {
        plan = "premium";
      } else if (credit.paidCredits > 100) {
        plan = "promax";
      }

      return {
        ...u,
        plan,
        freeUsed: credit.freeUsed,
        paidCredits: credit.paidCredits,
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

    return NextResponse.json({
      users: merged,
      analytics: {
        totalOptimizations: totalOptimizations || 0,
        totalTickets: totalTickets || 0,
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
      paidCredits = 15;
    } else if (planId === "promax") {
      paidCredits = 999999;
    }

    const admin = getAdminClient() as any;
    const now = new Date();

    const { data, error } = await admin
      .from("Credit")
      .upsert(
        {
          userId: targetUserId,
          freeUsed: 0,
          paidCredits: paidCredits,
          resetAt: now.toISOString(),
        },
        { onConflict: "userId" }
      )
      .select()
      .single();

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
