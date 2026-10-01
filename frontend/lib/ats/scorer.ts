import axios from "axios";
import { ATSScore } from "../../types";
import { logger } from "../logger";
import { extractKeywords, extractTechTerms, extractActionVerbs } from "./keywords";

const COMMON_TITLES = [
  "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Developer",
  "Developer", "Data Scientist", "Data Analyst", "Product Manager", "Project Manager",
  "Business Analyst", "System Administrator", "DevOps Engineer", "QA Engineer",
  "Mobile Developer", "UI/UX Designer", "Software Developer", "Web Developer",
  "Android Developer", "iOS Developer", "Cloud Engineer", "Site Reliability Engineer"
];

function normalizeWord(word: string): string {
  return word
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '')
    .toLowerCase()
    .trim();
}

// Common tech synonyms/aliases for robust matching
const TECH_SYNONYMS: Record<string, string[]> = {
  "react": ["react.js", "reactjs"],
  "node": ["node.js", "nodejs"],
  "next": ["next.js", "nextjs"],
  "vue": ["vue.js", "vuejs"],
  "typescript": ["ts"],
  "javascript": ["js"],
  "postgresql": ["postgres", "psql"],
  "kubernetes": ["k8s"],
  "docker": ["containerization", "containers"],
  "aws": ["amazon web services"],
  "gcp": ["google cloud", "google cloud platform"],
  "golang": ["go"],
  "rest": ["restful", "rest api", "restful apis"],
  "ci/cd": ["cicd", "continuous integration", "continuous deployment"],
  "mongodb": ["mongo"],
};

/**
 * Checks if a bullet contains quantifiable, measurable metrics
 */
export function hasQuantifiedMetric(bullet: string): boolean {
  if (!bullet || bullet.length < 5) return false;

  // 1. Percentages (e.g. 35%, 12.5%, 100 percent)
  if (/\b\d+(?:\.\d+)?\s*%|\b\d+\s*percent\b/i.test(bullet)) return true;

  // 2. Scale / Multipliers (e.g. 10k+, 2M+, 500+, 2x, 10x, 10,000+)
  if (/\b\d[\d,\.]*\s*(?:k|m|b|million|billion|thousand|\+|x)\b|\b\d[\d,\.]*\+/i.test(bullet)) return true;

  // 3. Numbers with relevant domain nouns (e.g. 50 users, 15 microservices, 25 endpoints, 10,000 tasks/min)
  if (/\b\d[\d,\.]*\s*(?:users?|customers?|clients?|requests?|queries|endpoints?|microservices?|transactions?|records?|bugs?|issues?|pipelines?|features?|projects?|tasks?|services?|datasets?|lines?)\b/i.test(bullet)) return true;

  // 4. Performance, Latency & Time (e.g. 45ms, 2 seconds, 3 weeks, 4+ years)
  if (/\b\d[\d,\.]*\s*(?:ms|sec|seconds?|mins?|minutes?|hours?|hrs?|days?|weeks?|months?|years?)\b/i.test(bullet)) return true;

  // 5. Financial metrics (e.g. $500k, $10,000, 20% margin, $2M)
  if (/\$[\d,]+(?:\.\d+)?|\b\d+%\s*(?:revenue|cost|margin|growth|savings?)\b/i.test(bullet)) return true;

  // 6. Team size / Leadership scope (e.g. team of 6, led 4 engineers)
  if (/\bteam\s+of\s+\d+\b|\b\d+\s*(?:engineers?|developers?|members?|peers?)\b/i.test(bullet)) return true;

  // 7. Generic numbers > 1 in context (e.g. over 50, by 25, 3x)
  if (/\b(?:from|to|by|over|top|exceeding)\s+\d+/i.test(bullet) || /\b\d+x\b/i.test(bullet)) return true;

  return false;
}

