/**
 * POST /api/optimize
 *
 * Core resume optimization pipeline.
 * Uses Supabase JS client (HTTPS/REST) for all DB operations — NO direct Postgres.
 * Works on Vercel without any Supabase IPv4 add-on.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";
import { scoreResume } from "@/lib/ats/scorer";
import { buildOptimizationPrompt } from "@/lib/ai/prompts";
import { callAI } from "@/lib/ai/router";
import { MIN_RESUME_CHARS, MIN_JD_CHARS, FREE_CREDITS_PER_MONTH, isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";
import { generateUUID } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify auth session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("[optimize] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate body
    const body = await request.json();
    const { resumeText, jobDescription, instructions, lengthOption, jobTitle, company } = body;

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

    const isOwner = isOwnerEmail(user.email);
    const admin = getAdminClient() as any;
    const now = new Date();

    // Resolve user record ID in public.User to prevent email unique constraint violations or foreign key errors
    let activeUserId = user.id;
    try {
      if (user.email) {
        const { data: existingUser } = await admin
          .from("User")
          .select("id")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();

        if (existingUser) {
          activeUserId = existingUser.id;
          logger.info(`[optimize] Found existing User record for email ${user.email} with ID ${existingUser.id}. Reusing this ID.`);
        } else {
          // If the user doesn't exist, we insert a new record
          logger.info(`[optimize] Creating new User record for email ${user.email} with ID ${user.id}`);
          const { error: insertUserErr } = await admin
            .from("User")
            .insert({
              id: user.id,
              email: user.email.toLowerCase().trim(),
              name: user.user_metadata?.full_name || null,
              createdAt: now.toISOString(),
            });
          if (insertUserErr) {
            logger.error("[optimize] Failed to insert new User record:", insertUserErr.message);
          }
        }
      }
    } catch (e: any) {
      logger.error("[optimize] Error during User resolution/insertion:", e.message);
    }

    let freeUsed = 0;
    let paidCredits = 0;
    let creditId: string | null = null;

    if (!isOwner) {
      // 4. Fetch or create Credit row
      let { data: creditRow } = await admin
        .from("Credit")
        .select("*")
        .eq("userId", activeUserId)
        .maybeSingle();

      if (!creditRow) {
        const { data: newCredit } = await admin
          .from("Credit")
          .insert({
            userId: activeUserId,
            freeUsed: 0,
            paidCredits: 0,
            resetAt: now.toISOString(),
          })
          .select()
          .single();
        creditRow = newCredit;
      }

      if (creditRow) {
        creditId = creditRow.id;
        const resetAt = new Date(creditRow.resetAt);
        const isNewMonth =
          now.getMonth() !== resetAt.getMonth() ||
          now.getFullYear() !== resetAt.getFullYear();

        freeUsed = isNewMonth ? 0 : creditRow.freeUsed;
        paidCredits = creditRow.paidCredits;

        if (isNewMonth) {
          await admin
            .from("Credit")
            .update({ freeUsed: 0, resetAt: now.toISOString() })
            .eq("userId", activeUserId);
        }

        // 5. Enforce credit limits (non-owner only)
        const freeRemaining = Math.max(0, FREE_CREDITS_PER_MONTH - freeUsed);
        if (freeRemaining <= 0 && paidCredits <= 0) {
          return NextResponse.json(
            { error: "Free limit reached. Upgrade to continue." },
            { status: 403 }
          );
        }
      }
    }

    logger.info(`[optimize] User: ${user.email} | activeUserId=${activeUserId} | freeUsed=${freeUsed} | paid=${paidCredits} | owner=${isOwner}`);

    // 6. Core AI optimization pipeline
    const scoreBefore = await scoreResume(resumeText, jobDescription);

    const prompt = buildOptimizationPrompt(
      resumeText,
      jobDescription,
      scoreBefore.missingKeywords,
      scoreBefore.extractedSkills,
      instructions || "",
      lengthOption || "Auto-detect"
    );
    const aiResult = await callAI(prompt, resumeText);

    const scoreAfter = await scoreResume(aiResult.resume, jobDescription);

    // 7. Deduct credit (non-owner only)
    if (!isOwner) {
      const freeRemaining = Math.max(0, FREE_CREDITS_PER_MONTH - freeUsed);
      if (freeRemaining > 0) {
        await admin
          .from("Credit")
          .update({ freeUsed: freeUsed + 1 })
          .eq("userId", activeUserId);
      } else {
        await admin
          .from("Credit")
          .update({ paidCredits: paidCredits - 1 })
          .eq("userId", activeUserId);
      }
    }

    // 8. Save resume record to Supabase with fallback to local JSON file
    const generatedId = generateUUID();
    let resumeRecord: any = null;

    try {
      const { data, error: resumeInsertErr } = await admin
        .from("Resume")
        .insert({
          id: generatedId,
          userId: activeUserId,
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
          createdAt: now.toISOString(),
        })
        .select()
        .single();

      if (resumeInsertErr) {
        logger.error("[optimize] Resume insert failed:", resumeInsertErr.message);
      } else {
        resumeRecord = data;
        logger.info(`[optimize] Resume saved: id=${resumeRecord?.id}`);
      }
    } catch (dbErr: any) {
      logger.warn("[optimize] DB insert crashed, utilizing offline fallback:", dbErr.message);
    }

    // Write to local JSON file as backup/fallback
    try {
      const DATA_DIR = path.join(process.cwd(), "data");
      const FILE_PATH = path.join(DATA_DIR, "resumes.json");
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const localResumes = fs.existsSync(FILE_PATH) ? JSON.parse(fs.readFileSync(FILE_PATH, "utf8") || "[]") : [];
      const newRecord = {
        id: resumeRecord?.id || generatedId,
        userId: activeUserId,
        originalText: resumeText,
        jobDescription: jobDescription,
        jobTitle: jobTitle || `${jobTitle || "Resume Optimization"}`,
        company: company || null,
        scoreBefore: scoreBefore.overall,
        scoreAfter: scoreAfter.overall,
        keywordsBefore: scoreBefore.foundKeywords.length,
        keywordsAfter: scoreAfter.foundKeywords.length,
        impactBefore: scoreBefore.impactBullets,
        impactAfter: scoreAfter.impactBullets,
        optimizedText: aiResult.resume,
        keywordsAdded: aiResult.keywordsAdded,
        createdAt: now.toISOString(),
      };
      localResumes.unshift(newRecord);
      fs.writeFileSync(FILE_PATH, JSON.stringify(localResumes, null, 2), "utf8");
      if (!resumeRecord) {
        resumeRecord = newRecord;
      }
    } catch (e: any) {
      logger.warn("[optimize] Failed to write local resumes JSON backup:", e.message);
    }

    return NextResponse.json({
      resumeId: resumeRecord?.id ?? "offline-" + Date.now(),
      scoreBefore: scoreBefore.overall,
      scoreAfter: scoreAfter.overall,
      optimizedText: aiResult.resume,
      keywordsAdded: aiResult.keywordsAdded,
      changesCount: aiResult.changesCount,
      summary: aiResult.summary,
    });
  } catch (error: any) {
    logger.error("[optimize] Unhandled error:", error?.message, "\nStack:", error?.stack?.split("\n").slice(0, 4).join("\n"));
    return NextResponse.json(
      { error: "Internal server error during resume optimization." },
      { status: 500 }
    );
  }
}
