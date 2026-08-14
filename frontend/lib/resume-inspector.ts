/**
 * resume-inspector.ts
 * Scans resume text before optimization and identifies missing critical fields
 * that would make the AI result inaccurate. Returns a list of prompts to show the user.
 */

export interface MissingField {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  type: "text" | "textarea";
  section: string;
  required: boolean;
}

/**
 * Detects missing or incomplete fields in the resume text.
 * Returns an array of MissingField objects that should be filled before optimization.
 */
export function detectMissingFields(resumeText: string): MissingField[] {
  const fields: MissingField[] = [];
  const text = resumeText || "";
  const upperText = text.toUpperCase();

  // ── 1. Internship / Experience missing dates ─────────────────────────
  const hasExperience =
    upperText.includes("EXPERIENCE") ||
    upperText.includes("INTERNSHIP") ||
    upperText.includes("INTERN");

  if (hasExperience) {
    // Check for date patterns: e.g. "Jan 2024", "2024", "Jan 2024 – Mar 2024"
    const datePattern =
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+20\d{2}\b|\b20\d{2}\s*[–\-]\s*(20\d{2}|Present|Current)\b/i;
    const hasAnyDates = datePattern.test(text);

    if (!hasAnyDates) {
      fields.push({
        id: "experience_dates",
        label: "Internship / Experience Duration",
        description:
          'Add dates for your internship or work experience (e.g. "Jan 2024 – Mar 2024" or "June 2023 – Present")',
        placeholder: "e.g. Jan 2024 – Mar 2024",
        type: "text",
        section: "Experience / Internship",
        required: true,
      });
    }
  }

  // ── 2. Projects missing tech stack ───────────────────────────────────
  const hasProjects =
    upperText.includes("PROJECT") || upperText.includes("PROJECTS");

  if (hasProjects) {
    // Tech stack typically follows a project title separated by | or comma list of tools
    const techPattern =
      /\|\s*[A-Za-z]|\b(Python|Java|React|Node|Django|Flask|Spring|MySQL|MongoDB|PostgreSQL|JavaScript|TypeScript|HTML|CSS|REST|API|Docker|AWS|Git|TensorFlow|PyTorch|Keras|Pandas|NumPy|Next\.?js|Express|Redux|Vue|Angular|Bootstrap|Tailwind|FastAPI|SQLite|Firebase|Redis|Kubernetes|CI\/CD|Machine Learning|Deep Learning|NLP|Computer Vision)\b/i;
    const hasTechStack = techPattern.test(text);

    if (!hasTechStack) {
      fields.push({
        id: "project_tech_stack",
        label: "Project Tech Stack / Technologies Used",
        description:
          "List the technologies, frameworks, and tools used in your projects (used for ATS keyword matching)",
        placeholder:
          "e.g. Python, Django, React, MySQL, REST APIs, Machine Learning",
        type: "text",
        section: "Projects",
        required: true,
      });
    }
  }

  // ── 3. Skills section missing or too sparse ───────────────────────────
  const hasSkills =
    upperText.includes("SKILL") ||
    upperText.includes("TECHNICAL") ||
    upperText.includes("COMPETENCIES");

  if (!hasSkills) {
    fields.push({
      id: "skills",
      label: "Technical Skills",
      description:
        "List your technical skills, programming languages, and tools. This is critical for ATS scoring.",
      placeholder:
        "e.g. Java, Python, Spring Boot, SQL, REST APIs, Git, HTML, CSS",
      type: "textarea",
      section: "Technical Skills",
      required: true,
    });
  }

  // ── 4. No contact info (phone or email) ──────────────────────────────
  const hasEmail = /[\w.+-]+@[\w-]+\.\w+/.test(text);
  const hasPhone = /\+?\d[\d\s\-()]{7,}/.test(text);

  if (!hasEmail && !hasPhone) {
    fields.push({
      id: "contact_info",
      label: "Contact Information",
      description:
        "Add your email and phone number so the optimized resume is complete",
      placeholder: "e.g. yourname@email.com | +91 9876543210",
      type: "text",
      section: "Contact",
      required: false,
    });
  }

  // ── 5. Education missing CGPA / GPA ──────────────────────────────────
  const hasEducation =
    upperText.includes("EDUCATION") ||
    upperText.includes("B.TECH") ||
    upperText.includes("BTECH") ||
    upperText.includes("BACHELOR") ||
    upperText.includes("UNIVERSITY") ||
    upperText.includes("COLLEGE");

  if (hasEducation) {
    const hasGPA = /(GPA|CGPA|%)\s*:?\s*[\d.]+/i.test(text);
    const hasEduDates =
      /\b(20\d{2})\s*[-–]\s*(20\d{2}|Present|Current)\b/i.test(text);

    if (!hasGPA && !hasEduDates) {
      fields.push({
        id: "education_details",
        label: "Education Details (GPA & Year)",
        description:
          'Add your GPA/CGPA and graduation year range (e.g. "CGPA: 8.5 | 2021 – 2025")',
        placeholder: "e.g. CGPA: 8.5 | 2021 – 2025",
        type: "text",
        section: "Education",
        required: false,
      });
    }
  }

  // ── 6. No LinkedIn or GitHub ──────────────────────────────────────────
  const hasLinkedIn =
    text.toLowerCase().includes("linkedin") ||
    text.toLowerCase().includes("linkedin.com");
  const hasGitHub =
    text.toLowerCase().includes("github") ||
    text.toLowerCase().includes("github.com");

  if (!hasLinkedIn && !hasGitHub) {
    fields.push({
      id: "profile_links",
      label: "LinkedIn / GitHub Profile Links",
      description:
        "Add your LinkedIn and GitHub URLs — recruiters and ATS systems check for these",
      placeholder: "e.g. linkedin.com/in/yourname | github.com/yourname",
      type: "text",
      section: "Contact",
      required: false,
    });
  }

  return fields;
}

/**
 * Merges user-provided answers back into the resume text as supplementary context
 * appended to the bottom so the AI sees the complete picture.
 * This does NOT modify the parsed resume structure.
 */
export function enrichResumeWithAnswers(
  resumeText: string,
  answers: Record<string, string>
): string {
  if (!answers || Object.keys(answers).length === 0) return resumeText;

  const enrichments: string[] = [];

  if (answers.experience_dates?.trim()) {
    enrichments.push(`[User Provided] Internship/Experience Duration: ${answers.experience_dates.trim()}`);
  }
  if (answers.project_tech_stack?.trim()) {
    enrichments.push(`[User Provided] Project Technologies: ${answers.project_tech_stack.trim()}`);
  }
  if (answers.skills?.trim()) {
    enrichments.push(`[User Provided] Additional Skills: ${answers.skills.trim()}`);
  }
  if (answers.contact_info?.trim()) {
    enrichments.push(`[User Provided] Contact: ${answers.contact_info.trim()}`);
  }
  if (answers.education_details?.trim()) {
    enrichments.push(`[User Provided] Education Details: ${answers.education_details.trim()}`);
  }
  if (answers.profile_links?.trim()) {
    enrichments.push(`[User Provided] Profile Links: ${answers.profile_links.trim()}`);
  }

  if (enrichments.length === 0) return resumeText;

  return `${resumeText}\n\n--- USER SUPPLEMENTAL DETAILS (incorporate these into the optimization) ---\n${enrichments.join("\n")}`;
}
