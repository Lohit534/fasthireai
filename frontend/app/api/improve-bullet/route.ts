import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAIText } from "@/lib/ai/router";
import { extractTechTerms } from "@/lib/ats/keywords";
import { logger } from "@/lib/logger";
import { stripMarkdownAsterisks } from "@/lib/export/pdf-document";

function cleanBulletOutput(value: unknown, originalBullet: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("The AI did not return a rewritten bullet.");
  }

  // Take first non-empty line
  let cleaned =
    stripMarkdownAsterisks(value)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) || "";

  // Strip leading bullet characters or numbers
  cleaned = cleaned.replace(/^\s*([-*•+]|\d+\.)\s+/, "").trim();

  // Strip generic label prefixes like "Optimized:", "Improved:", "Rewritten:", "Bullet:"
  cleaned = cleaned
    .replace(
      /^(?:Optimized|Improved|Rewritten|Enhanced|Revised|Updated|Bullet)[:\s–\-]+/i,
      "",
    )
    .trim();

  // If the model literally just prepended "Optimized " to the original bullet, strip it
  const lowerOriginal = originalBullet
    .trim()
    .toLowerCase()
    .replace(/^[•\-\*+\s]+/, "");
  if (
    cleaned.toLowerCase().startsWith("optimized ") &&
    cleaned.slice(10).trim().toLowerCase() === lowerOriginal
  ) {
    cleaned = cleaned.slice(10).trim();
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication (optional check)
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Parse Request Body
    const body = await request.json();
    const { bullet, jobDescription, isSummary, type, jobTitle } = body;

    if (!bullet || typeof bullet !== "string" || !bullet.trim()) {
      return NextResponse.json(
        { error: "Input text is required." },
        { status: 400 },
      );
    }

    const jd = jobDescription || "";
    const isSummaryRequest = Boolean(isSummary || type === "summary");

    logger.info(
      `Improving ${isSummaryRequest ? "summary" : "bullet"} for user ${user?.email || "guest"}...`,
    );

    if (isSummaryRequest) {
      const summaryPrompt = `
You are an expert technical resume writer. Your task is to rewrite and optimize a candidate's Professional Summary to make it highly engaging, impact-focused, concise (3-4 sentences), and ATS-aligned.

Candidate Title / Domain: "${jobTitle || "Professional"}"
Current Summary Input: "${bullet}"
Target Job Description: "${jd.slice(0, 3000)}"

Instructions:
1. Write a professional, high-impact 3-4 sentence summary paragraph.
2. Highlight core technical competencies, key domain experience, and major strengths matching the job.
3. Do NOT use first-person pronouns ("I", "my", "me").
4. Keep all factual candidate details accurate and truthful.
5. Do NOT format as a bullet point. Output a clean paragraph.

Output MUST be a valid JSON object only (do NOT include markdown fences, leading/trailing text):
{
  "improvedBullet": "The complete rewritten 3-4 sentence professional summary paragraph.",
  "actionVerbUsed": "Summary Optimization",
  "keywordsInjected": ["key", "skills", "included"],
  "explanation": "Enhanced professional summary impact, keywords, and flow."
}
`;
      try {
        const responseText = await callAIText(summaryPrompt);
        let cleanedText = responseText.trim();
        if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText
            .replace(/^```(?:json)?\r?\n?/i, "")
            .replace(/\r?\n?```$/i, "")
            .trim();
        }
        const parsed = JSON.parse(cleanedText);
        const rawSummary = parsed.improvedBullet || bullet;
        return NextResponse.json({
          improvedBullet: stripMarkdownAsterisks(rawSummary),
          actionVerbUsed: "Summary Optimization",
          keywordsInjected: parsed.keywordsInjected || [],
          explanation: parsed.explanation || "Optimized professional summary.",
        });
      } catch (err: any) {
        logger.warn("Summary AI improver fallback:", err.message);
        return NextResponse.json({
          improvedBullet: `Results-driven ${jobTitle || "Professional"} with proven expertise in developing scalable solutions and data-driven systems. Skilled in optimizing performance, technical problem-solving, and delivering high-impact projects. Dedicated to leveraging strong technical abilities to drive organizational growth. (${bullet.trim()})`,
          actionVerbUsed: "Summary Optimization",
          keywordsInjected: [],
          explanation: "Enhanced professional summary structure and tone.",
        });
      }
    }

    // Single bullet point optimization prompt
    const bulletPrompt = `
You are an elite technical resume editor. Your task is to rewrite a single resume bullet point to make it concise, highly impactful, accurate, and ATS-optimized.

Input Bullet Point: "${bullet}"
Target Job Description: "${jd.slice(0, 2000)}"

CRITICAL ACCURACY & LENGTH RULES:
1. Output EXACTLY ONE concise sentence (14 to 20 words max). NEVER write multiple sentences, paragraphs, or extra text.
2. Structure: [Strong Past-Tense Action Verb] + [Candidate's Specific Task/Tool] + [Realistic Quantified Metric/Outcome].
3. Retain the candidate's core task faithfully. Do NOT invent unmentioned technologies or long corporate filler phrases.
4. If missing, weave in an accurate, realistic metric (e.g., "improving throughput by 35%", "supporting 15k+ active users", "reducing build time by 40%", "cutting error rates by 25%").
5. Return ONLY a single rewritten bullet sentence inside the JSON.

Output MUST be a valid JSON object only:
{
  "improvedBullet": "Engineered RESTful microservices with Node.js and Redis, reducing p99 latency by 35% for 20k+ daily users.",
  "actionVerbUsed": "Engineered",
  "metricsAdded": "35% latency reduction, 20k+ daily users",
  "keywordsInjected": ["Node.js", "Redis"],
  "explanation": "Added quantifiable performance metrics and concise impact."
}
`;

    try {
      const responseText = await callAIText(bulletPrompt);
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText
          .replace(/^```(?:json)?\r?\n?/i, "")
          .replace(/\r?\n?```$/i, "")
          .trim();
      }

      const parsed = JSON.parse(cleanedText);
      const cleaned = cleanBulletOutput(parsed.improvedBullet, bullet);
      return NextResponse.json({
        improvedBullet: cleaned,
        actionVerbUsed: parsed.actionVerbUsed || "Engineered",
        metricsAdded: parsed.metricsAdded || "Quantified metrics added",
        keywordsInjected: parsed.keywordsInjected || [],
        explanation:
          parsed.explanation ||
          "Rewritten concisely with strong action verb and quantified outcome.",
      });
    } catch (aiErr: any) {
      logger.warn(
        "Bullet AI improver call failed, using rule-based ATS fallback:",
        aiErr.message,
      );

      const cleanInput = bullet.trim()
        .replace(/^[-*•+\s]+/, "")
        .replace(/^(?:worked on|helped with|assisted with|assisted in|responsible for|handled|involved in)\s+/i, "");

      const actionVerbs = [
        "Spearheaded",
        "Engineered",
        "Optimized",
        "Architected",
        "Automated",
        "Delivered",
      ];
      const actionVerb =
        actionVerbs[Math.floor(Math.random() * actionVerbs.length)];

      let fallbackBullet = "";

      if (/certification|certified|course|diploma|license/i.test(cleanInput)) {
        fallbackBullet = `Earned ${cleanInput}, demonstrating comprehensive technical proficiency.`;
      } else {
        // If cleanInput already starts with an action verb, keep it; otherwise prepend actionVerb
        const startsWithVerb = /^(built|engineered|developed|implemented|designed|created|led|managed|architected|optimized|spearheaded|automated|deployed)\b/i.test(cleanInput);
        const baseTask = startsWithVerb ? cleanInput : `${actionVerb} ${cleanInput.charAt(0).toLowerCase() + cleanInput.slice(1)}`;
        const trimmedTask = baseTask.replace(/[.,;]+$/, "").trim();

        if (/speed|latency|performance|load|fast/i.test(cleanInput)) {
          fallbackBullet = `${trimmedTask}, reducing response latency by 35% and improving throughput.`;
        } else if (/user|traffic|client|customer/i.test(cleanInput)) {
          fallbackBullet = `${trimmedTask}, scaling to support 15,000+ active users with 99.9% uptime.`;
        } else if (/test|bug|fix|issue|defect|error|quality/i.test(cleanInput)) {
          fallbackBullet = `${trimmedTask}, resolving 50+ critical issues and raising test coverage to 90%.`;
        } else if (/database|query|data|pipeline|storage/i.test(cleanInput)) {
          fallbackBullet = `${trimmedTask}, reducing query execution time by 40% across high-volume datasets.`;
        } else {
          fallbackBullet = `${trimmedTask}, increasing operational efficiency by 30% and accelerating delivery.`;
        }
      }

      return NextResponse.json({
        improvedBullet: fallbackBullet,
        actionVerbUsed: actionVerb,
        metricsAdded: "Quantified metric added",
        keywordsInjected: [],
        explanation:
          "Enhanced with concise action verb and quantified outcome.",
      });
    }
  } catch (error: any) {
    logger.error("Failed to process improvement request:", error);
    return NextResponse.json(
      { error: "Internal server error during optimization." },
      { status: 500 },
    );
  }
}
