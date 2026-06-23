/**
 * POST /api/support/chat
 *
 * Support AI Chatbot handler.
 * Interfaces with Groq (llama-3.3-70b-versatile) or falls back to Gemini 1.5 Flash.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY || "";
    const geminiKey = process.env.GEMINI_API_KEY || "";

    const systemPrompt = `You are the FastHire-AI Support Bot. 
Answer user questions regarding resume building, ATS resume scoring, the "Premium Pro" and "Pro Max" billing plans, and general support.
Keep your answer friendly, concise (maximum 3-4 sentences), and formatted in clean text. Do not output JSON.`;

    if (groqKey) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question }
            ],
            temperature: 0.7,
            max_tokens: 300
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const answer = json.choices?.[0]?.message?.content;
          if (answer) {
            return NextResponse.json({ answer: answer.trim() });
          }
        }
      } catch (groqErr: any) {
        logger.warn("[support-chat] Groq failed, falling back to Gemini:", groqErr.message);
      }
    }

    // Fall back to Gemini if Groq key is missing or fails
    if (geminiKey) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nUser Question: ${question}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300
            }
          })
        });

        if (response.ok) {
          const json = await response.json();
          const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) {
            return NextResponse.json({ answer: answer.trim() });
          }
        }
      } catch (geminiErr: any) {
        logger.error("[support-chat] Gemini fallback failed:", geminiErr.message);
      }
    }

    // Default static fallback answer
    return NextResponse.json({
      answer: "Thank you for asking. Our AI services are currently offline. Please check back shortly, or submit a message to our human administrator using the direct message option."
    });
  } catch (error: any) {
    logger.error("[support-chat] Unhandled error:", error?.message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
