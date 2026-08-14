import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractTechTerms, extractKeywords } from "@/lib/ats/keywords";
import { logger } from "@/lib/logger";
import { stripMarkdownAsterisks } from "@/lib/export/pdf-document";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

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

    // 3. Fallback Flow if Gemini key is missing
    if (!apiKey) {
      logger.warn("GEMINI_API_KEY missing. Using fallback rule-based improver.");
      
      if (isSummaryRequest) {
        const cleaned = bullet.trim();
        const improvedSummary = `Results-driven ${jobTitle || "Professional"} with proven expertise in developing scalable solutions and data-driven systems. Skilled in optimizing performance, technical problem-solving, and delivering high-impact projects. Dedicated to leveraging strong technical abilities to drive organizational growth. (${cleaned})`;
        return NextResponse.json({
          improvedBullet: improvedSummary,
          actionVerbUsed: "Summary Optimization",
          keywordsInjected: [],
          explanation: "Enhanced professional summary structure and tone."
        });
      }

      const techTerms = extractTechTerms(jd).slice(0, 3);
      const injected = techTerms.length > 0 ? techTerms : ["targeted technologies"];
      const fallbackActionVerbs = ["Spearheaded", "Optimized", "Engineered", "Devised", "Automated", "Accelerated"];
      const actionVerb = fallbackActionVerbs[Math.floor(Math.random() * fallbackActionVerbs.length)];
      const fallbackMetrics = ["yielding a [28]% efficiency increase", "reducing latency by [42]%", "saving over $[15]K in cloud overhead"];
      const metric = fallbackMetrics[Math.floor(Math.random() * fallbackMetrics.length)];
      
      const cleanedInput = bullet.trim().replace(/^[-*•\s]+/, "");
      const improvedBullet = `${actionVerb} the deployment and maintenance of ${injected.join(" and ")}, ${metric} while refactoring legacy code (${cleanedInput.charAt(0).toLowerCase() + cleanedInput.slice(1)}).`;

      return NextResponse.json({
        improvedBullet,
        actionVerbUsed: actionVerb,
        metricsAdded: metric.match(/\[.*?\]/)?.[0] || "estimated metric",
        keywordsInjected: techTerms,
        explanation: "Began with a strong action verb, integrated target keywords, and injected estimated impact metrics."
      });
    }

    // 4. Gemini AI Call
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      if (isSummaryRequest) {
        const prompt = `
You are an expert technical resume writer. Your task is to rewrite and optimize a candidate's Professional Summary to make it highly engaging, impact-focused, concise (3-4 sentences), and ATS-aligned.

Candidate Title / Domain: "${jobTitle || 'Professional'}"
Current Summary Input: "${bullet}"
Target Job Description: "${jd.slice(0, 3000)}"

Instructions:
1. Write a professional, high-impact 3-4 sentence summary paragraph.
2. Highlight core technical competencies, key domain experience, and major strengths.
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
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        let cleanedText = responseText;
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
          explanation: parsed.explanation || "Optimized professional summary."
        });
      }

      const prompt = `
You are an expert technical resume writer. Your task is to rewrite a single resume bullet point to make it highly optimized for applicant tracking systems (ATS), starting with a strong action verb, integrating relevant keywords from the job description, and including metrics or quantification.

Input Bullet Point: "${bullet}"
Target Job Description: "${jd.slice(0, 3000)}"

Instructions:
1. Rewrite the bullet point so it begins with a strong past-tense action verb (e.g., spearheaded, architected, orchestrated, automated, optimized, designed).
2. Integrate relevant keywords or technical skill sets from the Target Job Description where natural.
3. Quantify impact. If the original bullet has no metric, you MUST propose a highly realistic placeholder or estimated metric in square brackets, e.g. "[25]%" or "$[5,000]" or "[3] months".
4. Ensure the style is professional, concise, and impact-oriented.

Output MUST be a valid JSON object only (do NOT include markdown fences, leading/trailing text, or code block formatting) with the following structure:
{
  "improvedBullet": "The complete rewritten bullet point string.",
  "actionVerbUsed": "The past-tense action verb you started the bullet with.",
  "metricsAdded": "The metric or placeholder metric you added (e.g. '[35]%').",
  "keywordsInjected": ["array", "of", "keywords", "injected"],
  "explanation": "A one-sentence summary of the specific optimization you made."
}
`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      let cleanedText = responseText;
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText
          .replace(/^```(?:json)?\r?\n?/i, "")
          .replace(/\r?\n?```$/i, "")
          .trim();
      }

      const parsed = JSON.parse(cleanedText);
      const rawBullet = parsed.improvedBullet || bullet;
      return NextResponse.json({
        improvedBullet: stripMarkdownAsterisks(rawBullet),
        actionVerbUsed: parsed.actionVerbUsed || "Optimized",
        metricsAdded: parsed.metricsAdded || "estimated metrics",
        keywordsInjected: parsed.keywordsInjected || [],
        explanation: parsed.explanation || "Improved bullet verb and formatting structure."
      });
    } catch (aiErr: any) {
      logger.error("Gemini optimizer failed, falling back", aiErr);
      if (isSummaryRequest) {
        return NextResponse.json({
          improvedBullet: `Detail-oriented ${jobTitle || "Professional"} with proven expertise in technical problem-solving, project execution, and cross-functional team collaboration. Skilled in leveraging industry-standard tools to optimize workflow efficiency and achieve strategic project milestones. (${bullet.trim()})`,
          actionVerbUsed: "Summary Optimization",
          keywordsInjected: [],
          explanation: "Enhanced professional summary structure and tone."
        });
      }
      return NextResponse.json({
        improvedBullet: `Optimized the implementation of target components (${bullet.trim().replace(/^[-*•\s]+/, "")}) generating a [15]% increase in operational performance.`,
        actionVerbUsed: "Optimized",
        metricsAdded: "[15]%",
        keywordsInjected: [],
        explanation: "Began with optimized action verb and added placeholder metrics."
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
