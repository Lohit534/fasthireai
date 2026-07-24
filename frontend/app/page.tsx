"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import {
  ArrowRight,
  Zap,
  TrendingUp,
  Download,
  Target,
  Shield,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import CircleGauge from "@/components/CircleGauge";
import { supabase } from "@/lib/supabase/client";

export default function LandingPage() {
  const router = useRouter();
  const { setResumeText, setJobDescription } = useResumeStore();

  React.useEffect(() => {
    async function checkLoggedIn() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          router.replace("/dashboard");
        }
      } catch (e) {}
    }
    checkLoggedIn();
  }, [router]);

  const handleTrySample = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0b14] text-slate-100 antialiased font-sans">

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-1/3 w-[800px] h-[600px] bg-violet-600/5 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-blue-700/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/4 rounded-full blur-[120px]" />
      </div>

      <Navbar />

      {/* ── HERO SECTION ──────────────────────────────────────────── */}
      <section className="relative pt-24 pb-28 md:pt-32 md:pb-36">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

            {/* LEFT: Copy + CTAs */}
            <div className="lg:col-span-6 space-y-8 animate-fade-in-up">

              {/* Status pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/4 border border-white/10 text-slate-300 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                2 Free Optimizations — No Credit Card
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl md:text-[4rem] font-black tracking-tight leading-[1.02] text-white">
                Stop Getting{" "}
                <span className="text-gradient-cyan">Rejected.</span>
                <br />
                Start Getting{" "}
                <span className="text-gradient-violet">Interviews.</span>
              </h1>

              {/* Description */}
              <p className="text-base text-slate-400 max-w-xl leading-relaxed font-medium">
                Paste your resume + job description. Our AI rewrites, keyword-matches, and ATS-scores your resume in under 30 seconds — completely free to start.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-1">
                <Link href="/auth/signup">
                  <button className="btn-gleam group relative bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm h-13 px-8 rounded-xl shadow-lg shadow-violet-600/30 transition-all duration-300 hover:shadow-violet-600/50 hover:scale-[1.02]">
                    <span className="relative flex items-center gap-2.5">
                      Get Started Free
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                </Link>
                <button
                  onClick={handleTrySample}
                  className="h-13 px-8 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20 font-semibold text-sm transition-all duration-200"
                >
                  Try Sample Resume →
                </button>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-xs text-slate-500 font-semibold pt-1">
                <span className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-slate-600" />
                  No data sold
                </span>
                <span className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-slate-600" />
                  Results in ~20s
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                  Free to start
                </span>
              </div>
            </div>

            {/* RIGHT: ATS Score Demo Card — matching reference image */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <div className="relative w-full max-w-[480px]">

                {/* Floating badge top-right */}
                <div className="absolute -top-3 right-6 z-10 flex items-center gap-2 bg-[#15162a] border border-white/10 px-3.5 py-2 rounded-xl shadow-xl diamond-gleam">
                  <div className="h-6 w-6 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">Real-Time Rewrite</div>
                    <div className="text-xs font-bold text-white mt-0.5">Optimizing Bullets...</div>
                  </div>
                </div>

                {/* Main ATS score card */}
                <div className="diamond-gleam diamond-gleam-slow bg-[#10111f] border border-white/8 rounded-2xl p-7 shadow-2xl shadow-black/40">

                  {/* Header row */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="text-xs text-slate-400 font-semibold mb-2">Current ATS Score</div>
                      <div className="text-4xl font-black text-red-400 leading-none">34%</div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400/80 font-medium">
                        <span className="text-red-500">✕</span>
                        Missing 14 keywords
                      </div>
                    </div>
                    <div className="text-4xl font-black text-emerald-400 leading-none mt-1">91%</div>
                  </div>

                  {/* Progress bar: red → green */}
                  <div className="h-2.5 w-full rounded-full overflow-hidden bg-[#1c1d30] mb-5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "91%",
                        background: "linear-gradient(90deg, #ef4444 0%, #f97316 25%, #eab308 50%, #22c55e 80%, #10b981 100%)"
                      }}
                    />
                  </div>

                  {/* Bottom tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="diamond-gleam bg-[#0d0e1c] border border-white/6 rounded-xl p-3.5">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Keywords</div>
                      <div className="text-sm font-bold text-emerald-400">Full Coverage</div>
                    </div>
                    <div className="diamond-gleam bg-[#0d0e1c] border border-white/6 rounded-xl p-3.5">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Format</div>
                      <div className="text-sm font-bold text-blue-400">ATS-Ready ✓</div>
                    </div>
                  </div>

                </div>

                {/* Glow behind card */}
                <div className="absolute inset-0 -z-10 rounded-2xl bg-violet-600/8 blur-2xl scale-90 translate-y-4" />

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SCORE LIFT SECTION ──────────────────────────────────── */}
      <ScrollFadeIn className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 space-y-14">
          <div className="text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Real Results</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Watch Your ATS Score Climb</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-medium leading-relaxed">
              Every optimization is scored before and after so you can see exactly how much better your resume performs.
            </p>
          </div>

          <div className="flex flex-row items-center justify-center gap-10 md:gap-20">
            <div className="flex flex-col items-center gap-3">
              <CircleGauge value={34} label="Before" size={120} />
              <p className="text-xs text-slate-500 font-semibold">14 keywords missing</p>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="h-px w-14 md:w-24 bg-gradient-to-r from-red-500/30 to-violet-500/30" />
              <span className="text-xs font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full">⚡ AI</span>
              <div className="h-px w-14 md:w-24 bg-gradient-to-r from-violet-500/30 to-emerald-500/30" />
            </div>

            <div className="flex flex-col items-center gap-3">
              <CircleGauge value={91} label="After" size={120} />
              <p className="text-xs text-slate-500 font-semibold">ATS-ready ✓</p>
            </div>
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── FEATURES GRID ────────────────────────────────────────── */}
      <ScrollFadeIn className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Why FastHire</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Everything You Need to Get Hired Faster</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Target, title: "ATS-First Design", desc: "Every rewrite targets the exact keywords recruiters' ATS systems filter for." },
              { icon: Zap, title: "30-Second Results", desc: "No waiting. No wizard. Just paste and get a better resume immediately." },
              { icon: Shield, title: "100% Private", desc: "Your resume data is never sold, shared, or used to train third-party models." },
              { icon: Download, title: "PDF & DOCX Ready", desc: "Export clean, recruiter-ready documents in one click." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="diamond-gleam p-6 rounded-2xl bg-[#10111f] border border-white/7 space-y-4 hover:border-violet-500/20 transition-colors duration-300">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-violet-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-white text-sm">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <ScrollFadeIn className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12 text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/8 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Free Forever Tier
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Ready to Land More{" "}
            <span className="text-gradient-violet">Interviews?</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto font-medium leading-relaxed">
            2 free resume optimizations every month. No credit card. No setup. Just results.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link href="/auth/signup">
              <button className="btn-gleam bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm h-12 px-10 rounded-xl shadow-lg shadow-violet-600/25 transition-all duration-300 hover:shadow-violet-600/40 hover:scale-[1.02]">
                Start For Free →
              </button>
            </Link>
            <button
              onClick={handleTrySample}
              className="h-12 px-8 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-sm transition-all"
            >
              See a Demo
            </button>
          </div>
        </div>
      </ScrollFadeIn>

    </div>
  );
}
