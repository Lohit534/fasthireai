import type { ResumeJSON } from "@/types/resume";
import { getPageBudget } from "@/lib/resume-format";

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

  // Dynamic page budget from the candidate's real experience dates
  const pageBudget = getPageBudget(resumeText);

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
    "TECH TERMS NEVER SPLIT ACROSS LINES:\n" +
    "MySQL TypeScript JavaScript PostgreSQL MongoDB Spring Boot Node.js Next.js\n" +
    "React.js Vue.js GraphQL FastAPI Django Kubernetes Docker TensorFlow PyTorch\n" +
    "GitHub GitLab VS Code Power BI CI/CD Machine Learning Deep Learning DevOps\n" +
    "REST API Microservices Cloud Native\n\n" +
    "EXACT SECTION ORDER (follow exactly):\n" +
    (pageBudget.level === "fresher"
      ? "1. NAME\n" +
        "2. Target Role / Subtitle (e.g. Java Backend Developer)\n" +
        "3. contact line (phone | email | LinkedIn | GitHub | Portfolio)\n" +
        "4. (blank line)\n" +
        "5. PROFESSIONAL SUMMARY\n" +
        "6. (blank line)\n" +
        "7. TECHNICAL SKILLS\n" +
        "8. (blank line)\n" +
        "9. PROJECTS\n" +
        "10. (blank line)\n" +
        "11. CERTIFICATIONS & ACHIEVEMENTS  (omit if candidate has none)\n" +
        "12. (blank line)\n" +
        "13. EDUCATION\n\n"
      : "1. NAME\n" +
        "2. Target Role / Subtitle (e.g. Senior Java Backend Developer)\n" +
        "3. contact line (phone | email | LinkedIn | GitHub | Portfolio)\n" +
        "4. (blank line)\n" +
        "5. PROFESSIONAL SUMMARY\n" +
        "6. (blank line)\n" +
        "7. PROFESSIONAL EXPERIENCE\n" +
        "8. (blank line)\n" +
        "9. TECHNICAL SKILLS\n" +
        "10. (blank line)\n" +
        "11. PROJECTS\n" +
        "12. (blank line)\n" +
        "13. CERTIFICATIONS  (omit if candidate has none)\n" +
        "14. (blank line)\n" +
        "15. EDUCATION\n\n") +
    "EXACT LINE FORMAT FOR EACH SECTION:\n\n" +
    "NAME LINE:\n" +
    "  Candidate full name -- e.g. DINESH KAARTHIK MOODE\n\n" +
    "ROLE SUBTITLE LINE:\n" +
    "  Target Job Title / Domain matching the JD -- e.g. Java Backend Developer\n\n" +
    "CONTACT LINE (single line, | separator):\n" +
    "  phone | email | LinkedIn URL | GitHub URL | portfolio URL\n" +
    "  Preserve ALL URLs exactly as in original resume. Avoid personal info (photo, father's name, marital status, full address).\n\n" +
    "PROFESSIONAL SUMMARY:\n" +
    "  Header: PROFESSIONAL SUMMARY (ALL CAPS)\n" +
    "  Content: 2-4 lines (45-70 words) pure narrative paragraph, NO bullets\n" +
    "  Must state: candidate's target role, core technologies, type of systems built, and career value.\n" +
    "  AVOID generic clichés: 'I am hardworking', 'Quick learner', 'Self motivated', 'Passionate'.\n" +
    "  INSTEAD use direct impact: 'Java Backend Developer with hands-on experience building REST APIs using Spring Boot and MySQL.'\n\n" +
    "TECHNICAL SKILLS:\n" +
    "  Header: TECHNICAL SKILLS (ALL CAPS)\n" +
    "  Organized into clean 'Category: values' lines (each on ONE single line):\n" +
    "    Programming Languages: Java, SQL, JavaScript\n" +
    "    Frameworks: Spring Boot, Spring MVC, Hibernate, JPA\n" +
    "    Databases: MySQL, PostgreSQL, DynamoDB, MongoDB\n" +
    "    Developer Tools: Git, GitHub, Maven, Postman, Docker, IntelliJ IDEA\n" +
    "    Cloud: AWS (EC2, S3), GCP (if applicable)\n" +
    "    Core Concepts: REST APIs, Microservices, OOP, Multithreading, JWT Authentication\n" +
    "  List JD-matching skills FIRST in each category\n\n" +
    "PROFESSIONAL EXPERIENCE:\n" +
    "  Header: PROFESSIONAL EXPERIENCE (ALL CAPS)\n" +
    "  For each role:\n" +
    "    Line 1: Role Title | Company Name | Tech Stack (optional)\n" +
    "    Line 2: Month YYYY - Month YYYY  (or Present)\n" +
    "    Lines 3+: bullet Strong bullet (one per line)\n" +
    "  Every bullet MUST begin with a powerful past-tense action verb and quantify impact.\n\n" +
    "PROJECTS:\n" +
    "  Header: PROJECTS (ALL CAPS)\n" +
    "  For each project:\n" +
    "    Line 1: Project Name — Tech Stack | Year or Dates\n" +
    "    Lines 2+: 2-4 impact-oriented bullets describing contributions, architectures, and outcomes.\n\n" +
    "EDUCATION:\n" +
    "  Header: EDUCATION (ALL CAPS)\n" +
    "  For each entry:\n" +
    "    Line 1: Degree Name | Graduated: YYYY (or Month YYYY - Month YYYY)\n" +
    "    Line 2: Institution Name | CGPA: X.XX (only if in original)\n\n" +
    "CERTIFICATIONS & ACHIEVEMENTS:\n" +
    "  Header: CERTIFICATIONS & ACHIEVEMENTS (or CERTIFICATIONS)\n" +
    "  Format: • Certification Name - Issuing Body (Year): Key skills covered\n\n" +
    sep + "\n" +
    "STEP 1 — METRIC & DETAIL INTEGRATION\n" +
    sep + "\n\n" +
    "Integrate all candidate metrics, technologies, and facts directly into the bullet rewrites.\n" +
    "If the user has provided supplemental metrics or answers in the instructions, you MUST weave them directly into the corresponding bullets.\n" +
    "For bullets lacking numbers, provide realistic, contextual impact quantification (e.g. 'improving processing speed by 35%', 'serving 15k+ active users', 'reducing latency by 40%').\n" +
    "Do NOT leave raw [ADD: ...] placeholders in the final resume text; produce complete, natural, recruiter-ready sentences.\n\n" +
    sep + "\n" +
    "STEP 2 — KEYWORD INJECTION\n" +
    sep + "\n\n" +
    "TASK 1 -- KEYWORD INJECTION (top priority):\n" +
    "Keywords to inject (ALL of them, at least once each):\n" +
    (keywordList || "(inject all JD tech terms you can identify)") + "\n\n" +
    "Rules:\n" +
    "- Add every technical keyword to the appropriate Technical Skills category\n" +
    "- Weave remaining keywords naturally into existing bullet rewrites\n" +
    "- Match EXACT casing from the JD (e.g., React.js not ReactJS)\n" +
    "- Rewrite the Professional Summary to include 5+ top JD keywords\n\n" +
    sep + "\n" +
    "STEP 3 — BULLET REWRITING (Experience and Projects ONLY)\n" +
    sep + "\n\n" +
    "Formula: [Strong Verb] + [What] + [Tool/Method] + [Quantified Result]\n\n" +
    "CRITICAL: Apply this formula ONLY to Professional Experience and Projects sections. NEVER apply this to Languages, Education, or Certifications. Leave those sections purely factual and unchanged.\n\n" +
    "Transform examples:\n" +
    "WEAK: 'Worked on backend' → 'Engineered RESTful APIs with Node.js and Express, handling 25k+ daily requests and reducing p95 latency by 35%'\n" +
    "WEAK: 'Did data analysis' → 'Analyzed 500,000+ data records using Python and Pandas, improving reporting accuracy by 28%'\n" +
    "WEAK: 'Used Docker' → 'Containerized 12 microservices with Docker and Kubernetes on AWS, cutting deployment turnaround by 45%'\n\n" +
    "40 POWERFUL ACTION VERBS (use these to start EVERY bullet point):\n" +
    "Developed, Designed, Built, Implemented, Engineered, Optimized, Automated, Integrated, Improved, Reduced,\n" +
    "Created, Configured, Deployed, Refactored, Migrated, Enhanced, Accelerated, Streamlined, Maintained,\n" +
    "Secured, Validated, Tested, Documented, Analyzed, Solved, Led, Delivered, Collaborated, Architected,\n" +
    "Monitored, Debugged, Scaled, Generated, Processed, Queried, Visualized, Researched, Evaluated, Simplified,\n" +
    "Modernized.\n\n" +
    "Transform examples:\n" +
    "WEAK: 'Worked on backend' → 'Developed 12+ REST APIs using Spring Boot, reducing API response time by 30% through query optimization.'\n" +
    "WEAK: 'Optimized queries' → 'Optimized MySQL queries reducing average API response latency by nearly 30% under heavy load.'\n" +
    "WEAK: 'Did authentication' → 'Implemented JWT authentication and role-based access control, securing 20+ endpoints validated with Postman.'\n\n" +
    "Quantification rules:\n" +
    "- Weave verified user-provided numbers and metrics wherever available\n" +
    "- If a metric is implied by context, state the realistic outcome with measurable impact (%, scale, throughput, speed)\n" +
    "- Ensure every bullet reads as a strong, accomplished accomplishment\n" +
    "- NEVER use generic corporate filler words\n\n" +
    sep + "\n" +
    "STEP 4 — SUMMARY REWRITE\n" +
    sep + "\n\n" +
    "TASK 4 -- SUMMARY REWRITE:\n" +
    "- Sentence 1: [Years / fresher] in [target role from JD] specializing in [top 3 JD skills]\n" +
    "- Sentence 2: [Key achievement from resume or strong capability statement with JD tech]\n" +
    "- Sentence 3: [Value proposition matching the JD role and organization type]\n" +
    "- 55-80 words total, no bullets, no dashes, include 6+ JD keywords\n\n" +
    sep + "\n" +
    "STEP 5 — SKILLS REORGANIZATION\n" +
    sep + "\n\n" +
    "TASK 3 -- SKILLS REORGANIZATION:\n" +
    "- Put JD-matching skills FIRST in every category\n" +
    "- Add every missing JD technical skill to the most relevant category\n" +
    "- Use ONLY these 5 categories (no others): " + SKILL_CATEGORIES.join(", ") + "\n\n" +
    sep + "\n" +
    "PRESERVATION RULES (never violate)\n" +
    sep + "\n\n" +
    "✓ KEEP all company names exactly as written\n" +
    "✓ KEEP all dates exactly as written\n" +
    "✓ KEEP all education details exactly\n" +
    "✓ KEEP all URLs and links exactly\n" +
    "✓ KEEP all certifications exactly\n" +
    "✓ KEEP all project names exactly\n" +
    "✓ NEVER fabricate companies, employers, universities, or degrees\n" +
    "✓ NEVER change employment dates\n" +
    "✓ NEVER remove any section from the original (you may tighten wording to respect the PAGE BUDGET)\n" +
    "✓ Respect the PAGE BUDGET below -- it overrides any desire to add more text\n\n" +
    sep + "\n" +
    "PAGE BUDGET (decided dynamically from the candidate's experience)\n" +
    sep + "\n" +
    pageBudget.instructions + "\n\n" +
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
    "[ ] Every experience AND project bullet starts with a strong past-tense verb AND contains a number/metric\n" +
    "[ ] Education institution copied verbatim -- no added university names or placeholders\n" +
    "[ ] Resume fits the PAGE BUDGET (" + pageBudget.maxPages + " page" + (pageBudget.maxPages > 1 ? "s" : "") + " max)\n" +
    "[ ] Metrics/numbers added or [ADD:] placeholders used where missing\n" +
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
    "  \"resume\": \"COMPLETE optimized resume -- every section, every role and project, fitted to the PAGE BUDGET. No placeholders.\",\n" +
    "  \"keywordsAdded\": [\"keyword1\", \"keyword2\", \"keyword3\"],\n" +
    "  \"placeholders\": [\n" +
    "    {\n" +
    "      \"line\": \"the full bullet or line that contains the placeholder\",\n" +
    "      \"placeholder\": \"[ADD: quantified metric — e.g. '40%']\",\n" +
    "      \"hint\": \"Add a specific percentage or number like 35% or 500+ to show your impact\",\n" +
    "      \"section\": \"PROFESSIONAL EXPERIENCE\"\n" +
    "    }\n" +
    "  ],\n" +
    "  \"bulletsRewritten\": 8,\n" +
    "  \"changesCount\": 15,\n" +
    "  \"summary\": \"X keywords injected, Y bullets rewritten, Z placeholders need your input\"\n" +
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
