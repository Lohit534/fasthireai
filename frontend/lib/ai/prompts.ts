import type { ResumeJSON } from "@/types/resume";

export function buildOptimizationPrompt(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  extractedSkills: string[],
  instructions = "",
  lengthOption = "Auto-detect"
): string {
  const truncatedJd = jobDescription.slice(0, 3500);
  const truncatedResume = resumeText.slice(0, 6000);
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

  return `You are an expert ATS resume writer and Senior Technical Recruiter with 20+ years of experience at Fortune 500 companies.

CORE MISSION & ATS TAILORING INSTRUCTIONS:
Act as an expert resume writer. Compare the candidate's resume with the target job description. Rewrite the resume to improve ATS compatibility while keeping all information truthful. Highlight missing keywords, improve bullet points using measurable achievements, and maintain a professional one-page format (or two-page format if specified).

==================================================
ABSOLUTE RULES — ZERO TOLERANCE
==================================================
- NEVER fabricate companies, dates, degrees, certifications, job titles, or achievements.
- Use ONLY information supplied in the candidate resume below.
- PRESERVE EVERY SECTION AND EVERY DETAIL the candidate provides — education, skills, languages, certifications, achievements, soft skills, projects, experience — ALL must appear in the output.
- DO NOT remove or omit any section the user provided, even if it seems minor.
- DO NOT truncate or summarize education entries — list them all (B.Tech, Intermediate/12th, SSC/10th, etc.)
- DO NOT remove languages the user listed.
- DO NOT invent new experiences, companies, certifications or metrics not found in the input.
- If a section has no data in the candidate input, omit it entirely.
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
LANGUAGES — CRITICAL
==================================================
- ALWAYS include ALL human languages mentioned in the candidate resume (e.g. English, Telugu, Hindi, French).
- Never drop the languages section if the candidate listed even one language.
- Output as an array: ["English", "Telugu"]

==================================================
SECTIONS — NEVER DROP
==================================================
You MUST include ALL of these sections if the candidate provided data for them:
- summary (always)
- skills (always if candidate listed any skills)
- experience (always if candidate has any experience/internship)
- projects (always if candidate has any projects)
- education (ALWAYS — include ALL entries: B.Tech, Intermediate, SSC, etc.)
- certifications (if any)
- achievements (if any)
- languages (ALWAYS if candidate listed any languages)

DO NOT collapse or merge education entries. Each degree/class is a separate entry.

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

export function buildCoverLetterPrompt(
  resumeText: string,
  jobDescription: string,
  jobTitle?: string,
  company?: string
): string {
  const truncatedJd = jobDescription.slice(0, 3500);
  const truncatedResume = resumeText.slice(0, 6000);

  return `You are an expert career consultant and professional resume/cover letter writer.

CORE TASK:
Write a personalized cover letter for this role using the candidate's resume and target job description. Explain why I am interested in this company, connect my experience with the job description, and keep the tone professional, natural, and human. Avoid generic phrases and cliches.

==================================================
GUIDELINES:
==================================================
1. Write from the candidate's first-person perspective ("I", "my").
2. Explain clearly why the candidate is interested in ${company || "this company"} and the ${jobTitle || "target role"}.
3. Seamlessly connect the candidate's background, technical skills, and measurable achievements from their resume with key requirements in the job description.
4. Keep the tone professional, natural, engaging, and human.
5. Strictly avoid generic filler phrases, AI cliches, and fluff (e.g., avoid: "I am writing with great enthusiasm", "synergy", "hardworking team player", "dynamic professional").
6. Structure: Salutation, Engaging Introduction, 1-2 Strong Body Paragraphs with concrete achievements, Professional Closing Call-to-Action.

==================================================
TARGET JOB DESCRIPTION:
${truncatedJd}

==================================================
CANDIDATE RESUME:
${truncatedResume}

Return ONLY the complete text of the personalized cover letter. Do not include markdown code fences or conversational intro/outro text.`;
}
