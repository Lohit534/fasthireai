import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * GET  /api/data-preferences
 *   → returns { dataTrainingEnabled: boolean } for the authenticated user
 *
 * POST /api/data-preferences
 *   body: { dataTrainingEnabled: boolean }
 *   → upserts the preference for the authenticated user and returns 200 OK
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();
    const { data: row } = await (admin as any)
      .from("DataPreferences")
      .select("dataTrainingEnabled")
      .eq("userId", user.id)
      .maybeSingle();

    // Default: opted-in (true) if no row exists yet
    const dataTrainingEnabled = row ? row.dataTrainingEnabled : true;
    return NextResponse.json({ dataTrainingEnabled }, { status: 200 });
  } catch (err: any) {
    logger.error("[data-preferences GET]", err?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (typeof body.dataTrainingEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid payload: dataTrainingEnabled must be boolean" }, { status: 400 });
    }

    const admin = getAdminClient();
    const now = new Date().toISOString();

    // Upsert — uses userId as the unique key
    await (admin as any)
      .from("DataPreferences")
      .upsert(
        {
          userId: user.id,
          dataTrainingEnabled: body.dataTrainingEnabled,
          updatedAt: now,
        },
        { onConflict: "userId" }
      );

    logger.info(`[data-preferences POST] userId=${user.id} dataTrainingEnabled=${body.dataTrainingEnabled}`);
    return NextResponse.json({ success: true, dataTrainingEnabled: body.dataTrainingEnabled }, { status: 200 });
  } catch (err: any) {
    logger.error("[data-preferences POST]", err?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
