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
      "• Safe One-Time Charges: Payments are strictly one-time with no unexpected recurring auto-debits.\n" +
      "• Strict Non-Refundable Policy: As stated on our Pricing page, all purchases and plan switches are final and strictly non-refundable."
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
  if (q.includes("refund") || q.includes("money back") || q.includes("cancel") || q.includes("return")) {
    return cleanAsterisks(
      "FastHire AI Refund Policy:\n\n" +
      "• As clearly stated on our Pricing page, all payments, plan upgrades, and plan switches are strictly non-refundable under any circumstances.\n" +
      "• Because digital optimization credits and AI features are activated immediately upon purchase, payments cannot be refunded or reversed.\n" +
      "• If you experience any technical issues with your credits, our team is ready to assist you promptly via an Admin Support Ticket."
    );
  }

  if (q.includes("contact") || q.includes("admin") || q.includes("help") || q.includes("ticket") || q.includes("human") || q.includes("support")) {
    return cleanAsterisks(
      "Need human help or support?\n\n" +
      "• Create a ticket directly in this widget under Admin Support Ticket.\n" +
      "• Our administrative team responds directly within 1-2 business days, and replies appear right here in your widget."
    );
  }

  return cleanAsterisks(
    "FastHire AI helps you create ATS-optimized resumes tailored to any job description, track your job applications, and boost interview callbacks.\n\n" +
    "You can ask me about:\n" +
    "• How to achieve a 90+ ATS score\n" +
    "• How to tailor your resume for any Job Description\n" +
    "• Free, Premium Pro, and Pro Max plans\n" +
    "• GST invoices, PDF/DOCX downloads, and the Job Tracker"
  );
}

export const runtime = "nodejs";
export const maxDuration = 15;

const FAST_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.6-flash"
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = body.question;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const trimmedQuestion = question.trim();

    // 1. Check for Instant Known Answer (0ms latency) for high-frequency platform queries
    const instantAnswer = getSmartContextualAnswer(trimmedQuestion);
    // If the question explicitly targeted a core keyword, return immediately for instant UX
    const qLower = trimmedQuestion.toLowerCase();
    const isDirectPlatformTopic = 
      qLower.includes("refund") || 
      qLower.includes("money back") || 
      qLower.includes("pricing") || 
      qLower.includes("plan") || 
      qLower.includes("promax") || 
      qLower.includes("pro max") || 
      qLower.includes("unlimited") || 
      qLower.includes("gst") || 
      qLower.includes("invoice") || 
      qLower.includes("download") || 
      qLower.includes("switch") || 
      qLower.includes("only shows free") || 
      qLower.includes("job tracker") || 
      qLower.includes("roadmap");

    if (isDirectPlatformTopic && instantAnswer) {
      return NextResponse.json({
        answer: cleanAsterisks(instantAnswer),
        engine: "FastHire Instant Knowledge"
      });
    }

    const systemPrompt = `You are the official FastHire AI Assistant.
Rules:
1. FastHire is an ATS Resume Optimizer and Career platform.
2. Plans: Free Tier (free credits), Premium Pro (₹99/mo, 20 credits), Pro Max (₹199/mo, unlimited credits).
3. Refund Policy: All payments are strictly non-refundable as stated on the Pricing page.
4. ATS scoring: Scans resume against Job Description, checks skills, quantifiable metrics, and formatting to reach 90+ score.
5. Provide a helpful, concise answer (2-4 sentences or clean bullet points).
6. CRITICAL: Never use asterisks (*) or double asterisks (**). Do not use markdown bold or italics. Use • for bullets.

User Question: ${trimmedQuestion}`;

    // 2. Direct Ultra-Fast Gemini Call (1s latency)
    const geminiKey = process.env.GEMINI_API_KEY || "";
    if (geminiKey) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);

      for (const modelName of FAST_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 350
            }
          });

          // Timeout promise to guarantee rapid response
          const genPromise = model.generateContent(systemPrompt);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 4000)
          );

          const result: any = await Promise.race([genPromise, timeoutPromise]);
          const responseText = result.response.text();
          if (responseText && responseText.trim().length > 5) {
            return NextResponse.json({
              answer: cleanAsterisks(responseText.trim()),
              engine: "FastHire AI"
            });
          }
        } catch (e: any) {
          // Model failed or timed out, try next fast model
        }
      }
    }

    // 3. Fallback to CallAIText Router
    try {
      const aiResponse = await callAIText(systemPrompt);
      if (aiResponse && aiResponse.trim().length > 10) {
        return NextResponse.json({
          answer: cleanAsterisks(aiResponse.trim()),
          engine: "FastHire AI"
        });
      }
    } catch (_aiErr) {}

    // 4. Instant Knowledge Engine Fallback
    return NextResponse.json({
      answer: cleanAsterisks(instantAnswer),
      engine: "FastHire Knowledge Engine"
    });

  } catch (error: any) {
    logger.error("[support-chat] Error:", error?.message);
    return NextResponse.json({ 
      answer: cleanAsterisks("I am ready to help! You can ask about ATS resume scoring, tailoring for job descriptions, pricing plans, or career roadmaps.") 
    });
  }
}

