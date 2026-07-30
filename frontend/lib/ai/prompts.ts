import type { ResumeJSON } from "@/types/resume";

export function buildOptimizationPrompt(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  extractedSkills: string[],
  instructions = "",
  lengthOption = "Auto-detect"
): string {
  const truncatedJd = jobDescription.slice(0, 2500);
  const truncatedResume = resumeText.slice(0, 3500);
  const topMissingKeywords = missingKeywords.slice(0, 15);

  const pageCount = lengthOption === "1 Page" ? 1 : lengthOption === "2 Pages" ? 2 : 1;

  const pageRules =
    pageCount === 1
      ? `ONE-PAGE RULES (strict):
- Maximum 5–6 sections total
- Maximum 2 projects; maximum 5 bullets per project
- Maximum 5 bullets per experience entry
- Maximum 4 certifications
- Maximum 4 achievements
- Omit publications, extracurriculars, leadership unless critical`
      : `TWO-PAGE RULES:
- Up to 4 projects; up to 5 bullets per project
- Up to 5 bullets per experience entry
- Up to 8 certifications
- Include publications, leadership, extracurriculars if present`;

  const instructionsBlock =
    instructions && instructions.trim()
      ? `\n\nUSER CUSTOM INSTRUCTIONS (apply strictly): "${instructions.trim()}"`
      : "";

  return `You are an expert ATS Resume Writer and Senior Technical Recruiter.

Your task is to generate an ATS-optimized professional resume suitable for Fortune 500 companies including Amazon, Microsoft, Google, Meta, Cognizant, Infosys, Accenture, Deloitte, Oracle, IBM, and TCS.

==================================================
ABSOLUTE RULES
==================================================
- NEVER fabricate companies, dates, degrees, certifications, job titles, or achievements.
- Use ONLY information supplied in the candidate resume below.
- If a section has no data, omit it entirely.
- Do NOT use first-person pronouns anywhere.
- Do NOT use generic phrases: "Hardworking", "Quick learner", "Looking for opportunities", "Passionate student".
- Every experience/project bullet MUST start with a strong action verb.
- Prefer measurable outcomes in bullets (%, numbers, scale).
- Naturally integrate the following missing keywords where contextually appropriate:
  ${topMissingKeywords.join(", ")}
- Never keyword-stuff or repeat keywords unnaturally.

==================================================
PAGE MANAGEMENT
==================================================
pageCount = ${pageCount}

${pageRules}

==================================================
RESUME SECTION ORDER (always follow this exact order)
==================================================
1. header
2. summary
3. skills
4. experience
5. projects
6. education
7. certifications
8. achievements
9. languages

==================================================
HEADER
==================================================
Include only: name, phone, email, location, linkedin, github, portfolio.
No photos, icons, dates of birth, gender, nationality, or marital status.

==================================================
PROFESSIONAL SUMMARY
==================================================
- 40–70 words.
- Describe the candidate professionally. Mention strongest technologies and domain.
- Use ATS keywords from the job description naturally.
- No first person. No pronouns.

==================================================
TECHNICAL SKILLS
==================================================
Group into categories. Use ONLY skills found in the candidate data.
Preferred categories: Programming Languages, Frameworks, Frontend, Backend, Databases, Cloud, DevOps, AI / ML, Tools, Core Computer Science.

==================================================
EXPERIENCE
==================================================
Each entry must include: role, company, duration, location (if available), bullets (4–5).
Every bullet: 12–22 words, starts with action verb, includes measurable impact.
Never repeat action verbs consecutively.

==================================================
PROJECTS
==================================================
Each entry must include: title, stack (array of technologies), link (if mentioned), bullets (4–5).
Action-oriented bullets with measurable outcomes.

==================================================
EDUCATION — CRITICAL
==================================================
- Preserve ALL education items present in the candidate resume (e.g. B.Tech, Intermediate / Class 12, SSC / Class 10, Diplomas).
- NEVER drop Intermediate, SSC, Class 10, Class 12, or Secondary School items if present in candidate input.
- For each item: degree, institution, university (if applicable), cgpa/percentage/marks (if present), year/dates.

==================================================
SOFT SKILLS & TECHNICAL SKILLS
==================================================
- Group technical skills AND soft skills into categories.
- Include a "Soft Skills" or "Core Competencies" category in skills if soft skills (e.g. Communication, Problem Solving, Leadership, Teamwork) are present in the candidate data.

==================================================
CERTIFICATIONS
==================================================
Only certifications present in the candidate data. Never invent.

==================================================
ACHIEVEMENTS
==================================================
Max 4. Concise. E.g. "Solved 300+ DSA problems on LeetCode", "Hackathon Winner".

==================================================
LANGUAGES
==================================================
Include ALL human languages mentioned in the candidate resume (e.g. English, Telugu, Hindi). Never drop languages section if candidate specified languages.

==================================================
OUTPUT FORMAT — CRITICAL
==================================================
Return ONLY a valid JSON object. No markdown. No comments. No explanations. No code fences.
The output must be directly parseable by JSON.parse().

Required JSON schema:
{
  "header": {
    "name": "Full Name",
    "phone": "phone number or omit",
    "email": "email or omit",
    "location": "City, Country or omit",
    "linkedin": "linkedin URL or omit",
    "github": "github URL or omit",
    "portfolio": "portfolio URL or omit"
  },
  "summary": "40-70 word professional summary string",
  "skills": [
    { "category": "Programming Languages", "items": ["Python", "TypeScript"] },
    { "category": "Frameworks", "items": ["React", "Node.js"] }
  ],
  "experience": [
    {
      "role": "Software Engineer",
      "company": "Company Name",
      "duration": "Jan 2023 – Dec 2024",
      "location": "City, Country",
      "bullets": [
        "Developed REST APIs reducing response time by 35%.",
        "Automated CI/CD pipelines cutting deployment time from 45 minutes to 8 minutes."
      ]
    }
  ],
  "projects": [
    {
      "title": "Project Title",
      "stack": ["React", "Node.js", "PostgreSQL"],
      "link": "https://github.com/user/project",
      "bullets": [
        "Built a full-stack application serving 1,000+ active users.",
        "Reduced API latency by 40% through Redis caching."
      ]
    }
  ],
  "education": [
    {
      "degree": "B.Tech in Computer Science and Engineering",
      "institution": "Institute Name",
      "university": "Affiliated University Name",
      "cgpa": "7.62 / 10.0",
      "year": "2022 – 2026"
    }
  ],
  "certifications": ["Certification Name – Issuing Body"],
  "achievements": ["Solved 300+ DSA problems on LeetCode"],
  "languages": ["English", "Telugu"],
  "keywordsAdded": ["keyword1", "keyword2"],
  "changesCount": 12,
  "summaryChanges": "Brief description of key changes made to improve ATS alignment.",
  "detectedJobTitle": "Software Engineer",
  "detectedCompany": "Google"
}

==================================================
INPUT DATA
==================================================

TARGET JOB DESCRIPTION:
${truncatedJd}${instructionsBlock}

CANDIDATE CURRENT RESUME:
${truncatedResume}

CURRENT EXTRACTED SKILLS:
${extractedSkills.join(", ")}

Return the valid JSON object now.`;
}
