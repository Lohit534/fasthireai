"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  ArrowRight, 
  Upload, 
  Terminal, 
  CheckCircle2, 
  Shield, 
  Cpu, 
  Sparkles,
  Zap,
  TrendingUp,
  AlertCircle
} from "lucide-react";

const SAMPLE_RESUME = `# Alex Rivera
Full Stack Engineer
alex.rivera@fasthire.ai | (555) 019-2834 | alexrivera.dev

## Professional Experience
**InnovateTech Solutions** | Senior Software Engineer
*San Francisco, CA, 2023 - Present*
- Led a team of 4 engineers to migrate legacy monolith architecture to microservices using Next.js and Go, reducing cloud costs by 32%.
- Optimized backend REST API responses, yielding a 40% reduction in page load latency for over 250k daily active users.
- Integrated custom LLM prompt workflows to automate report generation, boosting department efficiency by 15%.

**CloudFlow Inc.** | Software Engineer II
*Seattle, WA, 2021 - 2023*
- Developed responsive interactive analytics dashboards utilizing React, TypeScript, and Tailwind CSS.
- Built and maintained secure CI/CD pipelines deploying containerized Docker applications on AWS ECS.

## Education
**University of Washington** | Bachelor of Science in Computer Science
*2017 - 2021*

## Skills
**Technical Skills:** React, Next.js, TypeScript, Node.js, Python, SQL, Docker, AWS, Git, Agile`;

const SAMPLE_JD = `Role: Senior Software Engineer (Full Stack)
Requirements:
- Strong experience with React, Next.js, TypeScript, and modern styling libraries.
- Proven track record of building and optimizing REST APIs and cloud infrastructure on AWS.
- Hands-on experience with containerization (Docker, Kubernetes) and CI/CD pipelines.
- Experience leading microservice migrations and optimizing database query performance.
- Familiarity with AI integrations and LLM prompt engineering is a major plus.`;

