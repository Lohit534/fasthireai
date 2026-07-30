import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCoverLetterPrompt } from "@/lib/ai/prompts";
import { callAIText } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { resumeText, jobDescription, jobTitle, company } = body;

    if (!resumeText || typeof resumeText !== "string" || !resumeText.trim()) {
      return NextResponse.json(
        { error: "Resume text is required to generate a personalized cover letter." },
        { status: 400 }
      );
    }

    if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
      return NextResponse.json(
        { error: "Job description is required to generate a personalized cover letter." },
        { status: 400 }
      );
    }

    const prompt = buildCoverLetterPrompt(
      resumeText,
      jobDescription,
      jobTitle || "target position",
      company || "company"
    );

    const coverLetter = await callAIText(prompt);

    return NextResponse.json({ coverLetter });
  } catch (error: any) {
    logger.error("[cover-letter] API Route error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to generate personalized cover letter." },
      { status: 500 }
    );
  }
}
