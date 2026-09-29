import { NextRequest, NextResponse } from "next/server";
import { callAIText } from "@/lib/ai/router";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

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
  const metricRegex =
    /(\d+%|\d+\s*(percent|million|billion|k|m|x|%|\+)|years|months|\$\d+)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!/^\s*([-*•+]|\d+\.)\s+/.test(line)) continue;
    const clean = trimmed.replace(/^\s*([-*•+]|\d+\.)\s+/, "").trim();
    if (clean.length < 15 || clean.length > 200) continue;

    // Skip education or certification lines
    if (
      /^(b\.?tech|bachelor|master|degree|cbse|cgpa|gpa|percentage|school|college|university|certification|certified|course|awarded)/i.test(
        clean,
      )
    ) {
      continue;
    }

    // If it has NO metric/number
    if (!metricRegex.test(clean)) {
      let q =
        "What was the measurable outcome, scale, or percentage improvement achieved?";
      let h = "e.g., Improved efficiency by 35%, handled 10,000+ daily users";
      if (/performance|speed|latency|load|fast|optimi/i.test(clean)) {
        q = "By what percentage or time did performance or latency improve?";
        h = "e.g., Reduced response latency by 45%, cut page load time from 3s to 800ms";
      } else if (/user|client|customer|traffic|visitor/i.test(clean)) {
        q =
          "Approximately how many users, customers, or daily requests were handled?";
        h = "e.g., Scaled to 50k+ active users, handled 1M+ API calls daily";
      } else if (/test|bug|fix|issue|defect|error/i.test(clean)) {
        q =
          "How many issues/bugs did you resolve, or what test coverage % was reached?";
        h = "e.g., Resolved 80+ critical bugs, raised unit test coverage from 60% to 92%";
      } else if (/database|data|query|pipeline|etl|storage/i.test(clean)) {
        q =
          "What was the data volume processed, or by how much was query execution time reduced?";
        h = "e.g., Processed 2TB+ daily data, reduced query execution time by 60%";
      } else if (/api|service|backend|microservice|endpoint/i.test(clean)) {
        q =
          "How many endpoints did you develop, and what throughput or uptime was achieved?";
        h = "e.g., Built 25+ microservice endpoints, maintained 99.9% service uptime";
      } else if (/lead|managed|team|coordinate|collaborate/i.test(clean)) {
        q =
          "What was the size of the team, or what deadline/milestone did you achieve?";
        h = "e.g., Mentored a team of 4 engineers, delivered project 2 weeks ahead of schedule";
      }

      results.push({
        id: `q${results.length + 1}`,
        originalBullet: clean,
        question: q,
        hint: h,
      });

      if (results.length >= 4) break;
    }
  }

  return results;
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

    if (!user) {
      // For unauthenticated or preview environments, quickly return local inspection results
      const localQuestions = findWeakBulletsLocally(resumeText);
      return NextResponse.json({ questions: localQuestions });
    }

    logger.info(`[pre-check] Running AI pre-check for user: ${user.email}`);

    const prompt = `You are an expert ATS resume reviewer and career coach.
The user is about to optimize their resume for the target job description.

Job Description:
"""
${(jobDescription || "").substring(0, 3000)}
"""

Resume:
"""
${(resumeText || "").substring(0, 5000)}
"""

Task: Identify up to 4 weak, generic, or unquantified experience/project bullets that are missing measurable metrics (e.g. percentages, user scale, speed gains, dollar amounts, team size).
For each weak bullet, ask ONE direct, specific question so the user can provide the missing metric before optimization.

Output MUST be a raw JSON array only (no markdown, no preamble):
[
  {
    "id": "q1",
    "originalBullet": "exact bullet text from the resume",
    "question": "Specific question asking for the exact metric needed"
  }
]
`;

    let questions: any[] = [];
    try {
      const aiResult = await callAIText(prompt);
      let rawText = (aiResult || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(rawText);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch (parseErr: any) {
      logger.warn(
        `[pre-check] AI call failed or unparseable: ${parseErr.message}`,
      );
      questions = [];
    }

    // If AI didn't find any questions or failed, run local metric inspector
    if (!questions || questions.length === 0) {
      questions = findWeakBulletsLocally(resumeText);
    }

    return NextResponse.json({ questions: questions.slice(0, 4) });
  } catch (error: any) {
    logger.error(`[pre-check] Error: ${error.message}`);
    return NextResponse.json({ questions: [] });
  }
}
