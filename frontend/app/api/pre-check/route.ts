import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { detectMissingFields } from "@/lib/resume-inspector";
import { hasQuantifiedMetric, localScore } from "@/lib/ats/scorer";
import { extractActionVerbs } from "@/lib/ats/keywords";

export const runtime = "nodejs";
export const maxDuration = 30; // Quick pre-check, should take < 10s

function findWeakBulletsLocally(
  resumeText: string,
): Array<{ id: string; originalBullet: string; question: string; hint: string }> {
  const lines = (resumeText || "").split(/\r?\n/);
  const results: Array<{
    id: string;
    originalBullet: string;
    question: string;
    hint: string;
  }> = [];

  let currentSection = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();

    if (["CERTIFICATIONS", "CERTIFICATION", "ACHIEVEMENTS", "AWARDS", "EDUCATION", "LANGUAGES"].some(s => upper === s || upper.startsWith(s + " "))) {
      currentSection = upper;
      continue;
    }
    if (["EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "PROJECTS", "PERSONAL PROJECTS"].some(s => upper === s || upper.startsWith(s + " "))) {
      currentSection = upper;
    }

    if (currentSection.startsWith("CERT") || currentSection.startsWith("EDU") || currentSection.startsWith("LANG") || currentSection.startsWith("ACHIEV")) {
      continue;
    }

    const isBullet = /^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/.test(line);
    if (!isBullet && extractActionVerbs(line).length === 0) continue;

    const clean = trimmed.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "").trim();
    if (clean.length < 15 || clean.length > 250) continue;

    // Check if bullet lacks measurable metrics
    if (!hasQuantifiedMetric(clean)) {
      let q = "What was the measurable outcome, scale, or percentage improvement achieved?";
      let h = "e.g., Improved efficiency by 35%, handled 10,000+ daily users, reduced latency by 40ms";

      if (/performance|speed|latency|load|fast|optimi/i.test(clean)) {
        q = "By what percentage or time did performance, speed, or latency improve?";
        h = "e.g., Reduced response latency by 45%, cut page load time from 3s to 800ms";
      } else if (/user|client|customer|traffic|visitor/i.test(clean)) {
        q = "Approximately how many users, customers, or daily requests were handled?";
        h = "e.g., Scaled to 50k+ active users, handled 1M+ API calls daily";
      } else if (/test|bug|fix|issue|defect|error|coverage/i.test(clean)) {
        q = "How many issues/bugs did you resolve, or what test coverage % was reached?";
        h = "e.g., Resolved 80+ critical bugs, raised unit test coverage from 60% to 92%";
      } else if (/database|data|query|pipeline|etl|storage|cache/i.test(clean)) {
        q = "What was the data volume processed, or by how much was query execution time reduced?";
        h = "e.g., Processed 2TB+ daily data, reduced query execution time by 60%";
      } else if (/api|service|backend|microservice|endpoint/i.test(clean)) {
        q = "How many endpoints did you develop, and what throughput or uptime was achieved?";
        h = "e.g., Built 25+ microservice endpoints, maintained 99.9% service uptime";
      } else if (/lead|managed|team|coordinate|collaborate/i.test(clean)) {
        q = "What was the size of the team, or what deadline/milestone did you achieve?";
        h = "e.g., Mentored a team of 4 engineers, delivered project 2 weeks ahead of schedule";
      }

      results.push({
        id: `bullet_q${results.length + 1}`,
        originalBullet: clean,
        question: q,
        hint: h,
      });

      if (results.length >= 3) break;
    }
  }

  return results;
}

export function gatherAllMissingQuestions(resumeText: string, jobDescription?: string) {
  const questions: Array<{
    id: string;
    category: "year_date" | "tech_stack" | "metrics" | "education" | "general";
    title: string;
    originalBullet?: string;
    question: string;
    hint: string;
  }> = [];

  const text = resumeText || "";
  const upperText = text.toUpperCase();

  // 1. Missing Year / Dates / Duration (experience or total years)
  const datePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+20\d{2}\b|\b20\d{2}\s*[–\-]\s*(20\d{2}|Present|Current)\b/i;
  const hasExpDates = datePattern.test(text);
  const hasYearsMentioned = /\b\d+\+?\s*years?\b/i.test(text);

  if (!hasExpDates || !hasYearsMentioned) {
    questions.push({
      id: "experience_dates",
      category: "year_date",
      title: "Work / Internship Dates & Year",
      question: "What were the start and end dates or year range for your experience/internship?",
      hint: "e.g., Jan 2023 – Present or 2022 – 2024 (or total years like '3+ years')",
    });
  }

  // 2. Education Details (Graduation year & CGPA/GPA)
  const hasEducation =
    upperText.includes("EDUCATION") ||
    upperText.includes("B.TECH") ||
    upperText.includes("BACHELOR") ||
    upperText.includes("COLLEGE") ||
    upperText.includes("UNIVERSITY");

  const hasGPA = /(GPA|CGPA|%)\s*:?\s*[\d.]+/i.test(text);
  const hasGradYear = /\b20\d{2}\b/.test(text);

  if (hasEducation && (!hasGPA || !hasGradYear)) {
    questions.push({
      id: "education_details",
      category: "education",
      title: "Graduation Year & GPA / CGPA",
      question: "What is your graduation year and GPA/CGPA or percentage?",
      hint: "e.g., 2021 – 2025 | CGPA: 8.5 / 10",
    });
  }

  // 3. Weak experience / project bullets missing quantifiable metrics
  const weakBullets = findWeakBulletsLocally(resumeText);
  for (const b of weakBullets) {
    questions.push({
      id: b.id,
      category: "metrics",
      title: "Quantified Metric",
      originalBullet: b.originalBullet,
      question: b.question,
      hint: b.hint,
    });
  }

  // 4. Missing target Job Description skills
  if (jobDescription && jobDescription.length > 50) {
    const score = localScore(resumeText, jobDescription);
    const topMissing = score.missingKeywords.slice(0, 3);
    if (topMissing.length > 0) {
      questions.push({
        id: "target_skills",
        category: "tech_stack",
        title: "Target Job Skills Alignment",
        question: `Do you have experience with ${topMissing.join(", ")}? Enter any you have worked with:`,
        hint: `e.g., ${topMissing.join(", ")}`,
      });
    }
  }

  // Fallback: Project tech stack if missing
  const hasProjects = upperText.includes("PROJECT");
  const techPattern = /\b(Python|Java|React|Node|TypeScript|PostgreSQL|Docker|AWS|SQL)\b/i;
  if (hasProjects && !techPattern.test(text)) {
    questions.push({
      id: "project_tech_stack",
      category: "tech_stack",
      title: "Project Technologies & Tools",
      question: "Which technologies and frameworks were used in your projects?",
      hint: "e.g., React, Node.js, Python, PostgreSQL, AWS",
    });
  }

  return questions.slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jobDescription } = await request.json();

    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json({ questions: [] });
    }

    // 1. Verify auth (optional fallback for guest/sample mode)
    const supabase = createClient();
    let {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const { data: tokenData } = await supabase.auth.getUser(token);
        if (tokenData?.user) user = tokenData.user;
      }
    }

    // Gather all structural missing fields (years, dates, GPA, stack) and weak metrics
    const questions = gatherAllMissingQuestions(resumeText, jobDescription);
    return NextResponse.json({ questions });
  } catch (error: any) {
    logger.error(`[pre-check] Error: ${error.message}`);
    return NextResponse.json({ questions: [] });
  }
}
