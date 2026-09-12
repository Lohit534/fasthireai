import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../logger";

// Active supported Gemini models in priority order (best quality first)
const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
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
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const jsonSub = cleaned.substring(start, end + 1);
      try {
        return JSON.parse(jsonSub);
      } catch (_e2) {}

      // Repair unescaped newlines inside the "resume" field
      try {
        const repaired = jsonSub.replace(
          /"resume"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:keywordsAdded|bulletsRewritten|changesCount|summary)/i,
          (match, resumeVal) => {
            const escapedVal = resumeVal
              .replace(/\\/g, "\\\\")
              .replace(/"/g, '\\"')
              .replace(/\r?\n/g, "\\n")
              .replace(/\t/g, "\\t");
            const afterKey = match.split('", "')[1] || "keywordsAdded";
            return `"resume": "${escapedVal}", "${afterKey}`;
          }
        );
        return JSON.parse(repaired);
      } catch (_e3) {}
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
    // 1. Try official SDK first
    try {
      logger.info(`[gemini] Attempting generation with SDK model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.20,       // Lower = more deterministic, format-faithful
          maxOutputTokens: 8192,   // Raised from 4000 → handles long resumes without truncation
          responseMimeType: "application/json", // Force JSON-only output where supported
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      if (responseText && responseText.trim().length > 50) {
        const parsed = extractJSON(responseText);
        logger.info(`[gemini] Successfully generated optimization via ${modelName} (SDK)`);
        return parsed;
      }
    } catch (sdkError: any) {
      lastError = sdkError;
      logger.warn(`[gemini] SDK attempt failed for ${modelName}:`, sdkError?.message);
    }

    // 2. Direct REST fallback for the same model
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
              temperature: 0.20,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (restRes.ok) {
        const restJson = await restRes.json();
        const candidateText = restJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim().length > 50) {
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
