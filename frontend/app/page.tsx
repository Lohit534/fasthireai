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
  Play,
  Film,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import CircleGauge from "@/components/CircleGauge";
import { supabase } from "@/lib/supabase/client";
import { DemoVideoModal } from "@/components/DemoVideoModal";

/* ── Landing FAQ ─────────────────────────────────────────── */
const LANDING_FAQS = [
  {
    q: "Is FastHire AI completely free?",
    a: "Yes! You get 2 free AI resume optimizations every month with no credit card required. You can upgrade to Premium Pro or Pro Max for more optimizations and features.",
  },
  {
    q: "How does FastHire AI improve my resume?",
    a: "Our AI analyzes your resume against the job description, identifies missing keywords, rewrites bullet points for impact, and scores your ATS compatibility — all in under 30 seconds.",
  },
  {
    q: "Will my resume actually pass ATS systems?",
    a: "Our AI is trained specifically on ATS parsing patterns. Users see an average ATS score lift of 57+ points after optimization. Results depend on how well your experience matches the target role.",
  },
  {
    q: "Is my resume data safe and private?",
    a: "Absolutely. Your resume is only used for the optimization request and is never sold, shared, or used to train third-party AI models. We take privacy very seriously.",
  },
  {
    q: "What file formats can I download?",
    a: "You can download your optimized resume as a professionally formatted PDF and DOCX (Word) file. Both are ATS-compatible and recruiter-ready.",
  },
  {
    q: "Can I use FastHire AI for different job roles?",
    a: "Yes! You can optimize your resume for as many different job roles or companies as you want. Just paste a new job description each time to get role-specific optimization.",
  },
  {
    q: "How is FastHire AI different from ChatGPT?",
    a: "FastHire AI is purpose-built for ATS optimization. It doesn't just rewrite — it scores your resume, identifies specific missing keywords, generates PDF/DOCX exports, tracks your history, and produces cover letters tailored to each JD.",
  },
  {
    q: "Do I need to install anything?",
    a: "No downloads required. FastHire AI works entirely in your browser. Just sign up and start optimizing your resume in seconds.",
  },
];

