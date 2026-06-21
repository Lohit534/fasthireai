import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col antialiased">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Return to Home
        </Link>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
          </div>

          <p className="text-xs text-slate-500">Last updated: June 21, 2026</p>

          <Separator />

          <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-medium">
            <h2 className="text-base font-bold text-slate-900 pt-2">1. Agreement to Terms</h2>
            <p>
              By accessing FastHire-AI, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, you are prohibited from using the application.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. Account Responsibility</h2>
            <p>
              When creating an account, you agree to provide accurate information and keep your credentials secure. You are fully responsible for all actions taken under your account sessions.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Credits & Service Limits</h2>
            <p>
              Free accounts are granted standard credits each month. These credits are consumed when triggering full AI optimization requests. Abuse of endpoints, automation scripts, or attempts to bypass rate limits may result in access suspension.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Disclaimers</h2>
            <p>
              FastHire-AI calculates match percentages and bullet suggestions based on custom statistical heuristics and Gemini AI models. We do not guarantee employment, interviews, or final selection outcomes by using optimized resumes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Separator() {
  return <div className="w-full border-t border-gray-200" />;
}
