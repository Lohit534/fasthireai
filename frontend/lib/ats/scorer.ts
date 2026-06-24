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
  const jdLower = jobDescription.toLowerCase();

  // 1. Keyword Overlap — with partial phrase matching
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);

  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  if (jdKeywords.size > 0) {
    for (const kw of jdKeywords) {
      const kwLower = kw.toLowerCase();
      // Exact match OR partial phrase match in raw resume text
      const exactMatch = [...resumeKeywords].some(r => r.toLowerCase() === kwLower);
      const phraseMatch = resumeLower.includes(kwLower);
      // Also try root-word match (e.g. "analysis" matches "analytics", "analysed")
      const rootMatch = resumeLower.includes(kwLower.slice(0, Math.max(5, kwLower.length - 2)));

      if (exactMatch || phraseMatch || rootMatch) {
        foundKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }
  }

  const rawKeywordMatch = jdKeywords.size > 0
    ? (foundKeywords.length / jdKeywords.size) * 100
    : 100;

  // Boost if high overlap — real ATS systems give credit for contextual use
  const keywordMatch = Math.min(100, Math.round(rawKeywordMatch * 1.12));

  // 2. Semantic Match — weighted blend of keyword overlap + tech-term coverage
  const resumeTechTerms = extractTechTerms(resumeText);
  const jdTechTerms = extractTechTerms(jobDescription);
  const techOverlap = jdTechTerms.length > 0
    ? jdTechTerms.filter(t => resumeLower.includes(t.toLowerCase())).length / jdTechTerms.length
    : 1;

  const semanticMatch = Math.min(100, Math.round(
    (keywordMatch * 0.65) + (techOverlap * 100 * 0.35)
  ));

  // 3. Impact Bullets — score each bullet for action verbs + metrics
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(line =>
    /^[•\-*\u2022▸►→]/.test(line) || (line.length > 25 && line.length < 250)
  );

  let impactBullets = 40; // Baseline for resumes with no clear bullets
  if (bulletLines.length > 0) {
    let scoreSum = 0;
    for (const bullet of bulletLines) {
      const verbs = extractActionVerbs(bullet);
      const hasVerb = verbs.length > 0;
      const hasQuantifier = /\b\d[\d,]*\s*(%|k|m|x|lakh|crore|million|thousand|percent|hrs?|days?|weeks?|months?|years?|users?|customers?|clients?)\b/i.test(bullet);
      const hasDollar = /\$[\d,]+|\b(?:revenue|profit|sales|cost|budget|saving)\b/i.test(bullet);
      const isLong = bullet.length > 60; // More detail = better bullet

      let bScore = 20; // baseline per bullet
      if (hasVerb) bScore += 35;
      if (hasQuantifier) bScore += 30;
      if (hasDollar) bScore += 10;
      if (isLong) bScore += 5;
      scoreSum += Math.min(100, bScore);
    }
    impactBullets = Math.min(100, Math.round(scoreSum / bulletLines.length));
  }

  // 4. Formatting — richer section detection + structure signals
  let formatting = 10; // baseline for any text at all

  const sectionChecks: [RegExp, number][] = [
    [/\b(experience|work history|employment|career|positions? held)\b/i, 18],
    [/\b(education|academic|college|university|degree|bachelor|master|phd)\b/i, 18],
    [/\b(skills|technical skills|technologies|tools|expertise|proficient)\b/i, 18],
    [/\b(projects?|portfolio|work samples?)\b/i, 10],
    [/\b(summary|profile|objective|about me)\b/i, 10],
    [/\b(certifications?|licenses?|courses?|training)\b/i, 8],
    [/@[a-z0-9]/i, 9],                      // email
    [/\b\d{10}\b|\+\d{1,3}[\s\-]?\d/i, 9], // phone
  ];

  for (const [pattern, pts] of sectionChecks) {
    if (pattern.test(resumeText)) formatting += pts;
  }
  formatting = Math.min(100, formatting);

  // 5. Overall — rebalanced weights (Semantic 40%, Keyword 30%, Impact 20%, Formatting 10%)
  const overall = Math.min(
    99, // cap at 99 — perfect score only for truly excellent resumes
    Math.round(
      (semanticMatch * 0.40) +
      (keywordMatch  * 0.30) +
      (impactBullets * 0.20) +
      (formatting    * 0.10)
    )
  );

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

export async function scoreResume(resumeText: string, jobDescription: string): Promise<ATSScore> {
  try {
    return await callPythonScorer(resumeText, jobDescription);
  } catch (error) {
    logger.warn("Python Scorer API failed or timed out. Falling back to local score logic.", error);
    return localScore(resumeText, jobDescription);
  }
}
