import { NextRequest, NextResponse } from "next/server";
import { callAIText } from "@/lib/ai/router";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30; // Quick pre-check, should take < 10s

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

    const prompt = `You are an expert ATS resume reviewer. 
The user is about to optimize their resume for the following job description.

Job Description:
"""
${jobDescription.substring(0, 3000)}
"""

Resume:
"""
${resumeText.substring(0, 5000)}
"""

Your task is to identify MISSING CRITICAL METRICS from their experience or project bullets. Look for extremely generic, weak, or unquantified bullets (e.g., "Worked on the database", "Fixed bugs", "Managed a team").

Return a STRICT JSON array of up to 4 specific questions to ask the user to fill in these gaps.
Each object in the array must have:
- "id": A unique string ID (e.g., "q1")
- "originalBullet": The exact text of the weak bullet you found.
- "question": A direct, highly specific question asking for the exact metric needed (e.g., "How many bugs did you fix per week?", "By what percentage did database performance increase?").

If the resume is already highly quantified and excellent, return an empty array [].
DO NOT return markdown code blocks. Output ONLY raw JSON.`;

    const aiResult = await callAIText(prompt);
    
    // Attempt to parse JSON
    let questions = [];
    try {
      let rawText = aiResult;
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(rawText);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } catch (parseErr: any) {
      logger.warn(`[pre-check] Failed to parse AI JSON response: ${parseErr.message}`);
      questions = [];
    }

    return NextResponse.json({ questions: questions.slice(0, 4) });

  } catch (error: any) {
    logger.error(`[pre-check] Error: ${error.message}`);
    return NextResponse.json({ questions: [] });
  }
}
