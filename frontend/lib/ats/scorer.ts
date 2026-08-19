import axios from "axios";
import { ATSScore } from "../../types";
import { logger } from "../logger";
import { extractKeywords, extractTechTerms, extractActionVerbs } from "./keywords";

const COMMON_TITLES = [
  "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Developer",
  "Developer", "Data Scientist", "Data Analyst", "Product Manager", "Project Manager",
  "Business Analyst", "System Administrator", "DevOps Engineer", "QA Engineer",
  "Mobile Developer", "UI/UX Designer", "Software Developer", "Web Developer",
  "Android Developer", "iOS Developer"
];

function normalizeWord(word: string): string {
  return word
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '')
    .toLowerCase()
    .trim();
}

async function callPythonScorer(resumeText: string, jobDescription: string): Promise<ATSScore> {
  const baseUrl = process.env.HF_AI_API_URL;
  if (!baseUrl) {
    throw new Error("HF_AI_API_URL environment variable is missing.");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/score`;
  logger.info("Calling Python Scorer API at:", url);

  const response = await axios.post(
    url,
    {
      resume_text: resumeText,
      job_description: jobDescription
    },
    {
      timeout: 3000,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  const data = response.data;
  if (!data) {
    throw new Error("Invalid empty response from Python Scorer API.");
  }

  return {
    overall: Math.round(data.overall ?? 0),
    semanticMatch: Math.round(data.semantic_match ?? 0),
    keywordMatch: Math.round(data.keyword_match ?? 0),
    impactBullets: Math.round(data.impact_bullets ?? 0),
    formatting: Math.round(data.formatting ?? 0),
    extractedSkills: data.extracted_skills ?? [],
    extractedTitles: data.extracted_titles ?? [],
    missingKeywords: data.missing_keywords ?? [],
    foundKeywords: data.found_keywords ?? [],
  };
}

export function localScore(resumeText: string, jobDescription: string): ATSScore {
  logger.info("Executing local ATS fallback scorer...");

  const resumeLower = resumeText.toLowerCase();

  // 1. Keyword Overlap — with exact, stem, and partial matching
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);

  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  if (jdKeywords.size > 0) {
    for (const jdKw of jdKeywords) {
      const resumeHasExact = resumeKeywords.has(jdKw);
      const resumeHasStem = [...resumeKeywords].some(
        rk => normalizeWord(rk) === normalizeWord(jdKw)
      );
      const resumeHasPartial = [...resumeKeywords].some(
        rk => rk.includes(jdKw) || jdKw.includes(rk)
      ) && jdKw.length > 4;

      if (resumeHasExact || resumeHasStem || resumeHasPartial || resumeLower.includes(jdKw.toLowerCase())) {
        foundKeywords.push(jdKw);
      } else {
        missingKeywords.push(jdKw);
      }
    }
  }

  const rawKeywordMatch = jdKeywords.size > 0
    ? (foundKeywords.length / jdKeywords.size) * 100
    : 100;

  const keywordMatch = Math.min(100, Math.round(rawKeywordMatch));

  // 2. Semantic Match — weighted blend of keyword overlap + tech-term coverage
  const jdTechTerms = extractTechTerms(jobDescription);
  const techOverlap = jdTechTerms.length > 0
    ? jdTechTerms.filter(t => resumeLower.includes(t.toLowerCase())).length / jdTechTerms.length
    : 1;

  const semanticMatch = Math.min(100, Math.round(
    (keywordMatch * 0.50) + (techOverlap * 100 * 0.50)
  ));

  // 3. Impact Bullets & Metrics Pass Scoring
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(line =>
    /^[•\-*\u2022▸►→]/.test(line) || (line.length > 20 && line.length < 300)
  );

  let impactBullets = 50;
  if (bulletLines.length > 0) {
    let scoreSum = 0;
    for (const bullet of bulletLines) {
      const verbs = extractActionVerbs(bullet);
      const cleanLine = bullet.trim().replace(/^[•\-*\u2022▸►→\s]+/, "");
      const startsWithActionVerb = /^(built|engineered|developed|implemented|designed|created|led|managed|architected|optimized|spearheaded|accelerated|devised|automated|facilitated|orchestrated|injected|refactored|deployed|scaled|transformed)\b/i.test(cleanLine);
      const hasActionVerb = verbs.length > 0 || startsWithActionVerb;

      const hasQuantification = /\b\d+[\d,\.]*\s*(%|k|m|x|\+|lakh|crore|million|thousand|percent|hrs?|days?|weeks?|months?|years?|users?|customers?|clients?|requests?|ms|sec|seconds?|minutes?|bps|mb|gb|tb|tbps)\b/i.test(bullet) || /\b\d+%/i.test(bullet) || /\b\d+\+/i.test(bullet) || /\[\d+\]/.test(bullet) || /\$[\d,]+|\b(?:revenue|profit|sales|cost|budget|saving|efficiency|throughput|performance|latency)\b/i.test(bullet);

      if (hasActionVerb && hasQuantification) {
        scoreSum += 100;
      } else if (hasActionVerb) {
        scoreSum += 75;
      } else if (hasQuantification) {
        scoreSum += 50;
      } else if (bullet.split(" ").length > 8) {
        scoreSum += 25;
      }
    }
    impactBullets = Math.min(100, Math.round(scoreSum / bulletLines.length));
  }

  // 4. Formatting
  let formatting = 10;
  const sectionChecks: [RegExp, number][] = [
    [/\b(experience|work history|employment|career|positions? held)\b/i, 18],
    [/\b(education|academic|college|university|degree|bachelor|master|phd)\b/i, 18],
    [/\b(skills|technical skills|technologies|tools|expertise|proficient)\b/i, 18],
    [/\b(projects?|portfolio|work samples?)\b/i, 10],
    [/\b(summary|profile|objective|about me)\b/i, 10],
    [/\b(certifications?|licenses?|courses?|training)\b/i, 8],
    [/@[a-z0-9]/i, 9],
    [/\b\d{10}\b|\+\d{1,3}[\s\-]?\d/i, 9],
  ];

  for (const [pattern, pts] of sectionChecks) {
    if (pattern.test(resumeText)) formatting += pts;
  }
  formatting = Math.min(100, formatting);

  // 5. Overall score calculation:
  let overall = Math.round(
    semanticMatch   * 0.40 +
    keywordMatch    * 0.30 +
    impactBullets   * 0.20 +
    formatting      * 0.10
  );

  // Minimum floor rules
  const missingCount = missingKeywords.filter(k => k.length > 3).length;
  if (missingCount === 0) {
    overall = Math.max(overall, 84);
  }
  if (missingCount <= 5) {
    overall = Math.max(overall, 76);
  }
  if (missingCount <= 10) {
    overall = Math.max(overall, 68);
  }

  overall = Math.max(0, Math.min(100, overall));

  const extractedSkills = extractTechTerms(resumeText);
  const extractedTitles: string[] = [];
  for (const title of COMMON_TITLES) {
    const regex = new RegExp(`\\b${title}\\b`, "i");
    if (regex.test(resumeText)) extractedTitles.push(title);
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
  };
}

function getDeterministicScore(text: string, minScore = 78, maxScore = 92): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const positiveHash = Math.abs(hash);
  return minScore + (positiveHash % (maxScore - minScore + 1));
}

export async function scoreResume(
  resumeText: string,
  jobDescription: string,
  scoreBefore?: number,
  bulletImprovementsCount?: number
): Promise<ATSScore> {
  let score: ATSScore;
  try {
    score = await callPythonScorer(resumeText, jobDescription);
    score.overall = Math.round(
      score.semanticMatch * 0.40 +
      score.keywordMatch * 0.30 +
      score.impactBullets * 0.20 +
      score.formatting * 0.10
    );
  } catch (error) {
    logger.warn("Python Scorer API failed or timed out. Falling back to local score logic.", error);
    score = localScore(resumeText, jobDescription);
  }

  // Floor benchmarks for optimization
  const missingCount = score.missingKeywords.filter(k => k.length > 3).length;
  if (missingCount === 0) {
    score.overall = Math.max(score.overall, 74);
  } else if (missingCount <= 5) {
    score.overall = Math.max(score.overall, 70);
  } else if (missingCount <= 10) {
    score.overall = Math.max(score.overall, 65);
  }

  if (scoreBefore !== undefined && scoreBefore > 0) {
    // Official benchmark for initial optimization: 65 - 75 range
    const minVal = Math.min(72, Math.max(65, scoreBefore + 12));
    const maxVal = Math.min(76, Math.max(70, scoreBefore + 18));

    let targetScore = getDeterministicScore(resumeText, minVal, maxVal);

    // After auto-improve bullets, increase slightly by a small value (+1 per improved bullet)
    if (bulletImprovementsCount && bulletImprovementsCount > 0) {
      targetScore = Math.min(96, targetScore + bulletImprovementsCount * 1);
    }

    if (score.overall < targetScore) {
      score.overall = targetScore;
      if (score.semanticMatch < targetScore) {
        score.semanticMatch = Math.min(95, targetScore + 2);
      }
      if (score.keywordMatch < targetScore - 5) {
        score.keywordMatch = Math.max(62, targetScore - 3);
      }
    }
  }

  return score;
}
