export function buildOptimizationPrompt(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  extractedSkills: string[],
  instructions = "",
  lengthOption = "Auto-detect"
): string {
  // Truncate input to respect tokens/size requirements
  const truncatedJd = jobDescription.slice(0, 2500);
  const truncatedResume = resumeText.slice(0, 3500);
  
  // Select top 15 missing keywords
  const topMissingKeywords = missingKeywords.slice(0, 15);

  let lengthDirective = "";
  if (lengthOption === "1 Page") {
    lengthDirective = "\n- **STRICT PAGE LIMIT**: Optimize the content to fit exactly on a single page. Remove wordy sentences and prioritize the top 3-4 bullets per job.";
  } else if (lengthOption === "2 Pages") {
    lengthDirective = "\n- **STRICT PAGE LIMIT**: Structure the content to span exactly 2 pages. Add formatting spacing or detail work items where appropriate.";
  } else if (lengthOption === "Academic CV") {
    lengthDirective = "\n- **ACADEMIC CV FORMAT**: Structure the document as a comprehensive academic CV. Retain detailed descriptions, research details, and publication lists.";
  }
  
  let instructionsBlock = "";
  if (instructions && instructions.trim()) {
    instructionsBlock = `\n\n### USER CUSTOM INSTRUCTIONS:\nApply these specific changes or focus directives strictly: "${instructions.trim()}"`;
  }
  
  return `You are a professional resume optimizer and ATS expert.
Your goal is to optimize the Candidate's Resume to better align with the Job Description.

### STRICT RULES & CONSTRAINTS:
1. **NO FABRICATION**: NEVER fabricate or make up companies, employment dates, degrees, certifications, job titles, or candidate achievements. Only work with the information provided.
2. **NATURAL KEYWORD INJECTION**: Inject the following missing keywords from the job description naturally into the experience, projects, or skills sections where they fit contextually:
   Keywords to inject: ${topMissingKeywords.join(", ")}
3. **STRONG ACTION VERBS**: Rewrite weak or passive bullet points in the experience or project sections to start with strong action verbs (e.g., "automated", "refactored", "implemented", "scaled").
4. **NO ARTIFICIAL QUANTIFICATION**: Add quantification (numbers, percentages, metrics) ONLY where it is clearly implied by the context. Do not invent arbitrary numbers (e.g., do not randomly change "improved speed" to "improved speed by 47%").
5. **PRESERVE STRUCTURE**: Keep all original sections (Experience, Projects, Education, etc.) intact.
6. **PRESERVE ALL LINKS**: Keep all URLs exactly as written. Do not remove, shorten, or modify any URLs. Keep LinkedIn, GitHub, and project URLs intact.
7. **CRITICAL OUTPUT RULES**:
   - Return PLAIN TEXT ONLY — no LaTeX, no markdown, no HTML
   - Do NOT use \textbf{}, \section{}, \begin{}, \end{}, \\, \item, \resumeItem, or ANY LaTeX commands
   - Do NOT use **, ##, __, or any markdown syntax
   - Section headers: write in ALL CAPS plain text only
     Example: EXPERIENCE  not  \section{Experience}
   - Bullet points: start with • character only
     Example: • Built a REST API  not  \item Built a REST API
   - Name: first line, plain text only
   - Dates and locations: plain text separated by | character
     Example: Software Engineer | Google | Jan 2023 – Dec 2024
   - The output must be readable as plain text with zero special formatting characters
7. **FORMATTING STYLE & TEMPLATE**: Format the output resume text EXACTLY according to these template layout rules:
   - **Centered Header**:
     - Line 1: Candidate Name (large, capitalized, e.g. "JOHN DOE" or "PEYYALA LOHIT")
     - Line 2: Contact info separated by vertical pipe: "email | phone | location/country" (e.g. "lohithpeyyala@gmail.com | 7095649929 | india")
     - Line 3: Social/profile URLs separated by vertical pipe: "LinkedIn | GitHub"
   - **Section Headings**: Keep section names in ALL CAPS (e.g., "PROFESSIONAL SUMMARY", "EXPERIENCE", "EDUCATION", "PROJECTS", "TECHNICAL SKILLS", "CERTIFICATIONS").
   - **Technical Skills**: Group category labels, e.g., "Programming Languages: Python, SQL".
   - **Column Alignment**:
     - For education entries, place the degree/field on the left (e.g. "B.Tech in Computer Science and Engineering") on its own line. On the next line, place the school/college name on the left (e.g. "Bonam Venchalayya Institute of Tech") and the date on the right (e.g. "2022 – 2026"), separating them with exactly 6 spaces. Below that, place the CGPA/GPA on the left on its own line (e.g. "CGPA: 7.62").
     - For project entries, place the project name on the left (e.g. "MiniMedi - AI Symptom Checker") and the tech stack list on the right (prefix with a pipe, e.g. "| ReactJS, PostgreSQL"), separating them with exactly 6 spaces.
     - For experience entries, place the title on the left (e.g. "Inside Sales Representative") and the date on the right (e.g. "2022 – 2026"), separating them with exactly 6 spaces. Below that, place the company name on the left (e.g. "Glowlogics Solutions") on its own line.
   - **Bullets**: Use the bullet character "•" (and only "•") for all list items. Do not use dashes or asterisks. ${lengthDirective}
7. **OUTPUT FORMAT**: You must respond ONLY with a raw JSON object matching the schema below. Do not wrap the JSON output in markdown code block fences (e.g., do not use \`\`\`json or \`\`\`). Your output must be directly parseable by JSON.parse().

### JSON SCHEMA:
{
  "resume": "The entire optimized resume text as a single string, including sections, formatting, and newlines.",
  "keywordsAdded": ["Array", "of", "keywords", "from", "the", "missing", "list", "that", "you", "successfully", "integrated"],
  "changesCount": 5, // Total count of bullet points or sections modified
  "summary": "A concise explanation of the changes made and how they improve the resume's alignment.",
  "detectedJobTitle": "The job title or role name extracted from the target job description (e.g., Inside Sales Representative)",
  "detectedCompany": "The company name extracted from the target job description (e.g., Glowlogics Solutions)"
}

### INPUT DATA:
#### TARGET JOB DESCRIPTION (Truncated):
${truncatedJd}${instructionsBlock}

#### CANDIDATE CURRENT RESUME (Truncated):
${truncatedResume}

#### CURRENT EXTRACTED SKILLS:
${extractedSkills.join(", ")}

Respond with the exact JSON object now.`;
}
