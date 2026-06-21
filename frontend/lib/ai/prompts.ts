export function buildOptimizationPrompt(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[],
  extractedSkills: string[]
): string {
  // Truncate input to respect tokens/size requirements
  const truncatedJd = jobDescription.slice(0, 2500);
  const truncatedResume = resumeText.slice(0, 3500);
  
  // Select top 15 missing keywords
  const topMissingKeywords = missingKeywords.slice(0, 15);
  
  return `You are a professional resume optimizer and ATS expert.
Your goal is to optimize the Candidate's Resume to better align with the Job Description.

### STRICT RULES & CONSTRAINTS:
1. **NO FABRICATION**: NEVER fabricate or make up companies, employment dates, degrees, certifications, job titles, or candidate achievements. Only work with the information provided.
2. **NATURAL KEYWORD INJECTION**: Inject the following missing keywords from the job description naturally into the experience, projects, or skills sections where they fit contextually:
   Keywords to inject: ${topMissingKeywords.join(", ")}
3. **STRONG ACTION VERBS**: Rewrite weak or passive bullet points in the experience or project sections to start with strong action verbs (e.g., "automated", "refactored", "implemented", "scaled").
4. **NO ARTIFICIAL QUANTIFICATION**: Add quantification (numbers, percentages, metrics) ONLY where it is clearly implied by the context. Do not invent arbitrary numbers (e.g., do not randomly change "improved speed" to "improved speed by 47%").
5. **PRESERVE STRUCTURE**: Keep all original sections (Experience, Projects, Education, etc.) intact. Maintain the candidate's name and contact information.
6. **BULLET SYMBOL**: Use the bullet character "•" (and only "•") for all bulleted list items. Do not use dashes or asterisks.
7. **OUTPUT FORMAT**: You must respond ONLY with a raw JSON object matching the schema below. Do not wrap the JSON output in markdown code block fences (e.g., do not use \`\`\`json or \`\`\`). Your output must be directly parseable by JSON.parse().

### JSON SCHEMA:
{
  "resume": "The entire optimized resume text as a single string, including sections, formatting, and newlines.",
  "keywordsAdded": ["Array", "of", "keywords", "from", "the", "missing", "list", "that", "you", "successfully", "integrated"],
  "changesCount": 5, // Total count of bullet points or sections modified
  "summary": "A concise explanation of the changes made and how they improve the resume's alignment."
}

### INPUT DATA:
#### TARGET JOB DESCRIPTION (Truncated):
${truncatedJd}

#### CANDIDATE CURRENT RESUME (Truncated):
${truncatedResume}

#### CURRENT EXTRACTED SKILLS:
${extractedSkills.join(", ")}

Respond with the exact JSON object now.`;
}
