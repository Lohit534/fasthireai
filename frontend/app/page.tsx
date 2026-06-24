"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ArrowRight,
  Upload,
  Zap,
  TrendingUp,
  Download,
  Target,
  Shield,
  CheckCircle2,
  ChevronRight,
  Sparkles,
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
    <div className="flex flex-col min-h-screen bg-[#040d1a] text-slate-100 antialiased font-sans">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-1/4 w-[700px] h-[500px] bg-cyan-500/4 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-600/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/3 rounded-full blur-[100px]" />
      </div>

      <Navbar />

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

            {/* Left: Copy + CTAs */}
            <div className="lg:col-span-6 space-y-7 text-left">
              {/* Status pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/8 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                2 Free Optimizations — No Credit Card
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-[3.6rem] font-black tracking-tight leading-[1.05] text-white">
                Stop Getting{" "}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    Rejected.
                  </span>
                </span>
                <br />
                Start Getting{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Interviews.
                </span>
              </h1>

              <p className="text-base text-slate-400 max-w-lg leading-relaxed font-medium">
                Paste your resume + job description. Our AI rewrites, keyword-matches, and ATS-scores your resume in under 30 seconds — completely free to start.
              </p>

              {/* Feature chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Target, text: "ATS Keyword Match" },
                  { icon: Zap, text: "AI Bullet Rewrites" },
                  { icon: TrendingUp, text: "Score Tracking" },
                  { icon: Download, text: "PDF & DOCX Export" },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-white/5 text-[11px] text-slate-400 font-semibold">
                    <Icon className="h-3 w-3 text-cyan-500" />
                    {text}
                  </span>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/auth/signup">
                  <button className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm h-12 px-8 rounded-full shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:scale-[1.02]">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-12" />
                    <span className="relative flex items-center gap-2">
                      Get Started Free
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </Link>
                <button
                  onClick={handleTrySample}
                  className="h-12 px-8 rounded-full border border-white/10 text-slate-300 hover:bg-white/5 hover:border-cyan-500/30 font-bold text-sm transition-all duration-200"
                >
                  Try Sample Resume →
                </button>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-slate-700" /> No data sold, ever</span>
                <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-slate-700" /> Results in ~20 seconds</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-slate-700" /> Free to start</span>
              </div>
            </div>

            {/* Right: Score cards mockup */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[420px] h-[360px]">

                {/* BEFORE card */}
                <div className="absolute top-4 left-0 w-[240px] bg-[#071525]/90 border border-white/8 backdrop-blur-xl p-5 rounded-2xl shadow-2xl rotate-[-3deg]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Before</span>
                    <span className="text-[11px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">34%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-1.5 w-3/4 bg-slate-800 rounded-full" />
                    <div className="h-1.5 w-full bg-slate-800 rounded-full" />
                    <div className="h-1.5 w-5/6 bg-slate-800 rounded-full" />
                    <div className="h-1.5 w-2/3 bg-slate-800 rounded-full" />
                  </div>
                  <div className="mt-4 text-[10px] text-red-400/80 font-semibold">✗ Missing 14 keywords</div>
                </div>

                {/* AFTER card */}
                <div className="absolute bottom-4 right-0 w-[260px] bg-[#071a14]/90 border border-cyan-500/15 backdrop-blur-xl p-6 rounded-2xl shadow-2xl rotate-[2deg]">
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-lg shadow-cyan-500/20">
                    +57 pts ↑
                  </div>
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">After AI Optimization</span>
                    <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">91%</span>
                  </div>
                  <div className="space-y-2.5">
                    {[100, 85, 92, 78].map((w, i) => (
                      <div key={i} className="h-1.5 rounded-full overflow-hidden bg-slate-800">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-[10px] text-emerald-400 font-semibold">✓ All keywords integrated</div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SCORE LIFT SECTION ──────────────────────────────────── */}
      <section className="py-20 border-b border-white/5 bg-[#040d1a]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Real Results</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Watch Your ATS Score Climb</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">
              Every optimization is scored before and after so you can see exactly how much better your resume performs.
            </p>
          </div>

          {/* Side-by-side circles */}
          <div className="flex flex-row items-center justify-center gap-8 md:gap-16">
            {/* Before circle */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center h-32 w-32 rounded-full border-4 border-red-500/30 bg-red-500/8 shadow-lg shadow-red-500/10">
                <span className="text-5xl font-black text-red-500">34</span>
              </div>
              <p className="text-xs text-slate-500 font-semibold text-center">Before · 14 keywords missing</p>
            </div>

            {/* Connector arrow */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="h-px w-12 md:w-20 bg-gradient-to-r from-red-500/30 to-cyan-500/30" />
              <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">⚡ AI</span>
              <div className="h-px w-12 md:w-20 bg-gradient-to-r from-cyan-500/30 to-emerald-500/30" />
            </div>

            {/* After circle */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center h-32 w-32 rounded-full border-4 border-emerald-500/30 bg-emerald-500/8 shadow-lg shadow-emerald-500/10">
                <span className="text-5xl font-black text-emerald-400">91</span>
              </div>
              <p className="text-xs text-slate-500 font-semibold text-center">After · ATS-ready ✓</p>
            </div>
          </div>
        </div>
      </section>


      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="py-20 border-b border-white/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Simple 3-Step Process</span>
            <h2 className="text-3xl font-black text-white tracking-tight">How FastHire Works</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">
              From upload to ATS-ready resume in under 30 seconds. No fluff, no gimmicks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Paste Your Resume",
                desc: "Upload a PDF/DOCX or paste your resume text. Our parser handles all formats cleanly.",
                color: "cyan",
              },
              {
                step: "02",
                icon: Target,
                title: "Add the Job Description",
                desc: "Paste the job posting URL or text. Our AI maps every keyword gap instantly.",
                color: "blue",
              },
              {
                step: "03",
                icon: Zap,
                title: "Get Your Optimized Resume",
                desc: "AI rewrites weak bullets, injects missing keywords, and scores your improvement.",
                color: "indigo",
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className={`relative p-6 rounded-2xl bg-[#071525]/60 border border-white/6 hover:border-${color}-500/20 transition-colors duration-300 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className={`h-10 w-10 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 text-${color}-400`} />
                  </div>
                  <span className="text-[10px] font-black text-slate-700 tracking-widest">{step}</span>
                </div>
                <h3 className="font-extrabold text-white text-sm">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY FASTHIRE ─────────────────────────────────────────── */}
      <section className="py-20 border-b border-white/5 bg-[#040d1a]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Why FastHire</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Built for Job Hunters, Not HR Departments</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Target, title: "ATS-First Design", desc: "Every rewrite targets the exact keywords recruiters' ATS systems filter for." },
              { icon: Zap, title: "30-Second Results", desc: "No waiting. No wizard. Just paste and get a better resume immediately." },
              { icon: Shield, title: "100% Private", desc: "Your resume data is never sold, shared, or used to train third-party models." },
              { icon: Download, title: "PDF & DOCX Ready", desc: "Export clean, recruiter-ready documents in one click." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-2xl bg-[#071525]/60 border border-white/6 space-y-3">
                <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-white text-sm">{title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BLOCK ────────────────────────────────────────────── */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/8 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-2">
            <Sparkles className="h-3 w-3" />
            Free Forever Tier
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Ready to Land More{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Interviews?</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto font-medium">
            2 free resume optimizations every month. No credit card. No setup. Just results.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/auth/signup">
              <button className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm h-12 px-10 rounded-full shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:scale-[1.02]">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-12" />
                <span className="relative flex items-center gap-2">
                  Start For Free
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </Link>
            <button
              onClick={handleTrySample}
              className="h-12 px-8 rounded-full border border-white/10 text-slate-300 hover:bg-white/5 font-bold text-sm transition-all"
            >
              See a Demo →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
