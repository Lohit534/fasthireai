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
6. **FORMATTING STYLE & TEMPLATE**: Format the output resume text EXACTLY according to these template layout rules to match a clean academic/LaTeX layout:
   - **Centered Header**:
     - Line 1: Candidate Name (large, capitalized, bold using standard text e.g. "JOHN DOE" or "PEYYALA LOHIT")
     - Line 2: Contact info separated by em-dash: "Location/Country — Phone — Email"
     - Line 3: Social/profile URLs separated by em-dash: "LinkedIn — GitHub"
   - **Section Headings**: Keep section names in Title Case (e.g., "Professional Summary", "Technical Skills", "Projects", "Internship", "Education", "Certifications", "Languages"). Underneath each heading, place a divider line of exactly three hyphens: "---".
   - **Technical Skills**: Group and bold category labels, e.g., "**Programming Languages:** Python, SQL".
   - **Column Alignment**:
     - For projects, internship, and education entries, put the title/name on the left (in bold using markdown, e.g., "**B.Tech in Computer Science and Engineering**") and the date, metrics, or technologies on the right (e.g., "2022 – 2026" or italicized "*Python, SQL, Power BI*").
     - Separate the left and right parts with exactly 6 spaces so they can be parsed as side-by-side columns.
     - For organization names or descriptions (like university name and CGPA), put the organization on the left and the score/metric on the right separated by 6 spaces (e.g., "Bonam Venkata Chalamayya Institute of Technology and Science      CGPA: 7.62").
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
