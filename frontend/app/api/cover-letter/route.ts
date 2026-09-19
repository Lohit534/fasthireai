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

    const { getAdminClient } = await import("@/lib/supabase/admin");
    const { isOwnerEmail, FREE_CREDITS_PER_MONTH, PRO_CREDITS_PER_MONTH } = await import("@/types");
    const admin = getAdminClient();
    const isOwner = isOwnerEmail(user.email);
    let isUnlimited = isOwner;
    let activeUserId = user.id;

    if (!isOwner) {
      const { data: earlyUsers } = await admin.from("User").select("id").order("createdAt", { ascending: true }).limit(50);
      const earlyUserIds = (earlyUsers || []).map((u: any) => u.id);
      const isFirst50 = earlyUserIds.includes(activeUserId);

      const { data: creditRow } = await admin.from("Credit").select("*").eq("userId", activeUserId).maybeSingle();
      
      const freeUsed = creditRow ? (creditRow.freeUsed || 0) : 0;
      const paidCredits = creditRow ? (creditRow.paidCredits || 0) : 0;
      const coverLettersGenerated = creditRow ? (creditRow.coverLettersGenerated || 0) : 0;

      isUnlimited = isFirst50 || paidCredits >= 900000;

      if (!isUnlimited) {
        const isProPlan = paidCredits > 0;
        const allowedLimit = isProPlan ? PRO_CREDITS_PER_MONTH : 1; // 1 cover letter for free tier

        if (coverLettersGenerated >= allowedLimit) {
          if (isProPlan) {
            return NextResponse.json(
              { error: `Monthly limit of ${PRO_CREDITS_PER_MONTH} cover letters reached for Pro plan. Please upgrade to Pro Max for unlimited access.` },
              { status: 403 }
            );
          } else {
            return NextResponse.json(
              { error: `Free plan is limited to 1 cover letter. Please upgrade to Premium Pro or Pro Max to unlock unlimited cover letters.` },
              { status: 403 }
            );
          }
        }
      }

      // Deduct/increment cover letter count
      if (!isUnlimited) {
        await admin.from("Credit").update({ coverLettersGenerated: coverLettersGenerated + 1 }).eq("userId", activeUserId);
      }
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