export default function LandingPage() {
  const router = useRouter();
  const { setResumeText, setJobDescription } = useResumeStore();

  const handleTrySample = () => {
    setResumeText(SAMPLE_RESUME);
    setJobDescription(SAMPLE_JD);
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 antialiased font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-white/5 bg-[#060713]">
        {/* Glowing backdrop spotlights */}
        <div className="absolute top-1/4 right-[10%] h-[350px] w-[350px] rounded-full bg-violet-600/10 blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 left-[15%] h-[350px] w-[350px] rounded-full bg-indigo-600/10 blur-[120px] -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Text copy and CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <Badge className="bg-violet-950/40 border border-violet-800/30 text-violet-300 hover:bg-violet-950/40 px-3 py-1 text-xs rounded-full inline-flex items-center gap-1.5 select-none font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-ping" />
                2 Free Resumes - No Credit Card
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl md:text-6.5xl font-black tracking-tight leading-[1.05] max-w-2xl text-white">
                Your resume deserves a <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">fighting chance.</span>
              </h1>
              
              <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed font-medium">
                The **AI resume builder** that checks your ATS score and rewrites your resume with exact keyword matching — in under 30 seconds. Free for all job seekers.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/dashboard">
                  <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/20 font-bold px-8 h-12 rounded-full">
                    Improve My Resume
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleTrySample}
                  className="border-white/10 text-slate-300 hover:bg-white/5 font-bold px-8 h-12 rounded-full bg-transparent"
                >
                  Try with Sample Resume →
                </Button>
              </div>

              {/* Badges footer */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs text-slate-500 font-semibold select-none">
                <span className="flex items-center gap-1.5">🛡️ No data sold</span>
                <span className="flex items-center gap-1.5">⏱️ ~20s results</span>
                <span className="flex items-center gap-1.5">✨ Free to start</span>
              </div>
            </div>

            {/* Right: Floating Glassmorphic Score Cards */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[400px] h-[360px]">
                
                {/* Scorecard Before (Red Dial) */}
                <div className="absolute top-4 left-0 w-[240px] border border-white/5 bg-[#0e0f21]/70 backdrop-blur-xl p-5 rounded-2xl shadow-2xl shadow-black/40 rotate-[-4deg] animate-pulse">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Before</span>
                    <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400 text-[10px] font-bold py-0.5 px-2 rounded-md">
                      34%
                    </Badge>
                  </div>
                  {/* Skeletons */}
                  <div className="space-y-2">
                    <div className="h-2 w-3/4 bg-slate-800 rounded-full" />
                    <div className="h-2 w-full bg-slate-800 rounded-full" />
                    <div className="h-2 w-5/6 bg-slate-800 rounded-full" />
                  </div>
                </div>

                {/* Scorecard After (Green Dial) */}
                <div className="absolute bottom-4 right-0 w-[260px] border border-white/10 bg-[#12132b]/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl shadow-violet-600/5 rotate-[2deg]">
                  <div className="absolute -top-3 -right-3 bg-emerald-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full border border-emerald-400 select-none shadow-lg shadow-emerald-500/10">
                    +57 pts
                  </div>
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">After Optimization</span>
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold py-0.5 px-2 rounded-md">
                      91%
                    </Badge>
                  </div>
                  {/* Skeletons */}
                  <div className="space-y-2.5">
                    <div className="h-2 w-5/6 bg-slate-700/80 rounded-full" />
                    <div className="h-2 w-full bg-slate-700/80 rounded-full" />
                    <div className="h-2 w-4/5 bg-slate-700/80 rounded-full" />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Before vs After Detailed Metrics Showroom */}
      <section className="py-20 border-b border-white/5 bg-[#080917]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-white tracking-tight">Real-Time Scoring Lift</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">
              Watch your resume score lift as we automatically address gaps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
            {/* Before Box */}
            <Card className="border-white/5 bg-[#0e0f21]/50 shadow-lg p-6 text-center space-y-4">
              <Badge variant="outline" className="border-red-500/20 bg-red-500/15 text-red-400 font-bold text-[10px] uppercase rounded-md tracking-wider">
                Initial Resume
              </Badge>
              <div className="flex items-center justify-center h-28 w-28 rounded-full border-4 border-red-500/20 bg-red-500/5 mx-auto">
                <span className="text-4.5xl font-black text-red-500">34</span>
              </div>
              <h4 className="font-extrabold text-white text-sm">Action verbs and metrics missing</h4>
            </Card>

            {/* After Box */}
            <Card className="border-white/10 bg-[#12132d]/60 shadow-xl p-6 text-center space-y-4 relative">
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/15 text-emerald-400 font-bold text-[10px] uppercase rounded-md tracking-wider">
                FastHire Optimized
              </Badge>
              <div className="flex items-center justify-center h-28 w-28 rounded-full border-4 border-emerald-500/20 bg-emerald-500/5 mx-auto">
                <span className="text-4.5xl font-black text-emerald-400">91</span>
              </div>
              <h4 className="font-extrabold text-white text-sm">Strong keyword alignment & verified verbs</h4>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-[#060713]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-white tracking-tight">How It Works</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">
              Transform your resume to beat applicant tracking systems in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-5 rounded-2xl border border-white/5 bg-[#0e0f21]/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-950/50 border border-violet-800/30 text-violet-400 mx-auto">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-white">1. Upload Resume</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Upload your PDF/DOCX or build a new one using our multi-step interactive resume wizard.
              </p>
            </div>

            <div className="text-center space-y-4 p-5 rounded-2xl border border-white/5 bg-[#0e0f21]/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-950/50 border border-violet-800/30 text-violet-400 mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-white">2. Target Job Description</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Paste your target job description. Our engine will map semantic similarity gaps.
              </p>
            </div>

            <div className="text-center space-y-4 p-5 rounded-2xl border border-white/5 bg-[#0e0f21]/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 mx-auto">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-white">3. Apply Bullet Rewrites</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Accept keyword-injected bullets and download your ATS-compliant resume instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Block */}
      <section className="bg-[#080917] text-white py-16 text-center border-t border-white/5">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black tracking-tight">Ready to Land More Interviews?</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">
            Get 2 free resume optimizations each month. No credit card required. Cancel anytime.
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-8 h-12 rounded-full shadow-lg shadow-violet-600/20">
                Start Free Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060713] border-t border-white/5 py-8 text-center text-xs text-slate-500 mt-auto font-semibold">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            FastHire &copy; 2026. All rights reserved.
          </div>
          <div className="flex gap-4 font-semibold text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
