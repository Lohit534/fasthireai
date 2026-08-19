import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { buildOptimizationPrompt } from "@/lib/ai/prompts";
import { callAI } from "@/lib/ai/router";
import { scoreResume } from "@/lib/ats/scorer";
import { generateUUID } from "@/lib/utils";
import { isOwnerEmail, FREE_CREDITS_PER_MONTH, PRO_CREDITS_PER_MONTH } from "@/types";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 60; // 60s timeout for AI optimization

const MIN_RESUME_CHARS = 100;
const MIN_JD_CHARS = 50;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify auth session (cookies or Bearer token header)
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
      return NextResponse.json(
        { error: "Please sign in to optimize your resume." },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const { resumeText, jobDescription, instructions, lengthOption, jobTitle, company } = await request.json();

    if (!resumeText || resumeText.length < MIN_RESUME_CHARS) {
      return NextResponse.json(
        { error: `Resume text is too short. Please provide at least ${MIN_RESUME_CHARS} characters.` },
        { status: 400 }
      );
    }

    if (!jobDescription || jobDescription.length < MIN_JD_CHARS) {
      return NextResponse.json(
        { error: `Job description is too short. Please provide at least ${MIN_JD_CHARS} characters.` },
        { status: 400 }
      );
    }

    const isOwner = isOwnerEmail(user.email);
    const admin = getAdminClient() as any;
    const now = new Date();

    // Resolve user record ID in public.User
    let activeUserId = user.id;
    try {
        const { data: existingUser } = await admin
          .from("User")
          .select("id, createdAt")
          .eq("email", user.email.toLowerCase().trim())
          .maybeSingle();

        if (existingUser) {
          activeUserId = existingUser.id;
          logger.info(`[optimize] Found existing User record for email ${user.email} with ID ${existingUser.id}. Reusing this ID.`);
          
          if (user.created_at) {
            const dbTime = existingUser.createdAt ? new Date(existingUser.createdAt).toISOString() : null;
            const authTime = new Date(user.created_at).toISOString();
            if (dbTime !== authTime) {
              await admin
                .from("User")
                .update({ createdAt: authTime })
                .eq("id", existingUser.id);
              logger.info(`[optimize] Healed signup time for user ${user.email}: ${dbTime} -> ${authTime}`);
            }
          }
        } else {
          const signupTime = user.created_at ? new Date(user.created_at).toISOString() : now.toISOString();
          logger.info(`[optimize] Creating new User record for email ${user.email} with ID ${user.id} and signup time ${signupTime}`);
          const { error: insertUserErr } = await admin
            .from("User")
            .insert({
              id: user.id,
              email: user.email.toLowerCase().trim(),
              name: user.user_metadata?.full_name || null,
              createdAt: signupTime,
            });
          if (!insertUserErr) {
            activeUserId = user.id;
          }
        }
    } catch (e: any) {
      logger.error("[optimize] Error during User resolution/insertion:", e.message);
    }

    let freeUsed = 0;
    let paidCredits = 0;
    let isUnlimited = isOwner;

    if (!isOwner) {
      const { data: earlyUsers } = await admin
        .from("User")
        .select("id")
        .order("createdAt", { ascending: true })
        .limit(50);
      
      const earlyUserIds = (earlyUsers || []).map((u: any) => u.id);
      const isFirst50 = earlyUserIds.includes(activeUserId) || earlyUserIds.includes(user.id);

      let { data: creditRow, error: creditFetchErr } = await admin
        .from("Credit")
        .select("*")
        .eq("userId", activeUserId)
        .maybeSingle();

      if (!creditRow && !creditFetchErr) {
        const initialPaidCredits = isFirst50 ? 365 : 0;
        logger.info(`[optimize] Initializing Credit record for user ${user.email} (isFirst50=${isFirst50}, initialPaid=${initialPaidCredits})`);
        
        const { data: newCredit } = await admin
          .from("Credit")
          .insert({
            userId: activeUserId,
            freeUsed: 0,
            paidCredits: initialPaidCredits,
            resetAt: now.toISOString(),
          })
          .select()
          .single();
        if (newCredit) {
          creditRow = newCredit;
        }
      }

      if (creditRow) {
        const resetAt = new Date(creditRow.resetAt);
        const isNewMonth =
          now.getMonth() !== resetAt.getMonth() ||
          now.getFullYear() !== resetAt.getFullYear();

        freeUsed = isNewMonth ? 0 : (creditRow.freeUsed || 0);
        paidCredits = isNewMonth 
          ? (isFirst50 ? 365 : (creditRow.paidCredits >= 900000 ? 999999 : (creditRow.paidCredits > 0 ? PRO_CREDITS_PER_MONTH : 0))) 
          : (creditRow.paidCredits || 0);

        if (isNewMonth) {
          await admin
            .from("Credit")
            .update({ 
              freeUsed: 0, 
              paidCredits: paidCredits, 
              resetAt: now.toISOString() 
            })
            .eq("userId", activeUserId);
        }

        isUnlimited = isFirst50 || paidCredits >= 900000;

        // STRICT QUOTA ENFORCEMENT
        if (!isUnlimited) {
          const isProPlan = paidCredits > 0;
          const allowedLimit = isProPlan ? PRO_CREDITS_PER_MONTH : FREE_CREDITS_PER_MONTH;

          if (freeUsed >= allowedLimit) {
            if (isProPlan) {
              return NextResponse.json(
                { error: `Monthly quota of ${PRO_CREDITS_PER_MONTH} optimizations reached for Pro plan. Please upgrade to Pro Max for unlimited access or wait for your monthly cycle reset.` },
                { status: 403 }
              );
            } else {
              return NextResponse.json(
                { error: `Monthly limit of ${FREE_CREDITS_PER_MONTH} optimizations reached for Free plan. Please upgrade to Premium Pro (20 optimizations) or Pro Max to continue.` },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    logger.info(`[optimize] User: ${user.email} | activeUserId=${activeUserId} | freeUsed=${freeUsed} | paid=${paidCredits} | isUnlimited=${isUnlimited} | owner=${isOwner}`);

    // Core AI optimization pipeline
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
    const scoreAfter = await scoreResume(aiResult.resume, jobDescription, scoreBefore.overall);

    // Calculate actual injected keywords by combining AI-declared keywords with ATS delta analysis
    const beforeKeywordsSet = new Set(scoreBefore.foundKeywords.map(k => k.toLowerCase()));
    const injectedFromScorer = scoreAfter.foundKeywords.filter(
      k => !beforeKeywordsSet.has(k.toLowerCase())
    );

    const optimizedLower = (aiResult.resume || "").toLowerCase();
    const missingNowFound = (scoreBefore.missingKeywords || []).filter(
      kw => kw && kw.length > 2 && optimizedLower.includes(kw.toLowerCase())
    );

    const mergedKeywordsAdded = Array.from(
      new Set([
        ...(Array.isArray(aiResult.keywordsAdded) ? aiResult.keywordsAdded : []),
        ...injectedFromScorer,
        ...missingNowFound
      ])
    ).filter(kw => kw && kw.trim().length > 1);

    let finalSummary = aiResult.summary;
    if (!finalSummary || finalSummary === "Optimized." || finalSummary.trim().length < 15) {
      const kwCount = mergedKeywordsAdded.length;
      const scoreGain = Math.max(0, scoreAfter.overall - scoreBefore.overall);
      finalSummary = `Injected ${kwCount > 0 ? kwCount : "key"} target JD keywords, upgraded action verbs, and strengthened bullet points with quantifiable metrics (+${scoreGain} pts match score).`;
    }

    // Deduct credits
    if (!isOwner) {
      const { data: earlyUsers } = await admin
        .from("User")
        .select("id")
        .order("createdAt", { ascending: true })
        .limit(50);
      const earlyUserIds = (earlyUsers || []).map((u: any) => u.id);
      const isFirst50 = earlyUserIds.includes(activeUserId) || earlyUserIds.includes(user.id);
      const freeLimit = isFirst50 ? 15 : FREE_CREDITS_PER_MONTH;

      if (freeUsed < freeLimit) {
        await admin
          .from("Credit")
          .update({ freeUsed: freeUsed + 1 })
          .eq("userId", activeUserId);
      } else if (paidCredits > 0) {
        await admin
          .from("Credit")
          .update({ paidCredits: paidCredits - 1 })
          .eq("userId", activeUserId);
      }
    }

    // Save resume record to Supabase DB using valid schema columns ONLY
    const generatedId = generateUUID();
    let resumeRecord: any = null;

    // Extract job title: prefer AI-detected, then user-provided, then extract from JD text
    let finalJobTitle = (aiResult.detectedJobTitle || jobTitle || "").trim();
    if (!finalJobTitle || finalJobTitle.toLowerCase() === "optimized resume" || finalJobTitle.toLowerCase() === "untitled resume") {
      const jdText = (jobDescription || "").substring(0, 1000);
      const rolePatterns = [
        /(?:job\s*title|position|role|designation|looking for a|hiring for a|hiring|opportunity for)[:\s]+([A-Za-z0-9][A-Za-z0-9\s\/\-&,]{3,50}?)(?:\n|,|\.|\||\()/i,
        /(?:title)[:\s]+([A-Za-z0-9\s\/\-&]{3,50}?)(?:\n|$)/i,
        /(?:senior|junior|lead|staff|principal|associate|graduate)?\s*(?:full\s*stack|front\s*end|back\s*end|software|ai\/ml|machine\s*learning|data|devops|cloud|mobile|ios|android|qa|product|project|security|systems)\s*(?:engineer|developer|scientist|architect|manager|analyst|consultant|specialist)/i,
        /^([A-Z][A-Za-z0-9\s\/\-&]{4,50}?)(?:\n|$)/m,
      ];
      for (const pattern of rolePatterns) {
        const match = jdText.match(pattern);
        if (match) {
          const candidate = (match[1] || match[0]).trim().replace(/\s+/g, " ");
          if (candidate.length > 3 && candidate.length < 60 && !/^(the|a|an|about|overview|summary|requirements|responsibilities)$/i.test(candidate)) {
            finalJobTitle = candidate;
            break;
          }
        }
      }
    }
    if (!finalJobTitle) finalJobTitle = "Target Role Application";
    const finalCompany = aiResult.detectedCompany || company || "General Application";

    try {
      let { data, error: resumeInsertErr } = await admin
        .from("Resume")
        .insert({
          id: generatedId,
          userId: activeUserId,
          originalText: resumeText,
          jobDescription: jobDescription,
          jobTitle: finalJobTitle,
          company: finalCompany,
          scoreBefore: scoreBefore.overall,
          scoreAfter: scoreAfter.overall,
          keywordsBefore: scoreBefore.foundKeywords.length,
          keywordsAfter: scoreAfter.foundKeywords.length,
          impactBefore: scoreBefore.impactBullets,
          impactAfter: scoreAfter.impactBullets,
          optimizedText: aiResult.resume,
          keywordsAdded: mergedKeywordsAdded,
          createdAt: now.toISOString(),
        })
        .select()
        .single();

      if (resumeInsertErr && activeUserId !== user.id) {
        logger.warn(`[optimize] Primary insert with activeUserId=${activeUserId} failed: ${resumeInsertErr.message}. Retrying with auth user.id=${user.id}`);
        const retry = await admin
          .from("Resume")
          .insert({
            id: generatedId,
            userId: user.id,
            originalText: resumeText,
            jobDescription: jobDescription,
            jobTitle: finalJobTitle,
            company: finalCompany,
            scoreBefore: scoreBefore.overall,
            scoreAfter: scoreAfter.overall,
            keywordsBefore: scoreBefore.foundKeywords.length,
            keywordsAfter: scoreAfter.foundKeywords.length,
            impactBefore: scoreBefore.impactBullets,
            impactAfter: scoreAfter.impactBullets,
            optimizedText: aiResult.resume,
            keywordsAdded: mergedKeywordsAdded,
            createdAt: now.toISOString(),
          })
          .select()
          .single();
        data = retry.data;
        resumeInsertErr = retry.error;
      }

      if (resumeInsertErr) {
        logger.error("[optimize] Resume DB insert failed on both IDs:", resumeInsertErr.message);
      } else {
        resumeRecord = data;
        logger.info(`[optimize] Resume saved successfully to DB: id=${resumeRecord?.id}`);
      }
    } catch (dbErr: any) {
      logger.error("[optimize] DB insert exception:", dbErr.message);
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
        jobTitle: finalJobTitle,
        company: finalCompany,
        scoreBefore: scoreBefore.overall,
        scoreAfter: scoreAfter.overall,
        keywordsBefore: scoreBefore.foundKeywords.length,
        keywordsAfter: scoreAfter.foundKeywords.length,
        impactBefore: scoreBefore.impactBullets,
        impactAfter: scoreAfter.impactBullets,
        optimizedText: aiResult.resume,
        keywordsAdded: mergedKeywordsAdded,
        createdAt: now.toISOString(),
      };
      localResumes.unshift(newRecord);
      fs.writeFileSync(FILE_PATH, JSON.stringify(localResumes, null, 2), "utf8");
    } catch (localErr: any) {
      logger.warn("[optimize] Local JSON file fallback failed:", localErr.message);
    }

    // Strictly deduct credit usage in database for non-owners
    if (!isOwner) {
      try {
        const newFreeUsed = freeUsed + 1;
        const newPaidCredits = paidCredits > 0 && paidCredits < 900000 ? Math.max(0, paidCredits - 1) : paidCredits;
        await admin
          .from("Credit")
          .update({
            freeUsed: newFreeUsed,
            paidCredits: newPaidCredits,
          })
          .eq("userId", activeUserId);
        logger.info(`[optimize] Strictly updated credit in DB for ${user.email}: freeUsed=${newFreeUsed}, paidCredits=${newPaidCredits}`);
      } catch (creditErr: any) {
        logger.error("[optimize] Failed to increment credit usage in DB:", creditErr.message);
      }
    }

    return NextResponse.json({
      resumeId: resumeRecord?.id || generatedId,
      optimizedText: aiResult.resume,
      resumeJSON: aiResult.resumeJSON,
      keywordsAdded: mergedKeywordsAdded,
      changesCount: mergedKeywordsAdded.length || aiResult.changesCount || 6,
      summary: finalSummary,
      jobTitle: finalJobTitle,
      company: finalCompany,
      scoreBefore: scoreBefore.overall,
      scoreAfter: scoreAfter.overall,
    });
  } catch (error: any) {
    logger.error("[optimize] Unhandled error:", error?.message, "\nStack:", error?.stack);
    return NextResponse.json(
      { error: error?.message || "An error occurred during resume optimization." },
      { status: 500 }
    );
  }
}
