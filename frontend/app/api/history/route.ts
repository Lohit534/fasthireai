/**
 * GET /api/history
 *
 * Fetches the resume optimization history for the authenticated user.
 * Plan-gated:
 *   - Free       → no history (locked, shows upgrade prompt)
 *   - Premium Pro → last 20 optimizations within 2 months
 *   - Pro Max    → unlimited within 4 months
 *   - Owner      → unlimited, no date restriction
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isOwnerEmail } from "@/types";

// Titles used for system/internal records — never show in user history
const SYSTEM_TITLES = ["SUPPORT_TICKET", "USER_FEEDBACK"];

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Fallback: If server cookie auth returned no user, check Authorization Bearer token header
    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
            authError = null;
          }
        } catch (_e) {}
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient() as any;

    // Resolve User table ID by email
    let activeUserId = user.id;
    try {
      if (user.email) {
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();
        if (existingUser?.id) {
          activeUserId = existingUser.id;
        }
      }
    } catch (_e) {}

    // ── Determine plan tier ────────────────────────────────────────────────────
    let planTier = "free";
    const userEmail = (user.email || "").toLowerCase().trim();
    try {
      if (isOwnerEmail(user.email)) {
        planTier = "owner";
      } else {
        const { data: creditRow } = await admin
          .from("Credit")
          .select("paidCredits, planId, billingCycle")
          .or(`userId.eq.${activeUserId},userId.eq.${user.id}`)
          .maybeSingle();

        const isKnownProMax = userEmail === "payyalajyothika333@gmail.com";

        if (
          isKnownProMax ||
          creditRow?.planId === "promax" ||
          creditRow?.billingCycle === "admin_promax" ||
          (creditRow?.paidCredits >= 90 && creditRow?.paidCredits < 900000)
        ) {
          planTier = "promax";
        } else if (
          creditRow?.planId === "premium" ||
          creditRow?.billingCycle === "admin_premium" ||
          (creditRow?.paidCredits && creditRow.paidCredits > 0)
        ) {
          planTier = "premium";
        }
      }
    } catch (_e) {}

    // ── Free users: no history access ─────────────────────────────────────────
    if (planTier === "free") {
      return NextResponse.json({
        records: [],
        planTier: "free",
        locked: true,
      });
    }

    // ── Set retention window based on plan ────────────────────────────────────
    // premium: 2 months, promax/owner: 4 months
    const retentionMonths = (planTier === "premium") ? 2 : 4;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
    // Owner: no cutoff restriction
    const isOwner = planTier === "owner";

    // All IDs/identifiers this user's records could be stored under
    const userIds = Array.from(
      new Set(
        [
          activeUserId,
          user.id,
          user.email,
          user.email ? user.email.toLowerCase().trim() : null,
        ].filter(Boolean)
      )
    );

    // 1. Fetch from Supabase DB across all potential user IDs using .in() query & fallback loop
    let dbData: any[] = [];
    let inQuerySucceeded = false;
    try {
      const { data, error } = await admin
        .from("Resume")
        .select("*")
        .in("userId", userIds);

      if (!error && Array.isArray(data)) {
        dbData = data;
        inQuerySucceeded = data.length > 0;
      } else {
        if (error) logger.warn(`[history] DB .in query warning:`, error.message);
      }
    } catch (_e) {}

    // Only run fallback loop if .in() returned nothing (prevents duplicates)
    if (!inQuerySucceeded) {
      for (const uid of userIds) {
        try {
          const { data: singleData } = await admin
            .from("Resume")
            .select("*")
            .eq("userId", uid);
          if (Array.isArray(singleData)) {
            for (const r of singleData) {
              if (!dbData.some((d) => d.id === r.id)) {
                dbData.push(r);
              }
            }
          }
        } catch (_e) {}
      }
    }

    // JS-side filter: exclude system records AND apply retention window
    dbData = dbData.filter((r: any) => {
      if (r.jobTitle && SYSTEM_TITLES.includes(r.jobTitle)) return false;
      // Retention: only show records within the allowed date window (owners skip this)
      if (!isOwner && r.createdAt && new Date(r.createdAt) < cutoffDate) return false;
      return true;
    });

    const combined = [...dbData];

    // 4. Sort by createdAt descending (newest first)
    combined.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    // 5. Apply record limit for Premium Pro (last 20), unlimited for Pro Max/Owner
    const limited = (planTier === "premium") ? combined.slice(0, 20) : combined;

    logger.info(
      `[history] Returning ${limited.length} records for ${user.email} (plan: ${planTier}, retention: ${isOwner ? "unlimited" : retentionMonths + "mo"})`
    );

    return NextResponse.json({
      records: limited,
      planTier,
      locked: false,
      totalAvailable: combined.length,
      retentionMonths: isOwner ? null : retentionMonths,
    });
  } catch (error: any) {
    logger.error("[history] GET Unhandled error:", error?.message);
    return NextResponse.json({ records: [], planTier: "free", locked: true });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
            authError = null;
          }
        } catch (_e) {}
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resumeId, scoreAfter, optimizedText } = body;

    if (!resumeId) {
      return NextResponse.json(
        { error: "resumeId is required." },
        { status: 400 }
      );
    }

    const admin = getAdminClient() as any;

    const updatePayload: any = {};
    if (scoreAfter !== undefined) updatePayload.scoreAfter = Math.round(scoreAfter);
    if (optimizedText !== undefined) updatePayload.optimizedText = optimizedText;

    const { error: updateErr } = await admin
      .from("Resume")
      .update(updatePayload)
      .eq("id", resumeId);

    if (updateErr) {
      logger.warn("[history PATCH] DB update failed:", updateErr.message);
    }



    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[history PATCH] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during score update." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const { data: tokenData } = await supabase.auth.getUser(token);
          if (tokenData?.user) {
            user = tokenData.user;
            authError = null;
          }
        } catch (_e) {}
      }
    }

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query param is required." }, { status: 400 });
    }

    const admin = getAdminClient() as any;

    let activeUserId = user.id;
    try {
      if (user.email) {
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();
        if (existingUser?.id) activeUserId = existingUser.id;
      }
    } catch (_e) {}

    const uids = Array.from(
      new Set([activeUserId, user.id, user.email, user.email?.toLowerCase().trim()].filter(Boolean))
    );

    for (const uid of uids) {
      try {
        await admin.from("Resume").delete().eq("id", id).eq("userId", uid);
      } catch (_e) {}
    }



    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[history DELETE] Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during delete." },
      { status: 500 }
    );
  }
}
