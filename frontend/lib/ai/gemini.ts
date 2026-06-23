import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../logger";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function callGemini(prompt: string, rawText = ""): Promise<object> {
  if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not defined. Using fallback values.");
    return {
      resume: rawText,
      keywordsAdded: [],
      changesCount: 0,
      summary: "Optimized (Gemini key missing)."
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 3000,
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("Empty response received from Gemini.");
    }

    // Strip markdown fences
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\r?\n?/i, "")
        .replace(/\r?\n?```$/i, "")
        .trim();
    }

    return JSON.parse(cleanedText);
  } catch (error: any) {
    logger.error("Gemini optimization API call or JSON parsing failed:", error);
    return {
      resume: rawText,
      keywordsAdded: [],
      changesCount: 0,
      summary: `Optimized (Gemini API error: ${error?.message || "unknown"}).`
    };
  }
}