export function localScore(resumeText: string, jobDescription: string): ATSScore {
  logger.info("Executing dynamic ATS scoring calculation...");

  const resumeLower = (resumeText || "").toLowerCase();
  const jdLower = (jobDescription || "").toLowerCase();

  // ── 1. DYNAMIC KEYWORD EXTRACTION & MATCHING ────────────────────────────
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);
  const jdTechTerms = extractTechTerms(jobDescription);
  const resumeTechTerms = extractTechTerms(resumeText);

  const foundKeywordsSet = new Set<string>();
  const missingKeywordsSet = new Set<string>();

  // Evaluate technical keywords and phrases dynamically
  const allTargetKeywords = Array.from(new Set([...jdTechTerms, ...jdKeywords]))
    .filter(k => k.length > 2 && !/^\d+$/.test(k));

  for (const targetKw of allTargetKeywords) {
    const kwLower = targetKw.toLowerCase();
    let isMatched = false;

    if (resumeKeywords.has(targetKw) || resumeLower.includes(kwLower)) {
      isMatched = true;
    } else {
      // Check stemming & aliases
      const normTarget = normalizeWord(kwLower);
      if ([...resumeKeywords].some(rk => normalizeWord(rk) === normTarget)) {
        isMatched = true;
      } else {
        // Check known tech synonyms
        const synonyms = TECH_SYNONYMS[kwLower] || [];
        for (const syn of synonyms) {
          if (resumeLower.includes(syn)) {
            isMatched = true;
            break;
          }
        }
      }
    }

    if (isMatched) {
      foundKeywordsSet.add(targetKw);
    } else {
      // Prioritize substantial technical keywords and domain phrases
      const isTech = jdTechTerms.includes(targetKw);
      const isPhrase = kwLower.includes(" ") || targetKw.length > 3;
      if (isTech || isPhrase) {
        missingKeywordsSet.add(targetKw);
      }
    }
  }

  const foundKeywords = Array.from(foundKeywordsSet);
  const missingKeywords = Array.from(missingKeywordsSet);

  // Dynamic Keyword Match calculation:
  // Industry ATS benchmark: matches evaluated against target core skills quota (8–14 skills)
  const targetCoreSkills = Math.max(5, Math.min(14, jdTechTerms.length || allTargetKeywords.length || 8));
  const coreMatched = foundKeywords.length;
  const matchRatio = Math.min(1.0, coreMatched / targetCoreSkills);
  
  // Pure ratio-based — no flat bonus just for having any match
  const keywordMatch = Math.min(97, Math.max(10, Math.round(matchRatio * 90)));

  // ── 2. DYNAMIC SEMANTIC & ROLE ALIGNMENT ────────────────────────────────
  // Check target job titles against candidate resume headline/summary
  let titleScore = 10;
  for (const title of COMMON_TITLES) {
    if (new RegExp(`\\b${title}\\b`, "i").test(jdLower)) {
      if (new RegExp(`\\b${title}\\b`, "i").test(resumeLower)) {
        titleScore = 25;
        break;
      }
    }
  }

  // Tech stack domain overlap
  const targetTechCount = Math.max(3, Math.min(10, jdTechTerms.length));
  const techMatches = jdTechTerms.filter(t => resumeLower.includes(t.toLowerCase())).length;
  const techRatio = Math.min(1.0, techMatches / targetTechCount);
  const techScore = Math.round(techRatio * 50);

  // Summary & narrative alignment
  const hasSummary = /\b(summary|objective|profile|about me)\b/i.test(resumeText);
  const summaryScore = hasSummary ? 20 : 5;

  const semanticMatch = Math.min(97, Math.max(15, Math.round(titleScore + techScore + summaryScore)));

  // ── 3. DYNAMIC IMPACT BULLETS & MISSING METRICS DETECTION ──────────────
  const rawLines = (resumeText || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // Track current section so we never flag certifications, education or languages as missing metrics!
  let currentScanSection = "";
  const bulletLines: string[] = [];
  
  for (const line of rawLines) {
    const upper = line.toUpperCase().trim();
    if (["CERTIFICATIONS", "CERTIFICATION", "ACHIEVEMENTS", "AWARDS", "EDUCATION", "LANGUAGES"].some(s => upper === s || upper.startsWith(s + " "))) {
      currentScanSection = upper;
      continue;
    }
    if (["EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "PROJECTS", "PERSONAL PROJECTS"].some(s => upper === s || upper.startsWith(s + " "))) {
      currentScanSection = upper;
    }

    if (currentScanSection.startsWith("CERT") || currentScanSection.startsWith("EDU") || currentScanSection.startsWith("LANG") || currentScanSection.startsWith("ACHIEV")) {
      continue;
    }

    const isBullet = /^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/.test(line);
    if (isBullet) {
      bulletLines.push(line);
      continue;
    }
    if (line.includes("@") || line.includes("http") || line.includes("|") || line.endsWith(":")) continue;
    if (line === line.toUpperCase() && line.length < 40) continue;
    if (extractActionVerbs(line).length > 0) {
      bulletLines.push(line);
    }
  }

  const missingMetrics: string[] = [];
  let scoreSum = 0;
  let quantifiedBulletsCount = 0;

  for (const rawBullet of bulletLines) {
    const cleanBullet = rawBullet.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "").trim();
    if (cleanBullet.length < 8) continue;

    const verbs = extractActionVerbs(cleanBullet);
    const startsWithActionVerb = /^(built|engineered|developed|implemented|designed|created|led|managed|architected|optimized|spearheaded|accelerated|devised|automated|facilitated|orchestrated|injected|refactored|deployed|scaled|transformed|delivered|executed|launched|migrated)\b/i.test(cleanBullet);
    const hasVerb = verbs.length > 0 || startsWithActionVerb;
    const hasMetric = hasQuantifiedMetric(cleanBullet);

    if (hasMetric) {
      quantifiedBulletsCount++;
      if (hasVerb) {
        scoreSum += 100; // Perfect impact bullet
      } else {
        scoreSum += 88;  // Quantified outcome present
      }
    } else {
      // Missing measurable metrics: record bullet to highlight
      missingMetrics.push(cleanBullet);
      if (hasVerb) {
        scoreSum += 65;  // Action verb but missing metric
      } else {
        scoreSum += 40;  // Lacks both action verb and metric
      }
    }
  }

  const totalBulletsCount = Math.max(1, bulletLines.length);
  const metricCoveragePercent = Math.round((quantifiedBulletsCount / totalBulletsCount) * 100);
  const impactBullets = Math.min(100, Math.max(10, Math.round(scoreSum / totalBulletsCount)));

  // ── 4. DYNAMIC FORMATTING & STRUCTURE ───────────────────────────────────
  let formatting = 10;
  const sectionChecks: [RegExp, number][] = [
    [/\b(experience|work history|employment|career|positions? held)\b/i, 20],
    [/\b(education|academic|college|university|degree|bachelor|master|phd)\b/i, 20],
    [/\b(skills|technical skills|technologies|tools|expertise|proficient)\b/i, 20],
    [/\b(projects?|portfolio|work samples?)\b/i, 10],
    [/\b(summary|profile|objective|about me)\b/i, 10],
    [/@[a-z0-9]/i, 10],
    [/\b\d{10}\b|\+\d{1,3}[\s\-]?\d/i, 10],
  ];

  for (const [pattern, pts] of sectionChecks) {
    if (pattern.test(resumeText)) formatting += pts;
  }
  formatting = Math.min(100, formatting);

  // ── 5. PURE DYNAMIC OVERALL SCORE ────────────────────────────────────────
  // Weighted composite — honest scoring, no hidden floors
  // Poor keyword match (< 30%) will produce scores in the 35-55 range
  const overall = Math.min(97, Math.max(10, Math.round(
    keywordMatch    * 0.35 +
    semanticMatch   * 0.25 +
    impactBullets   * 0.25 +
    formatting      * 0.15
  )));

  const extractedSkills = Array.from(new Set([...resumeTechTerms, ...foundKeywords]));
  const extractedTitles: string[] = [];
  for (const title of COMMON_TITLES) {
    if (new RegExp(`\\b${title}\\b`, "i").test(resumeText)) extractedTitles.push(title);
  }

  return {
    overall,
    semanticMatch,
    keywordMatch,
    impactBullets,
    formatting,
    extractedSkills,
    extractedTitles,
    missingKeywords,
    foundKeywords,
    missingMetrics,
    quantifiedCount: quantifiedBulletsCount,
    totalBulletsCount: bulletLines.length,
    metricCoveragePercent,
  };
}

export async function scoreResume(
  resumeText: string,
  jobDescription: string,
  _scoreBefore?: number,
  bulletImprovementsCount?: number
): Promise<ATSScore> {
  // Purely dynamic score calculation based on real content
  const score = localScore(resumeText, jobDescription);

  // Dynamically reward verified bullet improvements made by the candidate
  if (bulletImprovementsCount && bulletImprovementsCount > 0) {
    score.overall = Math.min(98, score.overall + bulletImprovementsCount * 1);
    score.impactBullets = Math.min(100, score.impactBullets + bulletImprovementsCount * 2);
  }

  return score;
}
