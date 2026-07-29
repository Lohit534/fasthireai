// Structured Resume JSON schema
// Used by the AI to return optimized resume data
// and by the PDF renderer to generate professional PDFs

export interface ResumeHeader {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface ResumeSkillCategory {
  category: string;  // e.g. "Programming Languages"
  items: string[];   // e.g. ["Python", "TypeScript", "Java"]
}

export interface ResumeExperience {
  role: string;
  company: string;
  duration: string;   // e.g. "Jan 2023 – Dec 2024"
  location?: string;
  bullets: string[];  // 4-5 action-verb bullets
}

export interface ResumeProject {
  title: string;
  stack: string[];    // Technology stack
  link?: string;      // Optional GitHub/live link
  bullets: string[];  // 4-5 action-oriented bullets
}

export interface ResumeEducation {
  degree: string;       // e.g. "B.Tech in Computer Science"
  institution: string;  // e.g. "Bonam Venchalaiah Institute of Technology"
  university?: string;  // Affiliated university (if applicable)
  cgpa?: string;        // e.g. "7.62 / 10.0"
  year: string;         // e.g. "2022 – 2026"
}

export interface ResumeJSON {
  header: ResumeHeader;
  summary: string;                      // 40–70 words, no pronouns
  skills: ResumeSkillCategory[];
  experience?: ResumeExperience[];
  projects?: ResumeProject[];
  education: ResumeEducation[];
  certifications?: string[];
  achievements?: string[];
  languages?: string[];
  // Metadata fields returned by AI
  keywordsAdded?: string[];
  changesCount?: number;
  summaryChanges?: string;
  detectedJobTitle?: string;
  detectedCompany?: string;
}
