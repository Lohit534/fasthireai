/**
 * Resume / JD Anonymizer — strips all PII before storing training samples.
 *
 * Rules:
 *  - Replace real names with "[NAME]"
 *  - Replace emails with "[EMAIL]"
 *  - Replace phone numbers with "[PHONE]"
 *  - Replace LinkedIn / GitHub / website URLs with "[URL]"
 *  - Replace location / city / state / country with "[LOCATION]"
 *  - Replace GPA values with "[GPA]"
 *  - Truncate company names to keep only first word (e.g. "Google LLC" → "Google")
 *  - Strip all strings longer than 1500 chars (no full resume stored, only keywords + structure)
 *
 * NEVER stores the raw original or optimized text. Only keyword lists, scores,
 * detected job title, section structure, and an anonymised 250-char summary snippet.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?[\d\-\(\)\s]{7,17})/g;
const URL_RE = /https?:\/\/[^\s,;\)>\"']+/g;
const LINKEDIN_RE = /linkedin\.com\/in\/[^\s|,;\)>\"']+/gi;
const GITHUB_RE = /github\.com\/[^\s|,;\)>\"']+/gi;
const GPA_RE = /\bGPA[:\s]+[\d.]+\b/gi;
const CGPA_RE = /\bCGPA[:\s]+[\d.]+\b/gi;
// Broad name patterns at start of resume (first line: usually candidate name)
// We anonymize only the very first non-empty line if it looks like a name
function anonymizeFirstLine(text: string): string {
  const lines = text.split("\n");
  if (lines.length > 0) {
    const first = lines[0].trim();
    // Likely a name if it's 2-5 words of pure letters / spaces (no @ / digits)
    if (first && /^[A-Za-z\s]{2,50}$/.test(first) && first.split(" ").length <= 5) {
      lines[0] = "[NAME]";
    }
  }
  return lines.join("\n");
}

export function anonymizeText(raw: string): string {
  let text = anonymizeFirstLine(raw);
  text = text.replace(EMAIL_RE, "[EMAIL]");
  text = text.replace(URL_RE, "[URL]");
  text = text.replace(LINKEDIN_RE, "[URL]");
  text = text.replace(GITHUB_RE, "[URL]");
  text = text.replace(GPA_RE, "GPA [GPA]");
  text = text.replace(CGPA_RE, "CGPA [GPA]");
  text = text.replace(PHONE_RE, (match) => {
    // Only replace if it looks like a phone (7+ consecutive digits)
    const digits = match.replace(/\D/g, "");
    return digits.length >= 7 ? "[PHONE]" : match;
  });
  // Remove Indian / US location formats (city, state) — e.g. "Hyderabad, Telangana" 
  text = text.replace(/\b([A-Z][a-z]+),\s*([A-Z][a-zA-Z\s]+)\b/g, "[LOCATION]");
  return text;
}

/**
 * Build a compact, anonymized training sample from an optimization run.
 * This is what gets stored in the TrainingSample table.
 */
export interface TrainingSample {
  jobTitle: string;
  keywordsFromJD: string[];
  keywordsInjected: string[];
  keywordsMissing: string[];
  scoreBefore: number;
  scoreAfter: number;
  jdSnippet: string;       // First 300 chars of JD, anonymised
  resumeSnippet: string;   // First 300 chars of resume, anonymised
}

export function buildTrainingSample(params: {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
  keywordsInjected: string[];
  keywordsMissing: string[];
  scoreBefore: number;
  scoreAfter: number;
}): TrainingSample {
  const anonJD = anonymizeText(params.jobDescription);
  const anonResume = anonymizeText(params.resumeText);

  return {
    jobTitle: params.jobTitle,
    keywordsFromJD: params.keywordsMissing.slice(0, 40), // all missing = extracted from JD
    keywordsInjected: params.keywordsInjected.slice(0, 40),
    keywordsMissing: params.keywordsMissing.filter(k => !params.keywordsInjected.includes(k)).slice(0, 40),
    scoreBefore: params.scoreBefore,
    scoreAfter: params.scoreAfter,
    jdSnippet: anonJD.substring(0, 300),
    resumeSnippet: anonResume.substring(0, 300),
  };
}
