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
      timeout: 15000,
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

  // 1. Keyword Overlap
  const resumeKeywords = extractKeywords(resumeText);
  const jdKeywords = extractKeywords(jobDescription);
  
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  if (jdKeywords.size > 0) {
    for (const kw of jdKeywords) {
      // Perform case-insensitive search in resume keywords
      let matched = false;
      for (const rkw of resumeKeywords) {
        if (rkw.toLowerCase() === kw.toLowerCase()) {
          matched = true;
          break;
        }
      }
      if (matched) {
        foundKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    }
  }

  const keywordMatch = jdKeywords.size > 0 
    ? Math.round((foundKeywords.length / jdKeywords.size) * 100)
    : 100;

  // 2. Semantic Match Fallback (approximate as keyword match * 0.9)
  const semanticMatch = Math.round(keywordMatch * 0.9);

  // 3. Impact Bullets
  // Identify lines that look like bullet points: start with standard markers or indentation
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(line => 
    /^[•\-*\u2022]/.test(line) || line.length > 20 && line.length < 200
  );

  let impactBullets = 0;
  if (bulletLines.length > 0) {
    let scoringSum = 0;
    for (const bullet of bulletLines) {
      const verbs = extractActionVerbs(bullet);
      const hasVerb = verbs.length > 0;
      // Look for numbers, percentages, or metrics indicators
      const hasQuantifier = /\b\d+%?\b|\b(million|thousand|lakh|crore|k|m)\b/i.test(bullet);
      
      let bulletScore = 0;
      if (hasVerb) bulletScore += 50;
      if (hasQuantifier) bulletScore += 50;
      scoringSum += bulletScore;
    }
    impactBullets = Math.round(scoringSum / bulletLines.length);
  } else {
    // If no bullets identified, default baseline score
    impactBullets = 30;
  }

  // 4. Formatting
  let formatting = 0;
  const lowerResume = resumeText.toLowerCase();

  // Check section headers
  if (/\b(experience|work history|employment)\b/i.test(lowerResume)) formatting += 20;
  if (/\b(education|academic|college|university)\b/i.test(lowerResume)) formatting += 20;
  if (/\b(skills|technologies|expertise)\b/i.test(lowerResume)) formatting += 20;

  // Check contact details
  if (lowerResume.includes("@")) formatting += 20; // Email indicator
  if (/\b\d{10}\b|\+\d{2}/.test(lowerResume)) formatting += 20; // Phone number indicator

  // Ensure formatting score is bound at 100
  formatting = Math.min(100, formatting);

  // Calculate Overall Weighted Score
  // Weights: Semantic 35%, Keyword 25%, Impact 25%, Formatting 15%
  const overall = Math.round(
    (semanticMatch * 0.35) +
    (keywordMatch * 0.25) +
    (impactBullets * 0.25) +
    (formatting * 0.15)
  );

  // Extract skills and job titles
  const extractedSkills = extractTechTerms(resumeText);
  const extractedTitles: string[] = [];
  for (const title of COMMON_TITLES) {
    const regex = new RegExp(`\\b${title}\\b`, "i");
    if (regex.test(resumeText)) {
      extractedTitles.push(title);
    }
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
    foundKeywords
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
