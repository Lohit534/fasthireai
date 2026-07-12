import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreResume } from "@/lib/ats/scorer";
import { MIN_RESUME_CHARS, MIN_JD_CHARS } from "@/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to access /api/score");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Request Body
    const body = await request.json();
    const { resumeText, jobDescription, scoreBefore } = body;

    // 3. Input Validation
    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < MIN_RESUME_CHARS) {
      return NextResponse.json(
        { error: `Resume text must be at least ${MIN_RESUME_CHARS} characters.` },
        { status: 400 }
      );
    }

    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < MIN_JD_CHARS) {
      return NextResponse.json(
        { error: `Job description must be at least ${MIN_JD_CHARS} characters.` },
        { status: 400 }
      );
    }

    logger.info(`Auth verified for User ${user.email}. Scoring resume...`);

    // 4. Scoring (Always free, no Prisma write or credit deductions)
    const scoreResult = await scoreResume(resumeText, jobDescription, scoreBefore);

    return NextResponse.json(scoreResult);
  } catch (error: any) {
    logger.error("Failed to process resume score request:", error);
    return NextResponse.json(
      { error: "Internal server error during scoring computation." },
      { status: 500 }
    );
  }
}
