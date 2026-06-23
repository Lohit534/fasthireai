import { callGroq } from "./groq";
import { callGemini } from "./gemini";
import { logger } from "../logger";

interface AIResult {
  resume: string;
  keywordsAdded: string[];
  changesCount: number;
  summary: string;
}

export async function callAI(prompt: string, rawText = ""): Promise<AIResult> {
  const defaultFallback: AIResult = {
    resume: rawText,
    keywordsAdded: [],
    changesCount: 0,
    summary: "Optimized."
  };

  const hasGroq = !!process.env.GROQ_API_KEY;

  if (hasGroq) {
    try {
      logger.info("AI Router: Routing optimization request to Groq...");
      const result = await callGroq(prompt, rawText);
      logger.info("AI Router: Successfully optimized using Groq.");
      return {
        ...defaultFallback,
        ...result
      };
    } catch (error) {
      logger.warn("AI Router: Groq call failed, falling back to Gemini.", error);
    }
  }

  try {
    logger.info("AI Router: Routing optimization request to Gemini...");
    const result = await callGemini(prompt, rawText);
    logger.info("AI Router: Successfully optimized using Gemini.");
    return {
      ...defaultFallback,
      ...result
    };
  } catch (error: any) {
    logger.error("AI Router: Critical failure. Both Groq and Gemini calls failed.", error);
    return {
      ...defaultFallback,
      summary: `Optimized (AI Critical Failure: ${error?.message || "unknown"}).`
    };
  }
}
