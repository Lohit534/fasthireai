import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
              <Shield className="h-5 w-5 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
          </div>

          <p className="text-xs text-slate-500">Last updated: June 21, 2026</p>

          <Separator />

          <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-medium">
            <h2 className="text-base font-bold text-slate-900 pt-2">1. Information We Collect</h2>
            <p>
              FastHire-AI collects your name, email address, and authentication credentials when you create an account via email or Google OAuth. We also collect the resume text and job descriptions that you upload or paste into the dashboard to perform scoring and optimizations.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">2. How We Use Your Data</h2>
            <p>
              Your data is processed strictly to calculate ATS match scores and generate natural keyword rewrites. We do not sell your personal data or resume content to third parties or recruiters.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">3. Storage & Security</h2>
            <p>
              Your user credentials and credits history are securely managed using Supabase authentication and stored within standard PostgreSQL datastores. Optimization logs are stored using standard schema records to provide you with history feeds in your private dashboard.
            </p>

            <h2 className="text-base font-bold text-slate-900 pt-2">4. Third-Party Integrations</h2>
            <p>
              For text analytics and semantic similarity checkups, your content is securely sent to our FastAPI service hosted on Hugging Face. AI-powered rewrites are routed using secure Gemini models.
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
