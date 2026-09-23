import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractTechTerms, extractKeywords } from "@/lib/ats/keywords";
import { logger } from "@/lib/logger";
import { stripMarkdownAsterisks } from "@/lib/export/pdf-document";

function getGenAI() {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
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

    // 3. Fallback Flow if Gemini key is missing
    const genAI = getGenAI();
    if (!genAI) {
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
      const injected = techTerms.length > 0 ? techTerms : ["relevant technologies"];
      const fallbackActionVerbs = ["Spearheaded", "Optimized", "Engineered", "Devised", "Automated", "Accelerated"];
      const actionVerb = fallbackActionVerbs[Math.floor(Math.random() * fallbackActionVerbs.length)];
      
      const cleanedInput = bullet.trim().replace(/^[-*•\s]+/, "");
      const lowerCleaned = cleanedInput.charAt(0).toLowerCase() + cleanedInput.slice(1);
      
      let improvedBullet = "";
      if (techTerms.length > 0) {
         improvedBullet = `${actionVerb} ${lowerCleaned} utilizing ${injected.join(", ")}.`;
      } else {
         improvedBullet = `${actionVerb} ${lowerCleaned}`;
      }

      return NextResponse.json({
        improvedBullet,
        actionVerbUsed: actionVerb,
        metricsAdded: "",
        keywordsInjected: techTerms,
        explanation: "Began with a strong action verb and integrated target keywords."
      });
    }

    // 4. Gemini AI Call
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        generationConfig: {
          temperature: 0.4,
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
3. DO NOT inject fake or estimated metrics like "[15]%" or "$[500]". Only include numbers if they were present in the original input. Keep the focus entirely on improving the action verb, keywords, and professional tone.
4. Ensure the style is professional, concise, and impact-oriented.

Output MUST be a valid JSON object only (do NOT include markdown fences, leading/trailing text, or code block formatting) with the following structure:
{
  "improvedBullet": "The complete rewritten bullet point string (clean text only, no asterisks).",
  "actionVerbUsed": "The past-tense action verb you started the bullet with.",
  "metricsAdded": "Any metric you preserved from the original text (or empty string if none).",
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
      
      const cleanedInput = bullet.trim().replace(/^[-*•\s]+/, "");
      const lowerCleaned = cleanedInput.charAt(0).toLowerCase() + cleanedInput.slice(1);
      return NextResponse.json({
        improvedBullet: `Optimized ${lowerCleaned}`,
        actionVerbUsed: "Optimized",
        metricsAdded: "",
        keywordsInjected: [],
        explanation: "Began with optimized action verb (AI fallback)."
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
