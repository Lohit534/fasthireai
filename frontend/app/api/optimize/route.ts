import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { scoreResume } from "@/lib/ats/scorer";
import { buildOptimizationPrompt } from "@/lib/ai/prompts";
import { callAI } from "@/lib/ai/router";
import { MIN_RESUME_CHARS, MIN_JD_CHARS, FREE_CREDITS_PER_MONTH, OWNER_EMAIL } from "@/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to access /api/optimize");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Request Body
    const body = await request.json();
    const { resumeText, jobDescription, instructions, lengthOption, jobTitle, company } = body;

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

    // 4. Ensure DB User and Credits exist
    let userRecord = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { credit: true }
    });

    if (!userRecord) {
      userRecord = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || null,
          credit: {
            create: {
              freeUsed: 0,
              paidCredits: 0,
              resetAt: new Date()
            }
          }
        },
        include: { credit: true }
      });
    } else if (!userRecord.credit) {
      await prisma.credit.create({
        data: {
          userId: userRecord.id,
          freeUsed: 0,
          paidCredits: 0,
          resetAt: new Date()
        }
      });
      userRecord = await prisma.user.findUnique({
        where: { id: userRecord.id },
        include: { credit: true }
      }) as any;
    }

    // 5. Check Monthly Credit Reset
    const now = new Date();
    const credit = userRecord!.credit!;
    const resetAt = new Date(credit.resetAt);
    
    let freeUsed = credit.freeUsed;
    let paidCredits = credit.paidCredits;

    const isNewMonth = 
      now.getMonth() !== resetAt.getMonth() || 
      now.getFullYear() !== resetAt.getFullYear();

    if (isNewMonth) {
      freeUsed = 0;
      await prisma.credit.update({
        where: { userId: userRecord!.id },
        data: {
          freeUsed: 0,
          resetAt: now
        }
      });
    }

    // 6. Enforce Credit Limits — skipped for owner who gets unlimited access
    const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    if (!isOwner) {
      const freeRemaining = Math.max(0, FREE_CREDITS_PER_MONTH - freeUsed);
      if (freeRemaining <= 0 && paidCredits <= 0) {
        return NextResponse.json(
          { error: "Free limit reached. Upgrade to continue." },
          { status: 403 }
        );
      }
    }

    logger.info(`Deducting credits for user: ${user.email} (Free used: ${freeUsed}, Paid: ${paidCredits}, Owner: ${isOwner})`);

    // 7. Core Optimization Flow
    // Phase A: Pre-score
    const scoreBefore = await scoreResume(resumeText, jobDescription);

    // Phase B: AI Rewrite
    const prompt = buildOptimizationPrompt(
      resumeText,
      jobDescription,
      scoreBefore.missingKeywords,
      scoreBefore.extractedSkills,
      instructions || "",
      lengthOption || "Auto-detect"
    );
    const aiResult = await callAI(prompt, resumeText);

    // Phase C: Post-score
    const scoreAfter = await scoreResume(aiResult.resume, jobDescription);

    // 8. Deduct Credit (owner gets unlimited — no deduction)
    if (!isOwner) {
      const freeRemaining = Math.max(0, FREE_CREDITS_PER_MONTH - freeUsed);
      if (freeRemaining > 0) {
        await prisma.credit.update({
          where: { userId: userRecord!.id },
          data: { freeUsed: { increment: 1 } }
        });
      } else {
        await prisma.credit.update({
          where: { userId: userRecord!.id },
          data: { paidCredits: { decrement: 1 } }
        });
      }
    }

    // 9. Save Optimization Log to Prisma DB
    const resumeRecord = await prisma.resume.create({
      data: {
        userId: userRecord!.id,
        originalText: resumeText,
        jobDescription: jobDescription,
        jobTitle: jobTitle || null,
        company: company || null,
        scoreBefore: scoreBefore.overall,
        scoreAfter: scoreAfter.overall,
        keywordsBefore: scoreBefore.foundKeywords.length,
        keywordsAfter: scoreAfter.foundKeywords.length,
        impactBefore: scoreBefore.impactBullets,
        impactAfter: scoreAfter.impactBullets,
        optimizedText: aiResult.resume,
        keywordsAdded: aiResult.keywordsAdded,
      }
    });

    // 10. Return OptimizeResult
    return NextResponse.json({
      resumeId: resumeRecord.id,
      scoreBefore: scoreBefore.overall,
      scoreAfter: scoreAfter.overall,
      optimizedText: aiResult.resume,
      keywordsAdded: aiResult.keywordsAdded,
      changesCount: aiResult.changesCount,
      summary: aiResult.summary,
    });
  } catch (error: any) {
    logger.error("Failed to execute resume optimization API flow:", error);
    return NextResponse.json(
      { error: "Internal server error during resume optimization." },
      { status: 500 }
    );
  }
}
