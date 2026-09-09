import type { ResumeJSON } from "@/types/resume";

/**
 * buildOptimizationPrompt
 *
 * Generates the elite-grade ATS optimization prompt.
 * Key design decisions:
 *  - Full JD and resume text (5000 chars each — no truncation for normal resumes)
 *  - ALL missing keywords passed (up to 40, not just top-20)
 *  - Strict format contract enforced in prompt — every section, every line
 *  - PRE-FLIGHT CHECKLIST the model must self-verify before returning output
 */
export function buildOptimizationPrompt(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  extractedSkills: string[],
  instructions = "",
  lengthOption = "Auto-detect"
): string {
  const SKILL_CATEGORIES = [
    "Programming Languages",
    "Frameworks & Libraries",
    "Databases & Backend",
    "Cloud & DevOps",
    "Developer Tools",
  ];

  // All missing keywords + extracted skills not already in resume — cap at 40
  const allKeywordsToInject = Array.from(
    new Set([
      ...missingKeywords,
      ...extractedSkills.filter(
        (s) => !resumeText.toLowerCase().includes(s.toLowerCase())
      ),
    ])
  ).slice(0, 40);

  const keywordList = allKeywordsToInject.join(", ");

  const userInstructionBlock = instructions?.trim()
    ? "\nUSER INSTRUCTIONS (apply these on top of everything else):\n" + instructions + "\n"
    : "";

  const lengthInstruction =
    lengthOption === "Shorter"
      ? "- Trim bullets to 3 per role maximum"
      : lengthOption === "Longer"
      ? "- Expand bullets to 5-6 per role with more detail"
      : "";

  const sep = "=".repeat(51);

  return (
    "You are FastHire's elite ATS resume optimization engine.\n" +
    "Your sole job: produce a maximally ATS-optimized resume that preserves the candidate's facts\n" +
    "while injecting every target keyword and rewriting every bullet for measurable impact.\n\n" +
    sep + "\n" +
    "ABSOLUTE OUTPUT FORMAT CONTRACT -- EVERY RULE IS MANDATORY\n" +
    sep + "\n\n" +
    "PLAIN TEXT RULES:\n" +
    "- Return plain text ONLY in the \"resume\" field -- zero LaTeX, zero Markdown\n" +
    "- No \\textbf \\section \\begin \\end \\item\n" +
    "- No ** ## __ ~~ `` or any other Markdown inside resume text\n" +
    "- Use real newline characters to separate lines -- NOT the literal string \\n\n" +
    "- Maximum 2 blank lines between sections\n\n" +
    "EXACT SECTION ORDER (follow exactly):\n" +
    "1. NAME\n" +
    "2. contact line\n" +
    "3. (blank line)\n" +
    "4. PROFESSIONAL SUMMARY\n" +
    "5. (blank line)\n" +
    "6. TECHNICAL SKILLS\n" +
    "7. (blank line)\n" +
    "8. PROFESSIONAL EXPERIENCE\n" +
    "9. (blank line)\n" +
    "10. PROJECTS\n" +
    "11. (blank line)\n" +
    "12. EDUCATION\n" +
    "13. (blank line)\n" +
    "14. CERTIFICATIONS  (omit if candidate has none)\n" +
    "15. ACHIEVEMENTS    (omit if candidate has none)\n" +
    "16. LANGUAGES       (omit if candidate has none)\n\n" +
    "EXACT LINE FORMAT FOR EACH SECTION:\n\n" +
    "NAME LINE:\n" +
    "  ALL CAPS exactly as in original -- e.g. PEYYALA LOHIT\n\n" +
    "CONTACT LINE (single line, | separator):\n" +
    "  email | phone | location | LinkedIn URL | GitHub URL\n" +
    "  Preserve ALL URLs exactly as in original resume\n\n" +
    "PROFESSIONAL SUMMARY:\n" +
    "  Header: PROFESSIONAL SUMMARY (ALL CAPS)\n" +
    "  Content: exactly 3 sentences, pure narrative paragraph\n" +
    "  NO bullet points, dashes, or hyphens at start of sentences\n" +
    "  55-80 words total\n" +
    "  Must include 5 or more keywords from the JD\n\n" +
    "TECHNICAL SKILLS:\n" +
    "  Header: TECHNICAL SKILLS (ALL CAPS)\n" +
    "  Exactly these 5 category lines -- each on ONE single line, never split:\n" +
    "    Programming Languages: skill1, skill2, skill3\n" +
    "    Frameworks & Libraries: skill1, skill2, skill3\n" +
    "    Databases & Backend: skill1, skill2, skill3\n" +
    "    Cloud & DevOps: skill1, skill2, skill3\n" +
    "    Developer Tools: skill1, skill2, skill3\n" +
    "  List JD-matching skills FIRST in each category\n" +
    "  NEVER put spoken languages (English, Telugu) in Technical Skills\n\n" +
    "PROFESSIONAL EXPERIENCE:\n" +
    "  Header: PROFESSIONAL EXPERIENCE (ALL CAPS)\n" +
    "  For each role:\n" +
    "    Line 1: Role Title | Company Name | City, Country\n" +
    "    Line 2: Month YYYY - Month YYYY  (or Present)\n" +
    "    Lines 3+: bullet Strong bullet (one per line)\n" +
    "  Each bullet MUST follow: [Action Verb] + [What] + [Tool/Method] + [Quantified Result]\n" +
    "  Minimum 3 bullets per role, maximum 6\n\n" +
    "PROJECTS:\n" +
    "  Header: PROJECTS (ALL CAPS)\n" +
    "  For each project:\n" +
    "    Line 1: Project Title | Technology Stack\n" +
    "    Lines 2+: bullet for each point\n\n" +
    "EDUCATION:\n" +
    "  Header: EDUCATION (ALL CAPS)\n" +
    "  For each entry:\n" +
    "    Line 1: Degree Name | Month YYYY - Month YYYY\n" +
    "    Line 2: Institution Name, University Name\n" +
    "    Line 3: CGPA: X.XX  (or GPA: X.XX)\n\n" +
    "CERTIFICATIONS / ACHIEVEMENTS / LANGUAGES:\n" +
    "  Header in ALL CAPS\n" +
    "  Each item as a bullet point\n" +
    "  LANGUAGES: spoken languages ONLY (English, Telugu, Hindi, Spanish) -- NOT programming languages\n\n" +
    sep + "\n" +
    "OPTIMIZATION TASKS (execute ALL of these):\n" +
    sep + "\n\n" +
    "TASK 1 -- KEYWORD INJECTION (top priority):\n" +
    "Keywords to inject (ALL of them, at least once each):\n" +
    (keywordList || "(inject all JD tech terms you can identify)") + "\n\n" +
    "Rules:\n" +
    "- Add every technical keyword to the appropriate Technical Skills category\n" +
    "- Weave remaining keywords naturally into existing bullet rewrites\n" +
    "- Match EXACT casing from the JD (e.g., React.js not ReactJS)\n" +
    "- Rewrite the Professional Summary to include 5+ top JD keywords\n\n" +
    "TASK 2 -- BULLET REWRITING (every single bullet):\n" +
    "Formula: [Strong Verb] + [What] + [Tool/Method] + [Quantified Result]\n\n" +
    "Examples:\n" +
    "\"Worked on backend\" -> \"Engineered RESTful APIs with Node.js and Express, reducing p95 latency by 42%\"\n" +
    "\"Did data analysis\" -> \"Analyzed 500K+ user records using Python and Pandas, improving churn prediction accuracy by 23%\"\n" +
    "\"Used Docker\" -> \"Containerized 12 microservices with Docker and Kubernetes, cutting deployment time by 60%\"\n\n" +
    "Strong verb bank: Accelerated, Architected, Automated, Built, Collaborated, Containerized, Deployed,\n" +
    "Designed, Developed, Drove, Engineered, Executed, Fine-tuned, Generated, Implemented, Improved,\n" +
    "Launched, Led, Migrated, Optimized, Orchestrated, Reduced, Refactored, Scaled, Shipped,\n" +
    "Spearheaded, Streamlined, Trained, Transformed\n\n" +
    "Quantification rules:\n" +
    "- Use real numbers where implied by context\n" +
    "- If no number fits naturally, use large-scale, enterprise-grade, or end-to-end\n" +
    "- NEVER invent fabricated numbers that are clearly wrong\n\n" +
    "TASK 3 -- SKILLS REORGANIZATION:\n" +
    "- Put JD-matching skills FIRST in every category\n" +
    "- Add every missing JD technical skill to the most relevant category\n" +
    "- Use ONLY these 5 categories (no others): " + SKILL_CATEGORIES.join(", ") + "\n\n" +
    "TASK 4 -- SUMMARY REWRITE:\n" +
    "- Sentence 1: [Years] years of [target role] experience specializing in [top 3 JD skills]\n" +
    "- Sentence 2: [Key achievement from resume with number]\n" +
    "- Sentence 3: [Value proposition matching the JD]\n" +
    "- 55-80 words total, no bullets, no dashes\n\n" +
    "TASK 5 -- SECTION ORDER AND COMPLETENESS:\n" +
    "- Follow the exact section order from the FORMAT CONTRACT above\n" +
    "- Do NOT drop any section the original resume had\n" +
    "- Do NOT invent new jobs, degrees, or certificates -- only optimize what exists\n" +
    userInstructionBlock + "\n" +
    "LENGTH OPTION: " + lengthOption + "\n" +
    lengthInstruction + "\n\n" +
    sep + "\n" +
    "PRE-FLIGHT CHECKLIST (verify ALL before outputting):\n" +
    sep + "\n" +
    "[ ] Name is ALL CAPS on line 1\n" +
    "[ ] Contact line has email | phone | location | URLs separated by |\n" +
    "[ ] Professional Summary is exactly 3 sentences, no bullet points\n" +
    "[ ] TECHNICAL SKILLS has exactly 5 category lines, each on ONE line only\n" +
    "[ ] Every experience bullet starts with a strong verb + has a quantified result\n" +
    "[ ] No LaTeX, no Markdown, no literal backslash-n in resume text\n" +
    "[ ] All original URLs preserved verbatim\n" +
    "[ ] No sections were dropped from the original resume\n" +
    "[ ] LANGUAGES section contains ONLY spoken languages (if present)\n" +
    "[ ] ALL " + allKeywordsToInject.length + " target keywords appear at least once\n\n" +
    sep + "\n" +
    "JOB DESCRIPTION:\n" +
    sep + "\n" +
    jobDescription.slice(0, 5000) + "\n\n" +
    sep + "\n" +
    "ORIGINAL RESUME:\n" +
    sep + "\n" +
    resumeText.slice(0, 5000) + "\n\n" +
    sep + "\n" +
    "OUTPUT FORMAT\n" +
    sep + "\n" +
    "Return ONLY this JSON -- no markdown, no preamble, no explanation:\n\n" +
    "{\n" +
    "  \"detectedJobTitle\": \"Exact Job Title from the JD\",\n" +
    "  \"detectedCompany\": \"Exact Company Name from the JD (or General Application if not mentioned)\",\n" +
    "  \"resume\": \"COMPLETE optimized resume -- every section, every bullet, nothing omitted. Minimum length = original resume length.\",\n" +
    "  \"keywordsAdded\": [\"keyword1\", \"keyword2\", \"keyword3\"],\n" +
    "  \"bulletsRewritten\": 8,\n" +
    "  \"changesCount\": 15,\n" +
    "  \"summary\": \"X keywords injected, Y bullets rewritten, score improved by ~Z points\"\n" +
    "}"
  );
}

