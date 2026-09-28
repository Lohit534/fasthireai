import { NextRequest, NextResponse } from "next/server";
import { callAIText } from "@/lib/ai/router";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30; // Quick pre-check, should take < 10s

function findWeakBulletsLocally(resumeText: string): Array<{ id: string; originalBullet: string; question: string }> {
  const lines = (resumeText || "").split(/\r?\n/);
  const results: Array<{ id: string; originalBullet: string; question: string }> = [];
  const metricRegex = /(\d+%|\d+\s*(percent|million|billion|k|m|x|%|\+)|years|months|\$\d+)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!/^\s*([-*•+]|\d+\.)\s+/.test(line)) continue;
    const clean = trimmed.replace(/^\s*([-*•+]|\d+\.)\s+/, "").trim();
    if (clean.length < 15 || clean.length > 200) continue;

    // Skip education or certification lines
    if (/^(b\.?tech|bachelor|master|degree|cbse|cgpa|gpa|percentage|school|college|university|certification|certified|course|awarded)/i.test(clean)) {
      continue;
    }

    // If it has NO metric/number
    if (!metricRegex.test(clean)) {
      let q = "What was the measurable outcome, scale, or percentage improvement achieved?";
      if (/performance|speed|latency|load|fast|optimi/i.test(clean)) {
        q = "By what percentage or time did performance or latency improve?";
      } else if (/user|client|customer|traffic|visitor/i.test(clean)) {
        q = "Approximately how many users, customers, or daily requests were handled?";
      } else if (/test|bug|fix|issue|defect|error/i.test(clean)) {
        q = "How many issues/bugs did you resolve, or what test coverage % was reached?";
      } else if (/database|data|query|pipeline|etl|storage/i.test(clean)) {
        q = "What was the data volume processed, or by how much was query execution time reduced?";
      } else if (/api|service|backend|microservice|endpoint/i.test(clean)) {
        q = "How many endpoints did you develop, and what throughput or uptime was achieved?";
      } else if (/lead|managed|team|coordinate|collaborate/i.test(clean)) {
        q = "What was the size of the team, or what deadline/milestone did you achieve?";
      }

      results.push({
        id: `q${results.length + 1}`,
        originalBullet: clean,
        question: q,
      });

      if (results.length >= 3) break;
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify auth
    const supabase = createClient();
    let { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        const { data: tokenData } = await supabase.auth.getUser(token);
        if (tokenData?.user) user = tokenData.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText, jobDescription } = await request.json();

    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json({ questions: [] });
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
      let rawText = (aiResult || "").replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(rawText);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } catch (parseErr: any) {
      logger.warn(`[pre-check] AI call failed or unparseable: ${parseErr.message}`);
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
