import { callGroq } from "./groq";
import { callGemini } from "./gemini";
import { logger } from "../logger";

interface AIResult {
  resume: string;
  keywordsAdded: string[];
  changesCount: number;
  summary: string;
  detectedJobTitle?: string;
  detectedCompany?: string;
}

export function sanitizeResumeText(text: string): string {
  return text
    // Remove ALL LaTeX commands
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/\{|\}/g, '')
    // Remove markdown
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/_{2}([^_]+)_{2}/g, '$1')
    // Remove LaTeX environments
    .replace(/\\begin\{[^}]*\}/g, '')
    .replace(/\\end\{[^}]*\}/g, '')
    // Fix bullet points — normalize all bullet markers to •
    .replace(/^[\s]*[-–—]\s/gm, '• ')
    .replace(/^[\s]*\\item\s/gm, '• ')
    // Remove double blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function callAI(prompt: string, rawText = ""): Promise<AIResult> {
  const defaultFallback: AIResult = {
    resume: rawText,
    keywordsAdded: [],
    changesCount: 0,
    summary: "Optimized.",
    detectedJobTitle: "Optimized Resume",
    detectedCompany: "General Application"
  };

  const hasGroq = !!process.env.GROQ_API_KEY;

  if (hasGroq) {
    try {
      logger.info("AI Router: Routing optimization request to Groq...");
      const result = (await callGroq(prompt, rawText)) as any;
      logger.info("AI Router: Successfully optimized using Groq.");
      return {
        ...defaultFallback,
        ...result,
        resume: sanitizeResumeText(result.resume || "")
      };
    } catch (error) {
      logger.warn("AI Router: Groq call failed, falling back to Gemini.", error);
    }
  }

  try {
    logger.info("AI Router: Routing optimization request to Gemini...");
    const result = (await callGemini(prompt, rawText)) as any;
    logger.info("AI Router: Successfully optimized using Gemini.");
    return {
      ...defaultFallback,
      ...result,
      resume: sanitizeResumeText(result.resume || "")
    };
  } catch (error: any) {
    logger.error("AI Router: Critical failure. Both Groq and Gemini calls failed.", error);
    return {
      ...defaultFallback,
      summary: `Optimized (AI Critical Failure: ${error?.message || "unknown"}).`,
      resume: sanitizeResumeText(rawText)
    };
  }
}
