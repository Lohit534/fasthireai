/**
 * Universal resume format helpers.
 *
 *  - estimateYearsOfExperience(): dynamic experience detection from real date ranges
 *  - getPageBudget(): fresher / <5 yrs => strictly 1 page, 5+ yrs => up to 2 pages
 *  - sanitizeOptimizedResume(): removes AI hallucinations / unwanted text
 *    (fake "University Name" suffixes, literal placeholders, leaked internal
 *    "USER VERIFIED" blocks, duplicated institution segments) before the text
 *    reaches the live preview, PDF and DOCX exporters.
 */
import { detectSectionHeader } from "./ats/bullets";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const EXPERIENCE_HEADERS = new Set([
  "PROFESSIONAL EXPERIENCE", "WORK EXPERIENCE", "EXPERIENCE", "EMPLOYMENT HISTORY",
  "EMPLOYMENT", "WORK HISTORY", "CAREER HISTORY", "RELEVANT EXPERIENCE",
]);

function toMonthIndex(monthStr: string | undefined, year: number, isEnd: boolean): number {
  const m = monthStr ? MONTHS[monthStr.slice(0, 4).toLowerCase().replace(/[^a-z]/g, "")] ?? MONTHS[monthStr.slice(0, 3).toLowerCase()] : undefined;
  return year * 12 + (m !== undefined ? m : isEnd ? 11 : 0);
}

/** Dynamically estimates total professional (non-internship) experience in years. */
export function estimateYearsOfExperience(resumeText: string): number {
  const text = resumeText || "";
  const lines = text.split(/\r?\n/);

  // Collect experience-section lines (fallback: whole resume when no headers)
  let inExp = false;
  let sawHeader = false;
  const expLines: string[] = [];
  for (const line of lines) {
    const header = detectSectionHeader(line);
    if (header) {
      sawHeader = true;
      inExp = EXPERIENCE_HEADERS.has(header.name);
      continue;
    }
    if (inExp) expLines.push(line);
  }
  const scope = sawHeader ? expLines : lines;

  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const rangeRegex =
    /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2})\s*(?:[-–—]|to)\s*(?:(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2})|(present|current|now|till date|ongoing))/gi;

  const intervals: Array<[number, number]> = [];
  scope.forEach((line, i) => {
    // Skip internships / trainee roles when counting professional years
    const context = `${scope[i - 1] || ""} ${line}`.toLowerCase();
    if (/\bintern(ship)?\b|\btrainee\b|\bapprentice\b/.test(context)) return;
    let m: RegExpExecArray | null;
    rangeRegex.lastIndex = 0;
    while ((m = rangeRegex.exec(line)) !== null) {
      const start = toMonthIndex(m[1], parseInt(m[2], 10), false);
      const end = m[5] ? nowIdx : toMonthIndex(m[3], parseInt(m[4], 10), true);
      if (end >= start && end - start < 12 * 45) intervals.push([start, Math.min(end, nowIdx)]);
    }
  });

  // Merge overlapping intervals so concurrent roles are not double counted
  intervals.sort((a, b) => a[0] - b[0]);
  let totalMonths = 0;
  let cur: [number, number] | null = null;
  for (const iv of intervals) {
    if (!cur) cur = [...iv] as [number, number];
    else if (iv[0] <= cur[1]) cur[1] = Math.max(cur[1], iv[1]);
    else {
      totalMonths += cur[1] - cur[0] + 1;
      cur = [...iv] as [number, number];
    }
  }
  if (cur) totalMonths += cur[1] - cur[0] + 1;
  const computed = totalMonths / 12;

  // Explicit statements like "6+ years of experience"
  const explicit = Array.from(text.matchAll(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|industry\s+|hands-on\s+)?experience/gi))
    .map((x) => parseInt(x[1], 10))
    .filter((n) => n > 0 && n < 45);
  const explicitMax = explicit.length ? Math.max(...explicit) : 0;

  return Math.round(Math.max(computed, explicitMax) * 10) / 10;
}

