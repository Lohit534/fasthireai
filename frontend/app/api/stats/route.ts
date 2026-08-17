import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/stats
 * Public endpoint — returns live stats for the landing page.
 * Uses service-role key to count rows; no personal data is exposed.
 */
export async function GET() {
  try {
    const admin = getAdminClient() as any;

    // Count total registered users
    const { count: userCount, error: userErr } = await admin
      .from("User")
      .select("id", { count: "exact", head: true });

    if (userErr) {
      console.error("[api/stats] user count error:", userErr.message);
    }

    // Count total optimizations done (exclude support tickets)
    const { count: optimizationCount, error: optErr } = await admin
      .from("Resume")
      .select("id", { count: "exact", head: true })
      .neq("jobTitle", "SUPPORT_TICKET");

    if (optErr) {
      console.error("[api/stats] optimization count error:", optErr.message);
    }

    return NextResponse.json(
      {
        users: userCount ?? 0,
        optimizations: optimizationCount ?? 0,
      },
      {
        status: 200,
        headers: {
          // Cache for 5 minutes to avoid hammering DB on every page load
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    console.error("[api/stats] unhandled error:", err.message);
    // Return safe fallback — page never breaks
    return NextResponse.json({ users: 0, optimizations: 0 }, { status: 200 });
  }
}