export function buildCoverLetterPrompt(
  resumeText: string,
  jobDescription: string,
  jobTitle?: string,
  company?: string
): string {
  const truncatedJd = jobDescription.slice(0, 4000);
  const truncatedResume = resumeText.slice(0, 6000);

  return (
    "You are an expert career consultant and professional cover letter writer.\n\n" +
    "CORE TASK:\n" +
    "Write a personalized, compelling cover letter for this role using the candidate's resume and target job description.\n" +
    "Explain why the candidate is interested in this company, connect their experience with the JD requirements,\n" +
    "and keep the tone professional, natural, and human.\n\n" +
    "==================================================\n" +
    "GUIDELINES:\n" +
    "==================================================\n" +
    "1. Write from the candidate's first-person perspective (I, my).\n" +
    "2. Explain clearly why the candidate is interested in " + (company || "this company") + " and the " + (jobTitle || "target role") + ".\n" +
    "3. Seamlessly connect the candidate's background, technical skills, and measurable achievements\n" +
    "   from their resume with key requirements in the JD.\n" +
    "4. Keep tone: professional, natural, engaging, genuinely human.\n" +
    "5. Strictly avoid: I am writing with great enthusiasm, synergy, hardworking team player, dynamic professional, or any AI cliches.\n" +
    "6. Structure: Salutation -> Engaging Introduction -> 1-2 Strong Body Paragraphs with concrete achievements -> Professional Closing Call-to-Action.\n" +
    "7. Length: 300-400 words. Not longer.\n\n" +
    "==================================================\n" +
    "TARGET JOB DESCRIPTION:\n" +
    truncatedJd + "\n\n" +
    "==================================================\n" +
    "CANDIDATE RESUME:\n" +
    truncatedResume + "\n\n" +
    "Return ONLY the complete text of the personalized cover letter. Do not include markdown code fences or conversational intro/outro text."
  );
}