export interface PageBudget {
  years: number;
  maxPages: 1 | 2;
  level: "fresher" | "early" | "experienced";
  instructions: string;
}

/** Fresher / under 5 years => strictly 1 page. 5+ years => up to 2 pages. */
export function getPageBudget(resumeText: string): PageBudget {
  const years = estimateYearsOfExperience(resumeText);
  if (years >= 5) {
    return {
      years,
      maxPages: 2,
      level: "experienced",
      instructions:
        `Candidate has ~${years} years of professional experience => UP TO 2 PAGES (A4).\n` +
        "- 4-6 bullets for the 2 most recent roles, 2-4 bullets for older roles\n" +
        "- Max 3 bullets per project; include only the most JD-relevant projects\n" +
        "- Professional Summary 3 sentences (60-80 words)\n" +
        "- Target total length: 650-1000 words. Never pad with filler to fill space.",
    };
  }
  return {
    years,
    maxPages: 1,
    level: years < 1 ? "fresher" : "early",
    instructions:
      `Candidate is ${years < 1 ? "a fresher" : `early-career (~${years} years)`} => STRICTLY 1 PAGE (A4). This is mandatory.\n` +
      "- Max 3-4 bullets per role and max 3 bullets per project\n" +
      "- Every bullet ONE line where possible (14-22 words)\n" +
      "- Keep the 3-4 most JD-relevant projects only if there are more\n" +
      "- Professional Summary 3 sentences (45-65 words)\n" +
      "- Target total length: 380-560 words. Never pad with filler.",
  };
}

const PLACEHOLDER_SEGMENT = /^(?:university name|institution name|college name|school name|company name|city,?\s*country|city|country|location|n\/a|na|tbd|\[[^\]]*\]|_+)$/i;

/** Removes hallucinated / unwanted text the AI may add (all exporters read this text). */
export function sanitizeOptimizedResume(optimized: string, original: string): string {
  if (!optimized) return optimized;
  const originalLower = (original || "").toLowerCase();
  const lines = optimized.split(/\r?\n/);
  const out: string[] = [];
  let section = "";

  for (const rawLine of lines) {
    let line = rawLine;

    // Leaked internal blocks from the enrichment step
    if (/USER[\s-]*VERIFIED|^\s*\[Verified [^\]]*\]\s*$|^-{3,}.*-{3,}$/i.test(line.trim())) continue;

    const header = detectSectionHeader(line);
    if (header) section = header.name;

    const isEducation = /EDUCATION|ACADEM|QUALIFICATION/.test(section) && !header;
    if (isEducation && line.trim()) {
      // Split by commas but keep pipes (degree | dates) intact
      const [left, ...rest] = line.split(/\s+\|\s+/);
      const segments = left.split(/\s*,\s*/).filter((s) => s.length > 0);
      const seen = new Set<string>();
      const kept: string[] = [];
      for (const seg of segments) {
        const s = seg.trim();
        const key = s.toLowerCase();
        if (!s || PLACEHOLDER_SEGMENT.test(s) || seen.has(key)) continue;
        // Fabricated parent university / extra institution not present in the original resume
        if (kept.length > 0 && /\b(university|vidyapeeth|vishwavidyalaya|deemed|affiliated|autonomous)\b/i.test(s)) {
          const distinctive = key
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length > 2 && !/^(university|universit|the|and|for|affiliated|autonomous|deemed|to)$/.test(w));
          const existsInOriginal = originalLower.includes(key) || (distinctive.length > 0 && distinctive.some((w) => originalLower.includes(w)));
          if (!existsInOriginal) continue;
        }
        seen.add(key);
        kept.push(s);
      }
      line = [kept.join(", "), ...rest].filter((p) => p && p.trim()).join(" | ").replace(/\s{2,}/g, " ");
      if (!line.trim()) continue;
    }

    // Drop standalone literal placeholders anywhere
    if (PLACEHOLDER_SEGMENT.test(line.trim().replace(/^[•\-*]\s*/, ""))) continue;

    out.push(line.replace(/[ \t]+([,.])(\s|$)/g, "$1$2"));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
