import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { generateUUID } from "@/lib/utils";

// Helper to resolve active user record ID in public.User by authenticated email, creating it if missing
async function getActiveUserId(user: any): Promise<string> {
  let activeUserId = user.id;
  if (user.email) {
    try {
      const admin = getAdminClient() as any;
      const { data: existingUser } = await admin
        .from("User")
        .select("id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        activeUserId = existingUser.id;
        logger.info(`[api/resumes] Resolved user email ${user.email} to DB ID ${activeUserId}`);
      } else {
        logger.info(`[api/resumes] User record missing for ${user.email}. Creating it now with ID ${user.id}`);
        const { error: insertUserErr } = await admin
          .from("User")
          .insert({
            id: user.id,
            email: user.email.toLowerCase().trim(),
            name: user.user_metadata?.full_name || null,
            createdAt: new Date().toISOString(),
          });
        if (insertUserErr) {
          logger.error("[api/resumes] Failed to insert missing User record:", insertUserErr.message);
        }
      }
    } catch (e: any) {
      logger.error(`[api/resumes] User resolution/creation query crashed: ${e.message}`);
    }
  }
  return activeUserId;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeUserId = await getActiveUserId(user);
    const admin = getAdminClient() as any;

    const { data, error } = await admin
      .from("Resume")
      .select("*")
      .eq("userId", activeUserId)
      .neq("jobTitle", "SUPPORT_TICKET")
      .order("createdAt", { ascending: false });

    if (error) {
      logger.error("[api/resumes] GET fetch failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to only include builder/manual resumes (empty jobDescription)
    const builderResumes = (data || []).filter((r: any) => !r.jobDescription || r.jobDescription.trim() === "");
    return NextResponse.json(builderResumes);
  } catch (error: any) {
    logger.error("[api/resumes] GET unhandled error:", error.message);
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

    const body = await request.json();
    const activeUserId = await getActiveUserId(user);

    const admin = getAdminClient() as any;
    const { data, error } = await admin
      .from("Resume")
      .insert({
        id: body.id || generateUUID(),
        userId: activeUserId,
        originalText: body.originalText || "",
        optimizedText: body.optimizedText || "",
        jobDescription: body.jobDescription || "",
        jobTitle: body.jobTitle || "Untitled Resume",
        company: body.company || "General Application",
        scoreBefore: body.scoreBefore ?? 45,
        scoreAfter: body.scoreAfter ?? 45,
        keywordsBefore: body.keywordsBefore ?? 0,
        keywordsAfter: body.keywordsAfter ?? 0,
        impactBefore: body.impactBefore ?? 0,
        impactAfter: body.impactAfter ?? 0,
        keywordsAdded: body.keywordsAdded || [],
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error("[api/resumes] POST insert failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("[api/resumes] POST unhandled error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Missing resume ID" }, { status: 400 });
    }

    const activeUserId = await getActiveUserId(user);
    const admin = getAdminClient() as any;

    // Check ownership
    const { data: existingResume, error: checkError } = await admin
      .from("Resume")
      .select("userId")
      .eq("id", body.id)
      .maybeSingle();

    if (checkError) {
      logger.error("[api/resumes] PUT ownership check failed:", checkError.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!existingResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (existingResume.userId !== activeUserId) {
      logger.warn(`User ${user.email} attempted to modify unauthorized resume ${body.id}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Perform update
    const updateData: any = {};
    if (body.optimizedText !== undefined) updateData.optimizedText = body.optimizedText;
    if (body.originalText !== undefined) updateData.originalText = body.originalText;
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle;
    if (body.company !== undefined) updateData.company = body.company;
    if (body.jobDescription !== undefined) updateData.jobDescription = body.jobDescription;
    if (body.scoreBefore !== undefined) updateData.scoreBefore = body.scoreBefore;
    if (body.scoreAfter !== undefined) updateData.scoreAfter = body.scoreAfter;
    if (body.keywordsBefore !== undefined) updateData.keywordsBefore = body.keywordsBefore;
    if (body.keywordsAfter !== undefined) updateData.keywordsAfter = body.keywordsAfter;
    if (body.impactBefore !== undefined) updateData.impactBefore = body.impactBefore;
    if (body.impactAfter !== undefined) updateData.impactAfter = body.impactAfter;
    if (body.keywordsAdded !== undefined) updateData.keywordsAdded = body.keywordsAdded;

    const { data, error } = await admin
      .from("Resume")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      logger.error("[api/resumes] PUT update failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("[api/resumes] PUT unhandled error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing resume ID" }, { status: 400 });
    }

    const activeUserId = await getActiveUserId(user);
    const admin = getAdminClient() as any;

    // Check ownership
    const { data: existingResume, error: checkError } = await admin
      .from("Resume")
      .select("userId")
      .eq("id", id)
      .maybeSingle();

    if (checkError) {
      logger.error("[api/resumes] DELETE ownership check failed:", checkError.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!existingResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (existingResume.userId !== activeUserId) {
      logger.warn(`User ${user.email} attempted to delete unauthorized resume ${id}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Perform delete
    const { error } = await admin
      .from("Resume")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("[api/resumes] DELETE query failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("[api/resumes] DELETE unhandled error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
