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
- Return plain text ONLY
- Zero LaTeX: no \\textbf \\section \\begin \\end \\item
- Zero markdown: no ** ## __ or backticks
- Section headers: ALL CAPS plain text only
- Bullets: • character only — nothing else
- Name: first line, plain text
- Dates: "Jan 2023 – Dec 2024" format
- Contact info: separated by | character
- Preserve ALL URLs exactly as written
- NEVER fabricate companies, dates, or degrees
- NEVER add skills the person never mentioned
- NEVER remove any existing content
- Output MUST be same length or longer than input
- Return valid JSON only — no markdown fences

OPTIMIZATION STEPS — DO ALL FIVE:

STEP 1 — KEYWORD INJECTION (highest priority)
Missing keywords to inject: ${missingKeywords.slice(0, 20).join(', ')}
Rules:
- Inject EVERY missing keyword at least once
- Add missing tech skills directly to Skills section
- Inject remaining keywords into existing bullets
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
- First sentence: target job title + top 3 JD skills
- Second sentence: experience + key achievement
- Third sentence: value you bring to this role
- Total: 60-80 words maximum
- Include minimum 5 keywords from JD

STEP 4 — SKILLS REORGANIZATION
- List JD-matching skills FIRST in skills section
- Add all missing technical skills from JD
- Group by category: Languages, Frameworks, Tools, Databases, Cloud, Methodologies
- Keep only skills the person actually has

STEP 5 — SECTION ORDER FOR ATS
Reorder to this sequence for maximum ATS score:
1. Name + Contact
2. Professional Summary
3. Technical Skills
4. Experience / Internship
5. Projects
6. Education
7. Certifications
8. Languages

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
