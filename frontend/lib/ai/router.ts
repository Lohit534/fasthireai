import { callClaude } from "./claude";
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

  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (hasAnthropic) {
    try {
      logger.info("AI Router: Routing optimization request to Claude...");
      const result = await callClaude(prompt, rawText);
      logger.info("AI Router: Successfully optimized using Claude.");
      return {
        ...defaultFallback,
        ...result
      };
    } catch (error) {
      logger.warn("AI Router: Claude call failed, falling back to Gemini.", error);
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
  } catch (error) {
    logger.error("AI Router: Critical failure. Both Claude and Gemini calls failed.", error);
    return defaultFallback;
  }
}
