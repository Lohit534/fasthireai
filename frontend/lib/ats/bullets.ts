/**
 * Canonical, section-aware bullet extraction + validation helpers.
 *
 * Shared by:
 *  - lib/ats/scorer.ts            (Impact score + "Missing Metrics" box)
 *  - components/BulletImprover.tsx (Interactive bullet improver list)
 *  - app/api/improve-bullet        (dual-pass verb + metric guarantee)
 *  - app/api/pre-check             (metric questions)
 *
 * Keeping ONE implementation guarantees the Missing Metrics box and the
 * Bullet Improver always evaluate exactly the same bullets with the same rules.
 */
import { extractActionVerbs } from "./keywords";

export const BULLET_MARKER_REGEX = /^\s*([•\-\*–—+\u2022\u25cf\u2043▸►→▪◦]|\d+[.)])\s*/;

/** Sections whose bullets ARE scored (work impact). */
const SCORABLE_SECTIONS = [
  "PROFESSIONAL EXPERIENCE", "WORK EXPERIENCE", "EXPERIENCE", "EMPLOYMENT HISTORY",
  "EMPLOYMENT", "WORK HISTORY", "CAREER HISTORY", "INTERNSHIPS", "INTERNSHIP",
  "INTERNSHIP EXPERIENCE", "RELEVANT EXPERIENCE", "PROJECTS", "PERSONAL PROJECTS",
  "ACADEMIC PROJECTS", "KEY PROJECTS", "PROJECT EXPERIENCE", "TECHNICAL PROJECTS",
];

/** Sections whose items are factual lists and must NEVER need verbs/metrics. */
const NON_SCORABLE_SECTIONS = [
  "CERTIFICATIONS", "CERTIFICATION", "CERTIFICATES", "LICENSES", "COURSES", "COURSEWORK",
  "RELEVANT COURSEWORK", "ACHIEVEMENTS", "KEY ACHIEVEMENTS", "AWARDS", "HONORS",
  "HONOURS", "EDUCATION", "ACADEMIC BACKGROUND", "ACADEMICS", "QUALIFICATIONS",
  "LANGUAGES", "LANGUAGES KNOWN", "LANGUAGES SPOKEN", "TECHNICAL SKILLS", "SKILLS",
  "CORE SKILLS", "KEY SKILLS", "SOFT SKILLS", "CORE COMPETENCIES", "TOOLS",
  "PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE", "CAREER OBJECTIVE", "PROFILE",
  "ABOUT ME", "INTERESTS", "HOBBIES", "EXTRA-CURRICULAR", "EXTRACURRICULAR ACTIVITIES",
  "VOLUNTEERING", "REFERENCES", "DECLARATION", "PERSONAL DETAILS", "PUBLICATIONS",
];

/** Weak openers that do NOT count as strong action verbs. */
const WEAK_OPENERS = new Set([
  "worked", "helped", "assisted", "involved", "participated", "handled", "tasked",
  "responsible", "used", "utilized", "tried", "attended", "learned", "did", "was", "were",
  "had", "got", "made", "gained", "exposed", "familiarized", "completed", "earned",
  "received", "awarded", "certified", "passed", "joined",
]);

/** Strong verbs (incl. irregular past + present forms for current roles). */
const STRONG_VERBS = new Set([
  "built", "led", "drove", "grew", "cut", "ran", "won", "wrote", "rebuilt", "oversaw",
  "spearheaded", "engineered", "developed", "implemented", "designed", "created",
  "managed", "architected", "optimized", "accelerated", "devised", "automated",
  "facilitated", "orchestrated", "refactored", "deployed", "scaled", "transformed",
  "delivered", "executed", "launched", "migrated", "integrated", "streamlined",
  "reduced", "increased", "improved", "boosted", "enhanced", "revamped", "modernized",
  "containerized", "analyzed", "established", "pioneered", "mentored", "coordinated",
  "collaborated", "secured", "debugged", "resolved", "crafted", "programmed", "coded",
  "trained", "fine-tuned", "researched", "prototyped", "shipped", "generated", "achieved",
  "maintained", "monitored", "configured", "administered", "validated", "tested",
  "conducted", "authored", "published", "presented", "negotiated", "consolidated",
  "standardized", "simplified", "restructured", "redesigned", "overhauled", "expanded",
  "minimized", "maximized", "eliminated", "lowered", "raised", "saved", "doubled", "tripled",
  "build", "lead", "develop", "design", "implement", "engineer", "architect", "manage",
  "optimize", "automate", "deploy", "deliver", "drive", "own", "create", "maintain",
]);

