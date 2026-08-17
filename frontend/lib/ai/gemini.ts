import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../logger";

// Active supported Gemini models in priority order
const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-8b",
];

// Helper to extract and clean JSON from AI output
function extractJSON(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\r?\n?/i, "")
      .replace(/\r?\n?```$/i, "")
      .trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    // Try to find the first '{' and last '}'
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const jsonSub = cleaned.substring(start, end + 1);
      return JSON.parse(jsonSub);
    }
    throw new Error("Unable to parse JSON from AI response.");
  }
}

// Returns parsed object
export async function callGemini(prompt: string, rawText = ""): Promise<object> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not defined. Using fallback values.");
    return {
      resume: rawText,
      keywordsAdded: [],
      changesCount: 0,
      summary: "Optimized.",
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    // 1. Try official SDK
    try {
      logger.info(`[gemini] Attempting generation with SDK model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 4000,
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (responseText) {
        const parsed = extractJSON(responseText);
        logger.info(`[gemini] Successfully generated optimization via ${modelName} (SDK)`);
        return parsed;
      }
    } catch (sdkError: any) {
      lastError = sdkError;
      logger.warn(`[gemini] SDK attempt failed for ${modelName}:`, sdkError?.message);
    }

    // 2. Try direct REST fallback for the same model
    try {
      logger.info(`[gemini] Attempting generation with Direct REST endpoint: ${modelName}`);
      const restRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 4000,
            },
          }),
        }
      );

      if (restRes.ok) {
        const restJson = await restRes.json();
        const candidateText = restJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          const parsed = extractJSON(candidateText);
          logger.info(`[gemini] Successfully generated optimization via ${modelName} (REST)`);
          return parsed;
        }
      } else {
        const errBody = await restRes.text();
        logger.warn(`[gemini] REST endpoint returned ${restRes.status} for ${modelName}:`, errBody);
      }
    } catch (restError: any) {
      lastError = restError;
      logger.warn(`[gemini] REST attempt failed for ${modelName}:`, restError?.message);
    }
  }

  logger.error("All Gemini model fallbacks failed:", lastError);
  return {
    resume: rawText,
    keywordsAdded: [],
    changesCount: 0,
    summary: "Optimized.",
  };
}
