import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../logger";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Available Gemini models in priority order
const GEMINI_MODELS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
  "gemini-pro",
];

// Returns parsed object or fallback
export async function callGemini(prompt: string, rawText = ""): Promise<object> {
  if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not defined. Using fallback values.");
    return {
      resume: rawText,
      keywordsAdded: [],
      changesCount: 0,
      summary: "Optimized (Gemini key missing).",
    };
  }

  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 4000,
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (!responseText) {
        continue;
      }

      // Strip markdown fences
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText
          .replace(/^```(?:json)?\r?\n?/i, "")
          .replace(/\r?\n?```$/i, "")
          .trim();
      }

      // Return parsed object
      return JSON.parse(cleanedText);
    } catch (error: any) {
      lastError = error;
      logger.warn(`Gemini model ${modelName} failed, trying next fallback...`, error?.message);
    }
  }

  logger.error("All Gemini model fallbacks failed:", lastError);
  return {
    resume: rawText,
    keywordsAdded: [],
    changesCount: 0,
    summary: `Optimized (Gemini API error: ${lastError?.message || "unknown"}).`,
  };
}
