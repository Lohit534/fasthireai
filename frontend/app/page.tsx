"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import {
  ArrowRight,
  Zap,
  Target,
  Shield,
  CheckCircle2,
  Sparkles,
  Download,
} from "lucide-react";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import CircleGauge from "@/components/CircleGauge";
import { supabase } from "@/lib/supabase/client";

/* ── Animated number counter ─────────────────────────────── */
function AnimatedCounter({
  from,
  to,
  duration = 1400,
  suffix = "",
}: {
  from: number;
  to: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    setCount(from);
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration]);

  return (
    <>
      {count}
      {suffix}
    </>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { setResumeText, setJobDescription } = useResumeStore();
  const [barReady, setBarReady] = useState(false);

  useEffect(() => {
    async function checkLoggedIn() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) router.replace("/dashboard");
      } catch (e) {}
    }
    checkLoggedIn();

    const t = setTimeout(() => setBarReady(true), 350);
    return () => clearTimeout(t);
  }, [router]);

  const handleTrySample = () => router.push("/dashboard");

  return (
    <div className="flex flex-col min-h-screen bg-[#111318] text-[#e2e2e8] antialiased font-sans">

      {/* Atmospheric depth background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-1/4 w-[700px] h-[500px] bg-[#5E5CE6]/8 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-0 w-[600px] h-[500px] bg-[#0A84FF]/6 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-[#BF5AF2]/5 rounded-full blur-[120px]" />
      </div>

      <Navbar />

      {/* ── HERO SECTION ──────────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

            {/* LEFT: Copy + CTAs */}
            <div className="lg:col-span-6 space-y-7 animate-fade-in-up">

              {/* Status pill (JetBrains Mono Label) */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5E5CE6]/10 border border-[#5E5CE6]/25 text-[#c2c1ff] font-mono text-xs font-medium tracking-wide">
                <span className="h-2 w-2 rounded-full bg-[#30D158] animate-pulse shrink-0" />
                2 Free Optimizations — No Credit Card
              </div>

              {/* Display Hero Headline (Plus Jakarta Sans, 72px / 40px, -0.03em) */}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[60px] font-extrabold tracking-[-0.03em] leading-[1.08] text-white">
                Stop Getting{" "}
                <span className="bg-gradient-to-r from-[#64D2FF] via-[#0A84FF] to-[#5E5CE6] bg-clip-text text-transparent">
                  Rejected.
                </span>
                <br />
                Start Getting{" "}
                <span className="bg-gradient-to-r from-[#c2c1ff] via-[#5E5CE6] to-[#BF5AF2] bg-clip-text text-transparent">
                  Interviews.
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed font-normal">
                Paste your resume + job description. Our AI rewrites, keyword-matches, and ATS-scores
                your resume in under 30 seconds — completely free to start.
              </p>

              {/* CTA Buttons (Precision 8px radii) */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link href="/auth/signup">
                  <button className="btn-primary-gradient px-7 py-3.5 text-sm font-semibold flex items-center gap-2 rounded-lg shadow-lg">
                    <span>Get Started Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  onClick={handleTrySample}
                  className="btn-secondary-glass px-7 py-3.5 text-sm font-semibold rounded-lg flex items-center gap-1.5"
                >
                  Try Sample Resume →
                </button>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#c7c4d7] font-medium font-mono pt-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#5E5CE6]" /> No data sold
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#5E5CE6]" /> Results in ~20s
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#30D158]" /> Free to start
                </span>
              </div>
            </div>

            {/* RIGHT: ATS Score Demo Card */}
            <div className="lg:col-span-6 flex justify-center lg:justify-end animate-fade-in-up" style={{ animationDelay: "150ms" }}>
              <div className="relative w-full max-w-[480px]">

                {/* Floating badge top-right */}
                <div className="absolute -top-3.5 right-4 z-10 flex items-center gap-2.5 bg-[#1e2024]/95 border border-white/12 px-3.5 py-2 rounded-xl shadow-2xl backdrop-blur-md">
                  <div className="h-7 w-7 rounded-lg bg-[#5E5CE6]/20 border border-[#5E5CE6]/30 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-[#c2c1ff]" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider leading-none">
                      Real-Time Rewrite
                    </div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      Optimizing Bullets...
                    </div>
                  </div>
                </div>

                {/* Main ATS score card (Level 1 surface #161B22 + glass-stroke) */}
                <div className="diamond-gleam relative bg-[#161B22] border border-white/12 rounded-2xl p-7 shadow-2xl overflow-hidden">
                  
                  {/* Radial emerald glow on right side */}
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at center, rgba(48,209,88,0.15) 0%, transparent 70%)",
                    }}
                  />

                  {/* Header row */}
                  <div className="flex items-start justify-between mb-5 relative z-10">
                    <div>
                      <div className="text-xs text-slate-400 font-mono font-medium mb-2 uppercase tracking-wider">
                        Current ATS Score
                      </div>
                      <div className="text-4xl font-extrabold text-[#FF453A] font-heading leading-none">
                        <AnimatedCounter from={0} to={34} duration={800} suffix="%" />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-[#FF453A] font-medium">
                        <span>✕</span> Missing 14 keywords
                      </div>
                    </div>
                    <div className="text-4xl font-extrabold text-[#30D158] font-heading leading-none mt-1">
                      <AnimatedCounter from={34} to={91} duration={1600} suffix="%" />
                    </div>
                  </div>

                  {/* Animated progress bar: Red → Yellow → Emerald */}
                  <div className="h-2.5 w-full rounded-full overflow-hidden bg-[#1e2024] mb-5 relative z-10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: barReady ? "91%" : "34%",
                        transition: "width 1.6s cubic-bezier(0.22, 1, 0.36, 1)",
                        background: "linear-gradient(90deg, #FF453A 0%, #FFD60A 50%, #30D158 100%)",
                      }}
                    />
                  </div>

                  {/* Bottom tiles */}
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-[#1a1c20] border border-white/8 rounded-xl p-3.5">
                      <div className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider mb-1">
                        Keywords
                      </div>
                      <div className="text-xs font-semibold text-[#30D158]">Full Coverage</div>
                    </div>
                    <div className="bg-[#1a1c20] border border-white/8 rounded-xl p-3.5">
                      <div className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider mb-1">
                        Format
                      </div>
                      <div className="text-xs font-semibold text-[#64D2FF]">ATS-Ready ✓</div>
                    </div>
                  </div>
                </div>

                {/* Ambient backlight */}
                <div className="absolute inset-0 -z-10 rounded-2xl bg-[#5E5CE6]/10 blur-2xl scale-90 translate-y-3" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SCORE LIFT SECTION ──────────────────────────────────── */}
      <ScrollFadeIn className="py-16 md:py-20 border-t border-white/12 bg-[#0c0e12]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-[#c2c1ff]">
              Real Results
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Watch Your ATS Score Climb
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto font-normal leading-relaxed">
              Every optimization is scored before and after so you can see exactly how much better your resume performs.
            </p>
          </div>

          <div className="flex flex-row items-center justify-center gap-8 md:gap-16">
            <div className="flex flex-col items-center gap-2">
              <CircleGauge value={34} label="Before" size={110} />
              <p className="text-xs text-slate-400 font-mono font-medium">14 keywords missing</p>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="h-px w-12 md:w-20 bg-gradient-to-r from-[#FF453A]/40 to-[#5E5CE6]/40" />
              <span className="text-xs font-mono font-semibold text-[#c2c1ff] bg-[#5E5CE6]/15 border border-[#5E5CE6]/30 px-3 py-1 rounded-full">
                ⚡ AI Engine
              </span>
              <div className="h-px w-12 md:w-20 bg-gradient-to-r from-[#5E5CE6]/40 to-[#30D158]/40" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <CircleGauge value={91} label="After" size={110} />
              <p className="text-xs text-slate-400 font-mono font-medium">ATS-ready ✓</p>
            </div>
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── FEATURES GRID ────────────────────────────────────────── */}
      <ScrollFadeIn className="py-16 md:py-20 border-t border-white/12">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-[#c2c1ff]">
              Why FastHire AI
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built for Candidate Precision &amp; Speed
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Target,
                title: "ATS-First Design",
                desc: "Every rewrite targets the exact keywords recruiters' ATS systems filter for.",
              },
              {
                icon: Zap,
                title: "30-Second Results",
                desc: "No waiting. No wizard. Just paste and get a better resume immediately.",
              },
              {
                icon: Shield,
                title: "100% Private",
                desc: "Your resume data is never sold, shared, or used to train third-party models.",
              },
              {
                icon: Download,
                title: "PDF & DOCX Ready",
                desc: "Export clean, recruiter-ready documents in one click.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="glass-card p-6 rounded-2xl space-y-3 hover:border-white/20 transition-all duration-200"
              >
                <div className="h-9 w-9 rounded-lg bg-[#5E5CE6]/15 border border-[#5E5CE6]/25 flex items-center justify-center">
                  <Icon className="h-4.5 w-4.5 text-[#c2c1ff]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-heading font-bold text-white text-base">{title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <ScrollFadeIn className="py-16 md:py-20 border-t border-white/12 bg-[#0c0e12]/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#5E5CE6]/10 border border-[#5E5CE6]/25 text-[#c2c1ff] text-xs font-mono font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Free Forever Tier
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Land More{" "}
            <span className="bg-gradient-to-r from-[#c2c1ff] via-[#5E5CE6] to-[#0A84FF] bg-clip-text text-transparent">
              Interviews?
            </span>
          </h2>
          <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
            2 free resume optimizations every month. No credit card required.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link href="/auth/signup">
              <button className="btn-primary-gradient px-8 py-3.5 text-sm font-semibold flex items-center gap-2 rounded-lg shadow-lg">
                <span>Start For Free →</span>
              </button>
            </Link>
            <button
              onClick={handleTrySample}
              className="btn-secondary-glass px-8 py-3.5 text-sm font-semibold rounded-lg"
            >
              See a Demo
            </button>
          </div>
        </div>
      </ScrollFadeIn>

    </div>
  );
}
