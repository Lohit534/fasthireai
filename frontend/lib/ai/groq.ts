import { logger } from "../logger";

export async function callGroq(prompt: string, rawText = ""): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY || "";
  if (!apiKey) {
    logger.warn("GROQ_API_KEY is not defined. Skipping Groq call.");
    throw new Error("Groq API key is missing");
  }

  try {
    logger.info("Groq API: Sending optimization request to llama-3.3-70b-versatile...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    const responseText = json.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error("Empty content returned from Groq.");
    }

    // Strip markdown fences if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\r?\n?/i, "")
        .replace(/\r?\n?```$/i, "")
        .trim();
    }

    return JSON.parse(cleanedText);
  } catch (error) {
    logger.error("Groq optimization API call or JSON parsing failed:", error);
    return {
      resume: rawText,
      keywordsAdded: [],
      changesCount: 0,
      summary: "Optimized."
    };
  }
}
