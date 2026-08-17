/**
 * POST /api/support/chat
 *
 * FastHire-AI Pro Max Assistant Chatbot handler.
 * Powered by Google Gemini for deep conversational reasoning, career coaching, 
 * and interview prep, with automatic fallback to Groq.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || "";
    const groqKey = process.env.GROQ_API_KEY || "";

    const systemPrompt = `You are the FastHire-AI Career & Support Assistant — an intelligent career mentor and platform guide.
You help users with:
1. ATS Resume scoring, tailoring tips, and keyword optimization advice.
2. FastHire platform navigation, the Pro Max plan (unlimited optimizations, all formats, priority features), and Premium Pro plan.
3. Job application strategies, cover letter tips, and interview preparation.
Keep your answers friendly, professional, highly actionable (3-5 concise sentences), and formatted in clean markdown text. Do not output JSON.`;

    // 1. Primary Engine for Chatbot: Google Gemini
    if (geminiKey) {
      const GEMINI_MODELS = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash",
        "gemini-1.5-flash-8b",
      ];

      for (const modelName of GEMINI_MODELS) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `${systemPrompt}\n\nUser Question: ${question}`
                      }
                    ]
                  }
                ],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 500
                }
              })
            }
          );

          if (response.ok) {
            const json = await response.json();
            const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (answer) {
              return NextResponse.json({ answer: answer.trim(), engine: "Gemini AI" });
            }
          }
        } catch (geminiErr: any) {
          logger.warn(`[support-chat] Gemini model ${modelName} failed, trying next:`, geminiErr?.message);
        }
      }
    }

    // 2. Secondary Fallback Engine: Groq (Llama-3.1-8b-instant)
    if (groqKey) {
      const GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-specdec", "qwen-2.5-32b"];
      for (const modelName of GROQ_MODELS) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question }
              ],
              temperature: 0.7,
              max_tokens: 400
            }),
          });

          if (response.ok) {
            const json = await response.json();
            const answer = json.choices?.[0]?.message?.content;
            if (answer) {
              return NextResponse.json({ answer: answer.trim(), engine: "Groq LPU" });
            }
          }
        } catch (groqErr: any) {
          logger.warn(`[support-chat] Groq fallback ${modelName} failed:`, groqErr?.message);
        }
      }
    }

    // 3. Fallback answer if APIs are offline
    return NextResponse.json({
      answer: "Thank you for reaching out! FastHire AI assistant is temporarily synchronizing. You can optimize your resume anytime from the dashboard, check the pricing section for Pro Max features, or message our team directly using the contact administrator tab."
    });
  } catch (error: any) {
    logger.error("[support-chat] Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
