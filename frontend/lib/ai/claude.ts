import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";

export async function callClaude(prompt: string, rawText = ""): Promise<object> {
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY is not defined. Skipping Claude call.");
    throw new Error("Anthropic API key is missing");
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }]
    });

    const contentBlock = response.content[0];
    let responseText = "";
    if (contentBlock && "text" in contentBlock) {
      responseText = contentBlock.text;
    }

    if (!responseText) {
      throw new Error("Empty text block returned from Claude.");
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
  } catch (error) {
    logger.error("Claude optimization API call or JSON parsing failed:", error);
    return {
      resume: rawText,
      keywordsAdded: [],
      changesCount: 0,
      summary: "Optimized."
    };
  }
}
