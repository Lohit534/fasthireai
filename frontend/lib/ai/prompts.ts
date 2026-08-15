import type { ResumeJSON } from "@/types/resume";

export function buildOptimizationPrompt(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  extractedSkills: string[],
  instructions = "",
  lengthOption = "Auto-detect"
): string {
  return `You are a world-class ATS resume optimization expert who knows exactly how Workday, Greenhouse, Taleo, iCIMS, and Lever parse and score resumes.

ABSOLUTE OUTPUT RULES — NEVER VIOLATE:
- Return plain text ONLY in the "resume" JSON field
- Zero LaTeX: no \\textbf \\section \\begin \\end \\item
- Zero markdown: no ** ## __ or backticks inside resume text
- Section headers: ALL CAPS plain text only (PROFESSIONAL SUMMARY, TECHNICAL SKILLS, PROFESSIONAL EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS, ACHIEVEMENTS, LANGUAGES)
- Bullets: • character only — each on its own line
- Name: line 1, ALL CAPS (e.g. PEYYALA LOHIT)
- Contact info: line 2, separated by | (e.g. email | phone | location | LinkedIn | GitHub)
- Technical Skills format: Each category on a SINGLE LINE formatted as "Category Name: Skill1, Skill2, Skill3" (e.g., Programming Languages: Python, Java, JavaScript, TypeScript, Go, C#)
  - Categories to use: Programming Languages, Frameworks & Libraries, Databases & Backend, Cloud & DevOps, Developer Tools
  - NEVER split a category name and its colon/skills across multiple lines
  - NEVER include spoken/human languages in Technical Skills
- Professional Summary format: Strictly a cohesive 2-4 sentence narrative paragraph (NO bullet points, NO dashes, text only).
- Project line: Title | Tech Stack or Description on line 1, bullets on lines below
- Education line: Degree | Dates on line 1, Institution | CGPA on line 2
- Languages section (at the bottom): Strictly for spoken/communication languages ONLY (e.g., English, Telugu, Hindi, Spanish). NEVER put programming languages here. Each spoken language MUST be formatted as its own bullet point on a new line (e.g., • English\n• Telugu).
- Preserve ALL URLs exactly as written
- Return valid JSON only with "resume" as a multi-line string containing real \n newlines between lines!

OPTIMIZATION STEPS — DO ALL FIVE:

STEP 1 — KEYWORD INJECTION (highest priority)
Missing keywords to inject: ${missingKeywords.slice(0, 20).join(', ')}
Rules:
- Inject EVERY missing keyword at least once
- Add missing technical skills directly to the appropriate category in Technical Skills
- Inject remaining keywords into existing bullets with quantifiable achievements
- Match exact casing from job description
- Must read naturally — never keyword stuff
- Rewrite Summary to include 5+ JD keywords

STEP 2 — BULLET REWRITING
Rewrite EVERY bullet using this formula:
[Strong Verb] + [What] + [Tool/Method] + [Result]

Weak → Strong examples:
"Worked on backend" → "Engineered RESTful APIs using Node.js reducing response time by 35%"
"Did data analysis" → "Analyzed 50K+ records using Python and Pandas improving accuracy 23%"
"Used Git" → "Managed Git workflows for 5-person team maintaining 99% deployment success rate"

Strong verbs to use: Architected, Automated, Built, Delivered, Deployed, Designed, Developed, Drove, Engineered, Executed, Generated, Implemented, Improved, Launched, Led, Optimized, Reduced, Scaled, Streamlined, Transformed, Analyzed, Collaborated, Coordinated, Created

Quantification rules:
- Use real numbers only if clearly implied
- If no number fits: use "large-scale", "enterprise-level", or "end-to-end"

STEP 3 — SUMMARY REWRITE
Rewrite Professional Summary to:
- Pure narrative text paragraph ONLY — ABSOLUTELY NO bullet points (•) or dashes
- First sentence: target job title + top 3 JD skills
- Second sentence: experience + key achievement
- Third sentence: value you bring to this role
- Total: 60-80 words maximum
- Include minimum 5 keywords from JD

STEP 4 — SKILLS REORGANIZATION
- List JD-matching skills FIRST in each skill category
- Add all missing technical skills from JD
- Group by category: Programming Languages, Frameworks & Libraries, Databases & Backend, Cloud & DevOps, Developer Tools
- Keep only skills relevant to the candidate's profile

STEP 5 — SECTION ORDER FOR ATS
Reorder to this universal sequence for maximum ATS score:
1. Name + Contact
2. PROFESSIONAL SUMMARY
3. TECHNICAL SKILLS
4. PROFESSIONAL EXPERIENCE
5. PROJECTS
6. EDUCATION
7. CERTIFICATIONS
8. ACHIEVEMENTS
9. LANGUAGES (Spoken languages with • bullets only)

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

ORIGINAL RESUME:
${resumeText.slice(0, 4000)}

Return ONLY this JSON with no markdown, no preamble, no explanation whatsoever:
{
  "resume": "COMPLETE optimized resume — every section, every bullet, nothing omitted, minimum same length as original",
  "keywordsAdded": ["keyword1", "keyword2"],
  "bulletsRewritten": 8,
  "changesCount": 15,
  "summary": "Brief: X keywords injected, Y bullets rewritten"
}`;
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
