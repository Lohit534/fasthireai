/**
 * POST /api/support/chat
 *
 * FastHire-AI Assistant Chatbot handler.
 * Powered by Google Gemini and Groq AI, with intelligent contextual fallbacks.
 * Answers any platform question: safety, pricing plans, ATS scoring, career roadmaps, and support.
 * Guaranteed 100% clean formatting without asterisks.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";
import { callAIText } from "@/lib/ai/router";

/**
 * Remove all markdown asterisks (**bold**, *italics*, and bullet asterisks)
 * and format cleanly with standard bullet characters.
 */
export function cleanAsterisks(text: string): string {
  if (!text) return "";
  return text
    // Replace **bold** with clean text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    // Replace *italics* with clean text
    .replace(/\*([^*]+)\*/g, "$1")
    // Replace markdown bullet asterisks or dashes with clean bullets
    .replace(/(^|\n)\s*[\*\-]\s+/g, "$1• ")
    // Remove any remaining stray asterisks
    .replace(/\*/g, "")
    // Normalize line breaks
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getSmartContextualAnswer(question: string): string {
  const q = question.toLowerCase();

  // Safety, Trust, Legitimacy & Security
  if (
    q.includes("safe") ||
    q.includes("trust") ||
    q.includes("secure") ||
    q.includes("security") ||
    q.includes("legit") ||
    q.includes("privacy") ||
    q.includes("scam") ||
    q.includes("data")
  ) {
    return cleanAsterisks(
      "FastHire AI is 100% safe, trustworthy, and enterprise-grade secure:\n\n" +
      "• 256-Bit SSL Encryption: All web traffic and resumes are encrypted in transit and at rest.\n" +
      "• RBI-Regulated Payments: All transactions are processed through Razorpay, a certified PCI-DSS Level 1 compliant gateway.\n" +
      "• Zero Payment Storage: We never store your UPI PINs, credit/debit card numbers, or banking credentials.\n" +
      "• Safe One-Time Charges: Payments are strictly one-time. There are no hidden recurring auto-debits without your explicit consent.\n" +
      "• 7-Day Refund Guarantee: If you face any issues, our support team provides prompt assistance or a full refund."
    );
  }

  // Plan Switching & Free Plan status
  if (
    q.includes("switch") ||
    q.includes("change plan") ||
    q.includes("only shows free") ||
    q.includes("did not purchase") ||
    q.includes("upgrade") ||
    q.includes("downgrade")
  ) {
    return cleanAsterisks(
      "About switching plans on FastHire AI:\n\n" +
      "• If you have not purchased a plan, your account strictly remains on the Free Tier with your free monthly credits.\n" +
      "• All 3 plans (Free, Premium Pro, and Pro Max) are shown on the Pricing page so you can easily compare features.\n" +
      "• You will never be switched or billed unexpectedly. A plan is only activated after you voluntarily complete a secure checkout.\n" +
      "• Whenever you want higher credits or AI features, you can upgrade on the Pricing page at any time."
    );
  }

  // Pricing & Plans
  if (
    q.includes("promax") ||
    q.includes("pro max") ||
    q.includes("unlimited") ||
    q.includes("plan") ||
    q.includes("pricing") ||
    q.includes("price") ||
    q.includes("cost")
  ) {
    return cleanAsterisks(
      "FastHire AI offers 3 simple, non-recurring plans:\n\n" +
      "• Free Tier: Free monthly optimizations, standard ATS score breakdown, and instant resume preview.\n" +
      "• Premium Pro (₹99/mo or ₹999/yr): 20 resume optimizations/month, full keyword gap analysis, all resume templates, and PDF & DOCX downloads.\n" +
      "• Pro Max (₹199/mo or ₹1999/yr): Unlimited AI resume optimizations, AI bullet point rewriter, priority ATS processing, 24/7 AI Assistant, and official GST tax invoices.\n\n" +
      "All plans are one-time payments with no surprise recurring debits."
    );
  }

  // ATS Scoring & Resume Optimization
  if (q.includes("ats") || q.includes("score") || q.includes("tailor") || q.includes("optimize") || q.includes("90")) {
    return cleanAsterisks(
      "To score 90+ on FastHire AI's ATS scanner:\n\n" +
      "1. Paste your target Job Description (JD) into the optimization panel.\n" +
      "2. Match critical hard skills and tools listed in the JD within your Skills and Experience sections.\n" +
      "3. Use strong action verbs and measurable metrics (e.g., Increased performance by 40% or reduced costs by ₹2L).\n" +
      "4. Our AI highlights missing keywords in red/amber and automatically inserts them naturally into your bullet points."
    );
  }

  // GST, Invoices & Tax
  if (q.includes("gst") || q.includes("tax") || q.includes("invoice") || q.includes("receipt") || q.includes("bill")) {
    return cleanAsterisks(
      "Official GST tax invoices are generated automatically for every purchase:\n\n" +
      "• Includes complete 5% GST breakdown, HSN code, and transaction ID.\n" +
      "• View, preview, and download official PDF tax invoices anytime from your Billing & Subscription page."
    );
  }

  // Downloads & Formats
  if (q.includes("download") || q.includes("pdf") || q.includes("docx") || q.includes("export") || q.includes("format")) {
    return cleanAsterisks(
      "FastHire AI supports full resume exports:\n\n" +
      "• ATS-Compliant PDF: Formatted cleanly for corporate Applicant Tracking Systems.\n" +
      "• Editable Word DOCX: Perfect for making quick manual adjustments or submitting to recruiters who require Word files.\n" +
      "• Both download options are available directly on the editor and in your History page."
    );
  }

  // Job Application Tracker
  if (q.includes("job tracker") || q.includes("tracker") || q.includes("applied") || q.includes("application")) {
    return cleanAsterisks(
      "FastHire AI includes an integrated Job Application Tracker:\n\n" +
      "• Organize your job search across Wishlist, Applied, Interviewing, Offer, and Rejected stages.\n" +
      "• Add job URLs, salary ranges, deadlines, and notes.\n" +
      "• Directly link the specific tailored resume used for each application so you're always prepared for interviews."
    );
  }

  // Career Roadmap
  if (q.includes("roadmap") || q.includes("skill") || q.includes("career") || q.includes("learn")) {
    return cleanAsterisks(
      "In the Career Roadmap tool, choose your target role or desired tech stack to generate an AI-powered learning pathway with milestones, project suggestions, and interview preparation guides tailored to your current level."
    );
  }

  // Refunds & Support
  if (q.includes("contact") || q.includes("admin") || q.includes("refund") || q.includes("help") || q.includes("ticket") || q.includes("human")) {
    return cleanAsterisks(
      "Need human help or a refund?\n\n" +
      "• Create a ticket directly in this widget under Admin Support Ticket.\n" +
      "• We respond within 1-2 business days, and replies appear right here.\n" +
      "• We offer a 7-day money-back guarantee for any unsatisfied orders."
    );
  }

  return cleanAsterisks(
    "FastHire AI helps you create ATS-optimized resumes tailored to any job description, track your job applications, and boost interview callbacks.\n\n" +
    "You can ask me about:\n" +
    "• Website security, trust, and payment safety\n" +
    "• Free, Premium Pro, and Pro Max pricing plans\n" +
    "• How to achieve a 90+ ATS score\n" +
    "• GST invoices, PDF/DOCX downloads, and the Job Tracker"
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify User Authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const question = body.question;
    const userPlan = body.userPlan || "free";

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const trimmedQuestion = question.trim();

    // Check user tier for personalization (all authenticated users can chat)
    const isOwner = user ? isOwnerEmail(user.email) : false;
    let isProMax = isOwner || userPlan === "promax" || userPlan === "team";

    if (!isProMax && user) {
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
        logger.warn("[support-chat] Fallback check for user credits.");
      }
    }

    const systemPrompt = `You are the official FastHire AI Assistant — a helpful, trustworthy, and knowledgeable guide for the FastHire AI platform.

Key Platform Information:
1. Safety & Trust: 256-bit SSL encryption. All payments processed by Razorpay (RBI-authorized, PCI-DSS Level 1 compliant). FastHire never stores card details or UPI PINs. Strictly one-time safe payments with no auto-debit. 7-day refund guarantee.
2. Pricing Plans:
   - Free Plan: Free monthly credits, standard ATS analysis, 1 resume template. If a user has not bought a plan, they stay on Free.
   - Premium Pro (₹99/mo or ₹999/yr): 20 credits/mo, full keyword gap report, all templates, PDF and DOCX downloads.
   - Pro Max (₹199/mo or ₹1999/yr): Unlimited credits, AI bullet point rewriter, priority ATS processing, 24/7 AI Assistant, official GST tax invoices.
3. Plan Switching: If a user has not paid, their account strictly shows Free. They cannot switch to paid perks without checkout.
4. ATS Scoring: Scans resume against Job Description (JD), measures semantic match, keyword presence, quantifiable impact, and formatting to help users reach 90+ ATS score.
5. Other Features: Integrated Job Application Tracker (Wishlist, Applied, Interview, Offer), Career Roadmap generator, official 5% GST invoices with HSN codes.

CRITICAL FORMATTING RULE:
- NEVER use asterisks (*) or double asterisks (**) anywhere in your response.
- Do NOT use markdown bold (**word**) or italics (*word*).
- Use standard bullet points (•) for lists.
- Write in clean, professional, concise plain text with clear line breaks.

User Question: ${trimmedQuestion}`;

    // 2. Try primary AI text router (Groq multi-model + Gemini fallback)
    try {
      const aiResponse = await callAIText(systemPrompt);
      if (aiResponse && aiResponse.trim().length > 10) {
        return NextResponse.json({
          answer: cleanAsterisks(aiResponse.trim()),
          engine: "FastHire AI"
        });
      }
    } catch (aiErr: any) {
      logger.warn("[support-chat] AI text router fallback:", aiErr?.message);
    }

    // 3. Direct Gemini call fallback if callAIText encountered an issue
    const geminiKey = process.env.GEMINI_API_KEY || "";
    if (geminiKey) {
      const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
      for (const modelName of GEMINI_MODELS) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
              })
            }
          );

          if (response.ok) {
            const json = await response.json();
            const answer = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (answer && answer.trim().length > 10) {
              return NextResponse.json({
                answer: cleanAsterisks(answer.trim()),
                engine: "Gemini AI"
              });
            }
          }
        } catch {
          // continue to next model or fallback
        }
      }
    }

    // 4. Smart contextual fallback if APIs are offline or rate-limited
    const smartFallback = getSmartContextualAnswer(trimmedQuestion);
    return NextResponse.json({
      answer: cleanAsterisks(smartFallback),
      engine: "FastHire Knowledge Engine"
    });

  } catch (error: any) {
    logger.error("[support-chat] Unhandled error:", error?.message);
    return NextResponse.json({ 
      answer: cleanAsterisks("I am ready to help! You can ask about website security, ATS resume scoring, tailoring for job descriptions, pricing plans, or career roadmaps.") 
    });
  }
}

