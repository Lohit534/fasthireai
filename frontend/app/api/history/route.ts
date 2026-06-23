/**
 * GET /api/history
 *
 * Fetches the resume optimization history for the authenticated user.
 * Uses the Supabase admin client to bypass client RLS issues.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient() as any;
    const { data, error } = await admin
      .from("Resume")
      .select("*")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      logger.error("[history] Database select failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    logger.error("[history] GET Unhandled error:", error?.message);
    return NextResponse.json(
      { error: "Internal server error during history fetch." },
      { status: 500 }
    );
  }
}
