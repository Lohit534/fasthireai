import { callGroq } from "./groq";
import { callGemini } from "./gemini";
import { logger } from "../logger";
import type { ResumeJSON } from "@/types/resume";

export interface AIResult {
  resume: string;           // Plain text serialized from JSON (for display/scoring)
  resumeJSON: ResumeJSON | null;  // Structured JSON (for PDF rendering)
  keywordsAdded: string[];
  changesCount: number;
  summary: string;
  detectedJobTitle?: string;
  detectedCompany?: string;
}

// Serialize ResumeJSON back to plain text for display and ATS scoring
export function serializeResumeJSONToText(json: ResumeJSON): string {
  const lines: string[] = [];

  // Header
  const h = json.header;
  lines.push(h.name || "");
  const contactParts: string[] = [];
  if (h.email) contactParts.push(h.email);
  if (h.phone) contactParts.push(h.phone);
  if (h.location) contactParts.push(h.location);
  if (contactParts.length) lines.push(contactParts.join(" | "));
  const linkParts: string[] = [];
  if (h.linkedin) linkParts.push(h.linkedin);
  if (h.github) linkParts.push(h.github);
  if (h.portfolio) linkParts.push(h.portfolio);
  if (linkParts.length) lines.push(linkParts.join(" | "));
  lines.push("");

  // Summary
  if (json.summary) {
    lines.push("PROFESSIONAL SUMMARY");
    lines.push(json.summary);
    lines.push("");
  }

  // Skills
  if (json.skills?.length) {
    lines.push("TECHNICAL SKILLS");
    for (const s of json.skills) {
      lines.push(`${s.category}: ${s.items.join(", ")}`);
    }
    lines.push("");
  }

  // Experience
  if (json.experience?.length) {
    lines.push("PROFESSIONAL EXPERIENCE");
    for (const exp of json.experience) {
      lines.push(`${exp.role} | ${exp.company}${exp.location ? " | " + exp.location : ""}`);
      lines.push(exp.duration);
      for (const b of exp.bullets) lines.push(`• ${b}`);
      lines.push("");
    }
  }

  // Projects
  if (json.projects?.length) {
    lines.push("PROJECTS");
    for (const proj of json.projects) {
      const techStr = proj.stack?.join(", ") || "";
      lines.push(`${proj.title}${techStr ? " | " + techStr : ""}${proj.link ? " | " + proj.link : ""}`);
      for (const b of proj.bullets) lines.push(`• ${b}`);
      lines.push("");
    }
  }

  // Education
  if (json.education?.length) {
    lines.push("EDUCATION");
    for (const edu of json.education) {
      lines.push(`${edu.degree}`);
      const instLine = [edu.institution, edu.university].filter(Boolean).join(", ");
      lines.push(`${instLine}      ${edu.year}`);
      if (edu.cgpa) lines.push(`CGPA: ${edu.cgpa}`);
      lines.push("");
    }
  }

  // Certifications
  if (json.certifications?.length) {
    lines.push("CERTIFICATIONS");
    for (const c of json.certifications) lines.push(`• ${c}`);
    lines.push("");
  }

  // Achievements
  if (json.achievements?.length) {
    lines.push("ACHIEVEMENTS");
    for (const a of json.achievements) lines.push(`• ${a}`);
    lines.push("");
  }

  // Languages
  if (json.languages?.length) {
    lines.push("LANGUAGES");
    lines.push(json.languages.join(", "));
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function sanitizeResumeText(text: string): string {
  return text
    .replace(/\\\w+\{([^}]*)\}/g, "$1")
    .replace(/\\\w+/g, "")
    .replace(/\{|\}/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/_{2}([^_]+)_{2}/g, "$1")
    .replace(/\\begin\{[^}]*\}/g, "")
    .replace(/\\end\{[^}]*\}/g, "")
    .replace(/^[\s]*[-–—]\s/gm, "• ")
    .replace(/^[\s]*\\item\s/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseAIResponse(raw: string, fallbackText: string): AIResult {
  const defaultFallback: AIResult = {
    resume: fallbackText,
    resumeJSON: null,
    keywordsAdded: [],
    changesCount: 0,
    summary: "Optimized.",
    detectedJobTitle: "Optimized Resume",
    detectedCompany: "General Application",
  };

  let cleaned = raw.trim();
  // Strip markdown fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\r?\n?/i, "")
      .replace(/\r?\n?```$/i, "")
      .trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from the string
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        logger.warn("[router] Could not parse AI JSON response, using fallback text.");
        return defaultFallback;
      }
    } else {
      logger.warn("[router] No JSON object found in AI response, using fallback text.");
      return defaultFallback;
    }
  }

  // If it looks like the old flat schema (has "resume" string directly)
  if (typeof parsed?.resume === "string" && !parsed?.header) {
    return {
      resume: sanitizeResumeText(parsed.resume),
      resumeJSON: null,
      keywordsAdded: parsed.keywordsAdded || [],
      changesCount: parsed.changesCount || 0,
      summary: parsed.summaryChanges || parsed.summary || "Optimized.",
      detectedJobTitle: parsed.detectedJobTitle,
      detectedCompany: parsed.detectedCompany,
    };
  }

  // New structured ResumeJSON schema
  const json = parsed as ResumeJSON;
  if (!json?.header?.name) {
    logger.warn("[router] ResumeJSON missing header.name, using fallback text.");
    return defaultFallback;
  }

  const plainText = serializeResumeJSONToText(json);

  return {
    resume: sanitizeResumeText(plainText),
    resumeJSON: json,
    keywordsAdded: json.keywordsAdded || [],
    changesCount: json.changesCount || 0,
    summary: json.summaryChanges || "Optimized.",
    detectedJobTitle: json.detectedJobTitle,
    detectedCompany: json.detectedCompany,
  };
}

export async function callAI(prompt: string, rawText = ""): Promise<AIResult> {
  const defaultFallback: AIResult = {
    resume: rawText,
    resumeJSON: null,
    keywordsAdded: [],
    changesCount: 0,
    summary: "Optimized.",
    detectedJobTitle: "Optimized Resume",
    detectedCompany: "General Application",
  };

  const hasGroq = !!process.env.GROQ_API_KEY;

  if (hasGroq) {
    try {
      logger.info("AI Router: Routing optimization request to Groq...");
      // Call raw — we do our own JSON parsing
      const raw = await callGroqRaw(prompt);
      const result = parseAIResponse(raw, rawText);
      logger.info("AI Router: Successfully optimized using Groq.");
      return result;
    } catch (error) {
      logger.warn("AI Router: Groq call failed, falling back to Gemini.", error);
    }
  }

  try {
    logger.info("AI Router: Routing optimization request to Gemini...");
    const raw = await callGeminiRaw(prompt);
    const result = parseAIResponse(raw, rawText);
    logger.info("AI Router: Successfully optimized using Gemini.");
    return result;
  } catch (error: any) {
    logger.error("AI Router: Critical failure. Both Groq and Gemini calls failed.", error);
    return {
      ...defaultFallback,
      summary: `Optimized (AI Critical Failure: ${error?.message || "unknown"}).`,
      resume: sanitizeResumeText(rawText),
    };
  }
}

// Raw Groq call returning string content (no JSON.parse here)
async function callGroqRaw(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || "";
  if (!apiKey) throw new Error("Groq API key is missing");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty content returned from Groq.");
  return content;
}

// Raw Gemini call returning string content
async function callGeminiRaw(prompt: string): Promise<string> {
  const { callGemini } = await import("./gemini");
  const result = await callGemini(prompt, "");
  // callGemini returns a parsed object — re-stringify it so parseAIResponse handles it uniformly
  return JSON.stringify(result);
}