function LandingFAQ() {
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  return (
    <div className="space-y-3">
      {LANDING_FAQS.map((faq, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            className="border border-white/8 bg-[#161B22]/60 rounded-xl overflow-hidden transition-all duration-300"
          >
            <button
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-white hover:text-[#c2c1ff] transition-colors"
            >
              <span>{faq.q}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
              )}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-slate-400 font-normal leading-relaxed border-t border-white/5 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Animated number counter (scroll-triggered) ─────────── */
function AnimatedCounter({
  from,
  to,
  duration = 1800,
  suffix = "",
}: {
  from: number;
  to: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(from);
  const [started, setStarted] = useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);

  // Trigger only when element enters the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  // Run animation once started
  useEffect(() => {
    if (!started) return;
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
  }, [started, from, to, duration]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const { setResumeText, setJobDescription } = useResumeStore();
  const [barReady, setBarReady] = useState(false);

  useEffect(() => {
    // Clear any leftover pending sample keys when arriving on landing page
    localStorage.removeItem("fastHire_pendingSample");
    localStorage.removeItem("fastHire_sampleResume");
    localStorage.removeItem("fastHire_sampleJD");

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

  const handleTrySample = () => {
    const sampleResume = `JOHN DOE
Software Engineer | john.doe@email.com | (555) 123-4567 | San Francisco, CA
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

PROFESSIONAL SUMMARY
Results-driven Full Stack Engineer with 4+ years of experience designing and implementing scalable web applications, REST APIs, and microservices. Skilled in React, Node.js, Python, and AWS.

EXPERIENCE
Software Engineer | Acme Technologies | Jan 2022 – Present
• Designed and developed high-throughput REST APIs handling 50,000+ daily active users, reducing response latency by 35%.
• Spearheaded migration of monolithic web architecture to Docker microservices on AWS ECS, boosting system reliability to 99.9%.
• Automated CI/CD deployment pipelines using GitHub Actions, cutting release deployment cycle time from 2 hours to 15 minutes.

Frontend Developer | TechCorp Solutions | Jun 2020 – Dec 2021
• Built responsive web dashboards using React, TypeScript, and Redux, improving page load speed by 40%.
• Collaborated with UX designers and backend engineers to implement interactive analytics features.

TECHNICAL SKILLS
• Programming: JavaScript, TypeScript, Python, SQL, HTML/CSS
• Frameworks: React.js, Next.js, Node.js, Express, Tailwind CSS
• Cloud & Tools: AWS (ECS, S3, Lambda), Docker, Git, PostgreSQL, REST APIs

EDUCATION
B.S. in Computer Science | University of California, Berkeley | 2016 – 2020`;

    const sampleJD = `Senior Full Stack Developer
Company: CloudScale Systems
Location: San Francisco, CA / Remote

About the Role:
We are looking for a Senior Full Stack Developer to build high-performance web applications and cloud API services.

Key Responsibilities:
- Architect and deploy scalable frontend components in React and Next.js.
- Build robust, secure RESTful APIs and GraphQL endpoints in Node.js / TypeScript.
- Implement database optimizations in PostgreSQL and Redis.
- Drive CI/CD automation, unit testing, and Docker container deployment on AWS.
- Collaborate with product and design teams to deliver seamless user experiences.

Requirements:
- 3+ years of experience with modern JavaScript / TypeScript, React, and Node.js.
- Strong knowledge of REST APIs, PostgreSQL databases, and Docker containerization.
- Experience with cloud platforms (AWS / GCP) and automated testing frameworks.
- Bachelor's degree in Computer Science or equivalent practical experience.`;

    setResumeText(sampleResume);
    setJobDescription(sampleJD);
    localStorage.setItem("fastHire_pendingSample", "true");
    localStorage.setItem("fastHire_sampleResume", sampleResume);
    localStorage.setItem("fastHire_sampleJD", sampleJD);
    router.push("/auth/signup?sample=true");
  };

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

      {/* ── STATS SECTION ────────────────────────────────────── */}
      <ScrollFadeIn className="py-16 md:py-20 border-t border-white/12 bg-[#0c0e12]/80">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-[#c2c1ff]">
              By The Numbers
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Trusted by Job Seekers Worldwide
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Thousands of candidates have already landed interviews using FastHire AI.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { value: 1000,  suffix: "+", label: "Users Optimized",  color: "#c2c1ff", sub: "Active job seekers" },
              { value: 94,    suffix: "%", label: "Success Rate",     color: "#30D158", sub: "Got more callbacks" },
              { value: 57,    suffix: "+", label: "Avg. Score Lift",  color: "#64D2FF", sub: "ATS points gained" },
              { value: 3500,  suffix: "+", label: "Positive Reviews", color: "#FFD60A", sub: "5-star feedbacks" },
            ].map(({ value, suffix, label, color, sub }) => (
              <div
                key={label}
                className="relative overflow-hidden bg-[#161B22] border border-white/8 rounded-2xl p-6 text-center group hover:border-white/20 transition-all duration-300 hover:scale-[1.02]"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(ellipse at top, ${color}12 0%, transparent 70%)` }}
                />
                <div className="relative z-10 space-y-1">
                  <div className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color }}>
                    <AnimatedCounter from={0} to={value} duration={1800} suffix={suffix} />
                  </div>
                  <div className="text-sm font-bold text-white mt-2">{label}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── TOP COMPANIES MARQUEE ─────────────────────────────── */}
      <ScrollFadeIn className="py-14 border-t border-white/12">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 space-y-2">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-[#c2c1ff]">
              Top Companies
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Resumes Shortlisted At
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Our users have been shortlisted and hired at these industry-leading companies.
            </p>
          </div>

          {/* Infinite scroll marquee */}
          <div className="relative overflow-hidden">
            {/* Left / right fade masks */}
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #111318, transparent)" }} />
            <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #111318, transparent)" }} />

            <div className="flex animate-marquee gap-8 whitespace-nowrap">
              {[
                "Google", "Microsoft", "Amazon", "Meta", "Apple",
                "Flipkart", "Infosys", "Wipro", "TCS", "Accenture",
                "Deloitte", "IBM", "Capgemini", "HCL", "Cognizant",
                "Swiggy", "Zomato", "BYJU'S", "Razorpay", "PhonePe",
                "Paytm", "Freshworks", "Zoho", "MakeMyTrip", "OYO",
              ].concat([
                "Google", "Microsoft", "Amazon", "Meta", "Apple",
                "Flipkart", "Infosys", "Wipro", "TCS", "Accenture",
              ]).map((company, i) => (
                <div
                  key={i}
                  className="inline-flex items-center px-6 py-3 rounded-xl bg-[#161B22] border border-white/8 text-slate-300 font-semibold text-sm hover:border-violet-500/30 hover:text-white transition-all duration-200 shrink-0"
                >
                  <span className="h-2 w-2 rounded-full bg-violet-500/60 mr-2 shrink-0" />
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── USER TESTIMONIALS ─────────────────────────────────── */}
      <ScrollFadeIn className="py-16 md:py-20 border-t border-white/12 bg-[#0c0e12]/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-[#c2c1ff]">
              Real Feedback
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              What Job Seekers Are Saying
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "Arjun Sharma", role: "SDE at Amazon",  country: "🇮🇳 India",  rating: 5, text: "My ATS score went from 42% to 89% in 25 seconds. Got interview calls from 4 companies within a week. Absolutely game-changing!" },
              { name: "Priya Menon",  role: "Data Analyst at Infosys", country: "🇮🇳 India", rating: 5, text: "FastHire AI rewrote my bullet points to match the JD perfectly. I used to get zero callbacks. Now I have 3 interviews lined up." },
              { name: "Rohan Gupta",  role: "Full Stack Dev at Flipkart", country: "🇮🇳 India", rating: 5, text: "The keyword matching is incredibly accurate. It identified 17 keywords I was missing and filled them in naturally. Highly recommended!" },
              { name: "Sarah Chen",   role: "PM at Microsoft",  country: "🇸🇬 Singapore", rating: 5, text: "I was skeptical at first but the ATS score improvement was immediate and visible. Landed my dream job at Microsoft. Thank you FastHire!" },
              { name: "Rahul Verma",  role: "DevOps at Wipro",  country: "🇮🇳 India",   rating: 5, text: "The cover letter generator is brilliant too. I had 10 tailored cover letters ready in 30 minutes. No other tool comes close." },
              { name: "Ayesha Khan",  role: "UI/UX at Razorpay", country: "🇵🇰 Pakistan", rating: 5, text: "Went from 6 months of rejections to getting 2 offers in 3 weeks after using FastHire AI. The difference is night and day!" },
            ].map(({ name, role, country, rating, text }, i) => (
              <div
                key={i}
                className="relative bg-[#161B22] border border-white/8 rounded-2xl p-6 space-y-4 hover:border-violet-500/25 hover:scale-[1.01] transition-all duration-300"
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: rating }).map((_, j) => (
                    <span key={j} className="text-[#FFD60A] text-sm">★</span>
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-normal">"{text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {name[0]}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{name}</div>
                    <div className="text-[11px] text-slate-400">{role} &bull; {country}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── COUNTRIES MARQUEE ─────────────────────────────────── */}
      <ScrollFadeIn className="py-14 border-t border-white/12">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 space-y-2">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-[#c2c1ff]">
              Global Reach
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Used Across the World
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Job seekers from over 30 countries use FastHire AI to land interviews faster.
            </p>
          </div>

          {/* Reverse-direction marquee for countries */}
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #111318, transparent)" }} />
            <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #111318, transparent)" }} />

            <div className="flex animate-marquee-reverse gap-6 whitespace-nowrap">
              {[
                { flag: "🇮🇳", name: "India" },
                { flag: "🇺🇸", name: "USA" },
                { flag: "🇬🇧", name: "UK" },
                { flag: "🇩🇪", name: "Germany" },
                { flag: "🇨🇦", name: "Canada" },
                { flag: "🇦🇺", name: "Australia" },
                { flag: "🇸🇬", name: "Singapore" },
                { flag: "🇦🇪", name: "UAE" },
                { flag: "🇯🇵", name: "Japan" },
                { flag: "🇫🇷", name: "France" },
                { flag: "🇧🇷", name: "Brazil" },
                { flag: "🇵🇰", name: "Pakistan" },
                { flag: "🇳🇱", name: "Netherlands" },
                { flag: "🇸🇪", name: "Sweden" },
                { flag: "🇿🇦", name: "South Africa" },
                { flag: "🇧🇩", name: "Bangladesh" },
                { flag: "🇵🇭", name: "Philippines" },
                { flag: "🇮🇩", name: "Indonesia" },
                { flag: "🇲🇾", name: "Malaysia" },
                { flag: "🇨🇭", name: "Switzerland" },
              ].concat([
                { flag: "🇮🇳", name: "India" },
                { flag: "🇺🇸", name: "USA" },
                { flag: "🇬🇧", name: "UK" },
                { flag: "🇩🇪", name: "Germany" },
                { flag: "🇨🇦", name: "Canada" },
              ]).map(({ flag, name }, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#161B22] border border-white/8 text-slate-300 font-medium text-sm hover:border-emerald-500/30 hover:text-white transition-all shrink-0"
                >
                  <span className="text-base">{flag}</span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollFadeIn>

      {/* ── FAQ SECTION ───────────────────────────────────────── */}
      <ScrollFadeIn className="py-16 md:py-20 border-t border-white/12 bg-[#0c0e12]/60">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <span className="text-xs font-mono font-medium uppercase tracking-widest text-[#c2c1ff]">
              FAQ
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Everything you need to know about FastHire AI.
            </p>
          </div>

          <LandingFAQ />
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
              onClick={() => setIsDemoModalOpen(true)}
              className="btn-secondary-glass px-8 py-3.5 text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-white/10 transition-all"
            >
              <Play className="h-4 w-4 text-violet-400 fill-violet-400" />
              <span>See a Demo</span>
            </button>
          </div>
        </div>
      </ScrollFadeIn>

      <DemoVideoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
}
