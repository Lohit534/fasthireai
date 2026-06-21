import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractTechTerms, extractKeywords } from "@/lib/ats/keywords";
import { logger } from "@/lib/logger";

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
    const { bullet, jobDescription } = body;

    if (!bullet || typeof bullet !== "string" || !bullet.trim()) {
      return NextResponse.json({ error: "Bullet text is required." }, { status: 400 });
    }

    const jd = jobDescription || "";

    logger.info(`Improving bullet for user ${user.email}...`);

    // 3. Fallback Mock Flow if Gemini key is missing
    if (!apiKey) {
      logger.warn("GEMINI_API_KEY missing. Using fallback rule-based bullet improver.");
      
      const techTerms = extractTechTerms(jd).slice(0, 3);
      const injected = techTerms.length > 0 ? techTerms : ["targeted technologies"];
      
      // Propose realistic action verbs
      const fallbackActionVerbs = ["Spearheaded", "Optimized", "Engineered", "Devised", "Automated", "Accelerated"];
      const actionVerb = fallbackActionVerbs[Math.floor(Math.random() * fallbackActionVerbs.length)];
      
      // Propose realistic metrics
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
      return NextResponse.json({
        improvedBullet: parsed.improvedBullet || bullet,
        actionVerbUsed: parsed.actionVerbUsed || "Optimized",
        metricsAdded: parsed.metricsAdded || "estimated metrics",
        keywordsInjected: parsed.keywordsInjected || [],
        explanation: parsed.explanation || "Improved bullet verb and formatting structure."
      });
    } catch (aiErr: any) {
      logger.error("Gemini bullet optimizer failed, falling back", aiErr);
      return NextResponse.json({
        improvedBullet: `Optimized the implementation of target components (${bullet.trim().replace(/^[-*•\s]+/, "")}) generating a [15]% increase in operational performance.`,
        actionVerbUsed: "Optimized",
        metricsAdded: "[15]%",
        keywordsInjected: [],
        explanation: "Began with optimized action verb and added placeholder metrics."
      });
    }
  } catch (error: any) {
    logger.error("Failed to process bullet improvement request:", error);
    return NextResponse.json(
      { error: "Internal server error during bullet optimization." },
      { status: 500 }
    );
  }
}
