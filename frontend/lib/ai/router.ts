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

  // Skills — include all categories
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

  // Education — each entry on separate lines, dates clearly separated
  if (json.education?.length) {
    lines.push("EDUCATION");
    for (const edu of json.education) {
      // Degree on its own line (with year at end)
      lines.push(`${edu.degree}${edu.year ? " | " + edu.year : ""}`);
      // Institution and university on next line
      const instParts: string[] = [];
      if (edu.institution) instParts.push(edu.institution);
      if (edu.university && edu.university !== edu.institution) instParts.push(edu.university);
      if (instParts.length) lines.push(instParts.join(", "));
      // CGPA/percentage on its own line
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

  // Languages — each formatted as a bullet point item
  if (json.languages?.length) {
    lines.push("LANGUAGES");
    json.languages.forEach((lang: string) => {
      lines.push(`• ${lang}`);
    });
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function sanitizeResumeText(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Rejoin split compound tech terms
  const COMPOUND_TERMS: [RegExp, string][] = [
    [/My\s*\n+\s*SQL/gi, 'MySQL'],
    [/Type\s*\n+\s*Script/gi, 'TypeScript'],
    [/Java\s*\n+\s*Script/gi, 'JavaScript'],
    [/Post\s*\n+\s*gre\s*SQL/gi, 'PostgreSQL'],
    [/Spring\s*\n+\s*Boot/gi, 'Spring Boot'],
    [/Power\s*\n+\s*BI/gi, 'Power BI'],
    [/Node\s*\n+\s*js/gi, 'Node.js'],
    [/React\s*\n+\s*js/gi, 'React.js'],
    [/Next\s*\n+\s*js/gi, 'Next.js'],
    [/Mon\s*\n+\s*go\s*DB/gi, 'MongoDB'],
    [/Kube\s*\n+\s*rnetes/gi, 'Kubernetes'],
    [/Ten\s*\n+\s*sor\s*Flow/gi, 'TensorFlow'],
    [/Git\s*\n+\s*Hub/gi, 'GitHub'],
    [/VS\s*\n+\s*Code/gi, 'VS Code'],
    [/Chat\s*\n+\s*GPT/gi, 'ChatGPT'],
    [/CI\s*\n+\s*CD/gi, 'CI/CD'],
    [/De\s*\n+\s*vOps/gi, 'DevOps'],
  ];

  for (const [pattern, replacement] of COMPOUND_TERMS) {
    result = result.replace(pattern, replacement);
  }

  // 2. Remove LaTeX & Markdown artifacts safely without destroying newlines
  result = result
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/\{|\}/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{2}([^_]+)_{2}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 3. Rejoin broken words split across lines within lower-case sentence continuations
  result = result.replace(/([a-z,])\r?\n([a-z])/g, '$1 $2');

  // 4. Normalize bullets
  result = result.replace(/^[\s]*[-–—·○►▪✓→]\s*/gm, '• ');

  // 5. Section headers: Ensure double newlines before section headers ONLY when on boundary
  const SECTIONS = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE',
    'TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS', 'KEY SKILLS',
    'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT HISTORY', 'INTERNSHIP', 'INTERNSHIPS', 'EXPERIENCE',
    'PROJECTS', 'PERSONAL PROJECTS',
    'EDUCATION', 'ACADEMIC BACKGROUND',
    'CERTIFICATIONS', 'ACHIEVEMENTS', 'AWARDS',
    'LANGUAGES'
  ];

  for (const sec of SECTIONS) {
    const reg = new RegExp(`(^|\\n)\\s*(${sec})\\b`, 'gi');
    result = result.replace(reg, '\n\n$2\n');
  }

  // 6. Clean spacing
  result = result
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return result;
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

const GROQ_MODELS = [
  process.env.GROQ_MODEL,
  "llama-3.1-8b-instant",
  "llama-3.3-70b-specdec",
  "qwen-2.5-32b",
  "deepseek-r1-distill-llama-70b",
  "gemma2-9b-it",
].filter(Boolean) as string[];

export async function callAIText(prompt: string): Promise<string> {
  const apiKeyGroq = process.env.GROQ_API_KEY || "";
  if (apiKeyGroq) {
    for (const modelName of GROQ_MODELS) {
      try {
        logger.info(`AI Router: Generating text response via Groq (${modelName})...`);
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKeyGroq}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const content = json.choices?.[0]?.message?.content;
          if (content) return content.trim();
        }
      } catch (e) {
        logger.warn(`AI Router: Groq text call with ${modelName} failed, trying next...`, e);
      }
    }
  }

  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    const GEMINI_MODELS = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    for (const modelName of GEMINI_MODELS) {
      try {
        logger.info(`AI Router: Generating text response via Gemini (${modelName})...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text.trim();
      } catch (e) {
        logger.warn(`AI Router: Gemini text generation with ${modelName} failed, trying next...`, e);
      }
    }
  }

  throw new Error("AI service unavailable for text generation.");
}

// Raw Groq call returning string content (with multi-model fallback)
async function callGroqRaw(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || "";
  if (!apiKey) throw new Error("Groq API key is missing");

  let lastError: any = null;

  for (const modelName of GROQ_MODELS) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.25,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API (${modelName}) returned status ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err: any) {
      lastError = err;
      logger.warn(`Groq model ${modelName} failed, trying fallback model...`, err?.message);
    }
  }

  throw lastError || new Error("All Groq model attempts failed.");
}

// Raw Gemini call returning string content
async function callGeminiRaw(prompt: string): Promise<string> {
  const { callGemini } = await import("./gemini");
  const result = await callGemini(prompt, "");
  // callGemini returns a parsed object — re-stringify it so parseAIResponse handles it uniformly
  return JSON.stringify(result);
}
