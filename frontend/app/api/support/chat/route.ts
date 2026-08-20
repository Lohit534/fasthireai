/**
 * POST /api/support/chat
 *
 * FastHire-AI Pro Max Exclusive Assistant Chatbot handler.
 * Powered by Google Gemini and Groq AI, with intelligent contextual fallbacks.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";
import { callAIText } from "@/lib/ai/router";

function getSmartContextualAnswer(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("ats") || q.includes("score")) {
    return "To achieve a 90+ ATS score on FastHire-AI:\n1. Paste the target Job Description into the optimization panel.\n2. Ensure your top 3-5 technical skills directly match keywords from the JD.\n3. Quantify your experience bullets with measurable metrics (e.g., 'Improved latency by 35%').\n4. FastHire will highlight missing keywords and automatically tailor your bullet points for ATS scanners.";
  }

  if (q.includes("promax") || q.includes("pro max") || q.includes("unlimited") || q.includes("plan") || q.includes("pricing")) {
    return "FastHire offers 3 transparent tiers:\n• **Free Tier**: 2 resume optimizations per month.\n• **Premium Pro (₹99/mo)**: 20 resume optimizations per month, ATS score analytics, and PDF/DOCX exports.\n• **Pro Max (₹199/mo)**: Unlimited AI optimizations, real-time AI bullet rewriting, prioritized processing, and official GST tax invoices.";
  }

  if (q.includes("gst") || q.includes("tax") || q.includes("invoice") || q.includes("receipt")) {
    return "Every successful transaction includes an official 5% GST tax invoice breakdown. You can preview and download your official GST invoice receipts directly as PDFs from your Billing & Subscription page.";
  }

  if (q.includes("download") || q.includes("pdf") || q.includes("docx") || q.includes("format")) {
    return "Once your resume is tailored or compiled in FastHire-AI, you can download it in both ATS-compliant PDF and editable DOCX formats. PDF and DOCX downloads are available for all optimized resumes in your History and optimization editor.";
  }

  if (q.includes("roadmap") || q.includes("skill") || q.includes("career")) {
    return "In our Career Roadmap tool, you can select your target job skills to generate a step-by-step learning pathway with milestones, project suggestions, and interview preparation guides tailored to your experience level.";
  }

  if (q.includes("contact") || q.includes("admin") || q.includes("refund") || q.includes("help") || q.includes("ticket")) {
    return "You can reach our administrative support team directly by clicking 'Create ticket' in the Contact Us panel. Our support team responds directly within 1-2 business days, and you can view replies right here in the widget.";
  }

  return "FastHire-AI is designed to help you build ATS-optimized resumes, tailor bullet points to any job description, and maximize your interview callback rate. You can optimize resumes from the Dashboard, explore career roadmaps, or ask me any specific question about your job application!";
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify User Authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to access the AI Career Assistant." },
        { status: 401 }
      );
    }

    // 2. Verify Pro Max Tier Access (Pro Max & Owner Only)
    const isOwner = isOwnerEmail(user.email);
    let isProMax = isOwner;

    if (!isProMax) {
      try {
        const admin = getAdminClient() as any;
        const { data: creditRow } = await admin
          .from("Credit")
          .select("paidCredits")
          .eq("userId", user.id)
          .maybeSingle();

        if (creditRow && (creditRow.paidCredits >= 99999 || creditRow.paidCredits > 200)) {
          isProMax = true;
        }
      } catch (err) {
        logger.warn("[support-chat] Failed to check database credits, proceeding with fallback verification.");
      }
    }

    const { question, userPlan } = await request.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    if (!isProMax && userPlan !== "promax" && userPlan !== "team" && !isOwner) {
      return NextResponse.json(
        { error: "24/7 AI Chatbot is an exclusive feature for Pro Max members. Please upgrade to Pro Max on the Pricing page." },
        { status: 403 }
      );
    }

    const systemPrompt = `You are the FastHire-AI Career & Support Assistant — an intelligent, helpful career mentor and platform guide.
You help users with:
1. ATS Resume scoring, tailoring tips, and keyword optimization advice.
2. FastHire platform navigation, the Pro Max plan (unlimited optimizations, all formats), and Premium Pro plan (20/mo).
3. Job application strategies, cover letter tips, and interview preparation.
Keep your answers friendly, professional, highly actionable (3-5 concise sentences), and formatted in clean markdown text. Do not output JSON.

User Question: ${question}`;

    // 3. Try primary AI text router (Groq multi-model + Gemini fallback)
    try {
      const aiResponse = await callAIText(systemPrompt);
      if (aiResponse && aiResponse.trim().length > 10) {
        return NextResponse.json({ answer: aiResponse.trim(), engine: "FastHire AI" });
      }
    } catch (aiErr: any) {
      logger.warn("[support-chat] AI text router failed, evaluating fallback:", aiErr?.message);
    }

    // 4. Secondary direct Gemini call if callAIText failed
    const geminiKey = process.env.GEMINI_API_KEY || "";
    if (geminiKey) {
      const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
      for (const modelName of GEMINI_MODELS) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
              })
            }
          );

          if (response.ok) {
            const json = await response.json();
            const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (answer && answer.trim().length > 10) {
              return NextResponse.json({ answer: answer.trim(), engine: "Gemini AI" });
            }
          }
        } catch {
          // continue
        }
      }
    }

    // 5. Smart contextual fallback if APIs are offline / rate-limited
    const smartFallback = getSmartContextualAnswer(question);
    return NextResponse.json({
      answer: smartFallback,
      engine: "FastHire Knowledge Engine"
    });

  } catch (error: any) {
    logger.error("[support-chat] Unhandled error:", error?.message);
    return NextResponse.json({ 
      answer: "I am ready to help! You can ask about ATS resume scoring, tailoring for job descriptions, our Pro Max plan, or career roadmaps." 
    });
  }
}
