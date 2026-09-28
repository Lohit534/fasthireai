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
  let cleaned = stripMarkdownAsterisks(value)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0) || "";

  // Strip leading bullet characters or numbers
  cleaned = cleaned.replace(/^\s*([-*•+]|\d+\.)\s+/, "").trim();

  // Strip generic label prefixes like "Optimized:", "Improved:", "Rewritten:", "Bullet:"
  cleaned = cleaned.replace(/^(?:Optimized|Improved|Rewritten|Enhanced|Revised|Updated|Bullet)[:\s–\-]+/i, "").trim();

  // If the model literally just prepended "Optimized " to the original bullet, strip it
  const lowerOriginal = originalBullet.trim().toLowerCase().replace(/^[•\-\*+\s]+/, "");
  if (cleaned.toLowerCase().startsWith("optimized ") && cleaned.slice(10).trim().toLowerCase() === lowerOriginal) {
    cleaned = cleaned.slice(10).trim();
  }

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn("Unauthorized attempt to access /api/improve-bullet");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Request Body
    const body = await request.json();
    const { bullet, jobDescription, isSummary, type, jobTitle } = body;

    if (!bullet || typeof bullet !== "string" || !bullet.trim()) {
      return NextResponse.json({ error: "Input text is required." }, { status: 400 });
    }

    const jd = jobDescription || "";
    const isSummaryRequest = Boolean(isSummary || type === "summary");

    logger.info(`Improving ${isSummaryRequest ? "summary" : "bullet"} for user ${user.email}...`);

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
You are an expert technical resume writer. Your task is to rewrite a single resume bullet point to make it highly optimized for applicant tracking systems (ATS), starting with a strong action verb, integrating relevant keywords from the job description, and highlighting measurable impact.

Input Bullet Point: "${bullet}"
Target Job Description: "${jd.slice(0, 3000)}"

Instructions:
1. Rewrite the bullet so it starts with a strong, active past-tense action verb (e.g., Spearheaded, Engineered, Optimized, Architected, Automated, Accelerated, Developed, Delivered, Formulated).
2. Weave in relevant technical keywords and skills from the Target Job Description where natural.
3. If the input bullet is a certification or credential (e.g. "CodeTantra – Python Programming Certification"), rewrite it as a compelling competency statement (e.g., "Earned Python Programming Certification from CodeTantra, demonstrating mastery in Python development, algorithmic logic, and clean coding standards.").
4. DO NOT invent fake bracketed metrics like "[15]%". Keep metrics natural and genuine based on the input.
5. CRITICAL: NEVER prepend labels like "Optimized:", "Improved:", "Rewritten:", or "Optimized <bullet>". Return the rewritten statement directly.
6. Keep style concise, professional, impact-oriented, and ATS-optimized.

Output MUST be a valid JSON object only (do NOT include markdown fences, leading/trailing text):
{
  "improvedBullet": "The complete rewritten ATS bullet string (no asterisks, no prefix labels)",
  "actionVerbUsed": "The strong past-tense action verb you started with",
  "metricsAdded": "Any metric preserved or highlighted",
  "keywordsInjected": ["relevant", "keywords"],
  "explanation": "Brief explanation of the ATS optimization made."
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
        actionVerbUsed: parsed.actionVerbUsed || "Spearheaded",
        metricsAdded: parsed.metricsAdded || "",
        keywordsInjected: parsed.keywordsInjected || [],
        explanation: parsed.explanation || "Rewritten with strong action verb and target job keywords.",
      });
    } catch (aiErr: any) {
      logger.warn("Bullet AI improver call failed, using rule-based ATS fallback:", aiErr.message);

      const techTerms = extractTechTerms(jd).slice(0, 3);
      const actionVerbs = ["Spearheaded", "Engineered", "Optimized", "Architected", "Automated", "Delivered"];
      const actionVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];

      const cleanInput = bullet.trim().replace(/^[-*•+\s]+/, "");
      let fallbackBullet = "";

      // Check if it's a certification
      if (/certification|certified|course|diploma|license/i.test(cleanInput)) {
        fallbackBullet = `Earned ${cleanInput}, demonstrating comprehensive technical mastery and industry-standard proficiency.`;
      } else if (techTerms.length > 0) {
        const lower = cleanInput.charAt(0).toLowerCase() + cleanInput.slice(1);
        fallbackBullet = `${actionVerb} ${lower}, leveraging ${techTerms.join(" and ")} to maximize delivery efficiency.`;
      } else {
        const lower = cleanInput.charAt(0).toLowerCase() + cleanInput.slice(1);
        fallbackBullet = `${actionVerb} ${lower}, ensuring high-quality execution and measurable technical outcomes.`;
      }

      return NextResponse.json({
        improvedBullet: fallbackBullet,
        actionVerbUsed: actionVerb,
        metricsAdded: "",
        keywordsInjected: techTerms,
        explanation: "Rewritten with strong action verb and target job competencies.",
      });
    }

  } catch (error: any) {
    logger.error("Failed to process improvement request:", error);
    return NextResponse.json(
      { error: "Internal server error during optimization." },
      { status: 500 }
    );
  }
}