export interface ExtractedBullet {
  /** index of the line inside resumeText.split(/\r?\n/) */
  index: number;
  rawLine: string;
  cleanText: string;
  section: string;
}

function normalizeHeader(line: string): string {
  return line
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/[:\-–—|]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Returns canonical header if line is a section header, else null. */
export function detectSectionHeader(line: string): { name: string; scorable: boolean } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 50 || BULLET_MARKER_REGEX.test(trimmed)) return null;
  const upper = normalizeHeader(trimmed);
  const isAllCaps = trimmed === trimmed.toUpperCase();

  const matches = (list: string[]) =>
    list.find(
      (h) =>
        upper === h ||
        (isAllCaps && (upper.startsWith(h + " ") || upper.startsWith(h + " &") || upper.endsWith(" " + h))),
    );

  // Non-scorable checked first so "CERTIFICATIONS & ACHIEVEMENTS" etc. never leak in
  const non = matches(NON_SCORABLE_SECTIONS);
  if (non) return { name: non, scorable: false };
  const sc = matches(SCORABLE_SECTIONS);
  if (sc) return { name: sc, scorable: true };
  return null;
}

export function cleanBulletText(line: string): string {
  return line.replace(BULLET_MARKER_REGEX, "").replace(/\*\*/g, "").trim();
}

/**
 * Section-aware extraction of work-impact bullets (Experience, Internships, Projects).
 * Certifications, Languages, Education, Skills, Summary are ALWAYS ignored.
 * If the resume has no recognizable headers at all, falls back to all bullet lines.
 */
export function extractScorableBullets(resumeText: string): ExtractedBullet[] {
  const lines = (resumeText || "").split(/\r?\n/);
  const results: ExtractedBullet[] = [];
  let currentSection = "";
  let currentScorable = false;
  let sawAnyHeader = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const header = detectSectionHeader(trimmed);
    if (header) {
      sawAnyHeader = true;
      currentSection = header.name;
      currentScorable = header.scorable;
      return;
    }

    if (sawAnyHeader && !currentScorable) return;

    const isBullet = BULLET_MARKER_REGEX.test(line);
    const clean = cleanBulletText(trimmed);
    if (clean.length < 12) return;

    if (isBullet) {
      results.push({ index, rawLine: line, cleanText: clean, section: currentSection });
      return;
    }

    // Lines that lost their bullet marker during PDF extraction: only inside scorable
    // sections, must start with a strong verb, and must not look like a header row.
    if (
      sawAnyHeader &&
      currentScorable &&
      clean.length > 30 &&
      !/[|@]|https?:/i.test(clean) &&
      startsWithStrongVerb(clean)
    ) {
      results.push({ index, rawLine: line, cleanText: clean, section: currentSection });
    }
  });

  return results;
}

export function startsWithStrongVerb(text: string): boolean {
  const first = (cleanBulletText(text).split(/\s+/)[0] || "").toLowerCase().replace(/[^a-z-]/g, "");
  if (!first || WEAK_OPENERS.has(first)) return false;
  if (STRONG_VERBS.has(first)) return true;
  // Generic past-tense verb opener (e.g. "Revitalized", "Instrumented")
  return /^[a-z]{4,}ed$/.test(first);
}

/** A bullet passes the action-verb check if it opens with a strong verb or uses one. */
export function hasStrongActionVerb(text: string): boolean {
  const clean = cleanBulletText(text);
  if (startsWithStrongVerb(clean)) return true;
  return extractActionVerbs(clean).length > 0;
}
