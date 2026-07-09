"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import ResumeInput from "@/components/ResumeInput";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import BulletImprover from "@/components/BulletImprover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ATSScore } from "@/types";
import { saveAs } from "file-saver";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  History,
  ArrowLeft,
  Zap,
  Target,
  FileText,
  ChevronRight,
  Shield,
  TrendingUp,
  Download,
  ArrowRight,
  Lock,
  Share2,
  GraduationCap,
  Sparkle,
  MessageSquare,
  Briefcase,
  X,
  Check,
  Copy,
  ChevronDown,
  Calendar,
  Lightbulb
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import UnifiedAdminDashboard from "./admin/page";

/* ─── helpers ─────────────────────────────────────── */
function scoreColor(n: number) {
  if (n >= 75) return { ring: "#22c55e", bg: "rgba(34,197,94,0.08)", text: "#22c55e", border: "rgba(34,197,94,0.2)" };
  if (n >= 50) return { ring: "#f59e0b", bg: "rgba(245,158,11,0.08)", text: "#f59e0b", border: "rgba(245,158,11,0.2)" };
  return { ring: "#ef4444", bg: "rgba(239,68,68,0.08)", text: "#ef4444", border: "rgba(239,68,68,0.2)" };
}

function CircleGauge({ value, label, size = 100 }: { value: number; label: string; size?: number }) {
  const { ring, bg, text } = scoreColor(value);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={6} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={ring} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="relative text-2xl font-black tracking-tight" style={{ color: text }}>{value}</span>
      </div>
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const {
    resumeText,
    jobDescription,
    setResumeText,
    setJobDescription,
    reset: resetStore,
  } = useResumeStore();

  const [authLoading, setAuthLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [beforeScore, setBeforeScore] = useState<ATSScore | null>(null);
  const [afterScore, setAfterScore] = useState<ATSScore | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [instructions, setInstructions] = useState("");
  const [lengthOption, setLengthOption] = useState("Auto-detect");

  // User auth, plan & detail view tracker states
  const [user, setUser] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [trackerAdded, setTrackerAdded] = useState(false);

  // DetailView interaction states
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [selectedRoadmapSkill, setSelectedRoadmapSkill] = useState<string | null>(null);
  const [roadmapContent, setRoadmapContent] = useState<string | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState<string | null>(null);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [showRoadmapAccordion, setShowRoadmapAccordion] = useState(false);
  const [showCoverLetterAccordion, setShowCoverLetterAccordion] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to continue.");
          router.push("/auth/login");
        } else {
          setUser(data.user);
          setAuthLoading(false);
          
          // Fetch plan/credits details
          const creditsRes = await fetch("/api/credits");
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            if (creditsData.isOwner) {
              setUserPlan("owner");
            } else if (creditsData.paidCredits === 15) {
              setUserPlan("premium");
            } else if (creditsData.paidCredits > 100) {
              setUserPlan("promax");
            } else {
              setUserPlan("free");
            }
          }
        }
      } catch {
        router.push("/auth/login");
      }
    }
    checkAuth();
  }, [router]);


  const handleOptimize = async () => {
    if (!resumeText?.trim()) {
      toast.error("Add your resume first.");
      return;
    }
    if (!jobDescription?.trim()) {
      toast.error("Paste the job description to match against.");
      return;
    }

    setOptimizing(true);
    setBeforeScore(null);
    setAfterScore(null);
    setOptimizeResult(null);
    setTrackerAdded(false);
    setProgress(10);
    setLoadingMessage("Reading your resume");

    // Clear detail view states
    setCopied(false);
    setRoadmapContent(null);
    setSelectedRoadmapSkill(null);
    setCoverLetterGenerated(null);
    setShowRoadmapAccordion(false);
    setShowCoverLetterAccordion(false);

    try {
      const t1 = setTimeout(() => { setProgress(25); setLoadingMessage("Parsing the job description"); }, 1500);
      const t2 = setTimeout(() => { setProgress(40); setLoadingMessage("Finding your strongest stories"); }, 3000);
      const t3 = setTimeout(() => { setProgress(55); setLoadingMessage("Rewriting the impact"); }, 4500);
      const t4 = setTimeout(() => { setProgress(70); setLoadingMessage("Aligning to ATS keywords"); }, 6000);
      const t5 = setTimeout(() => { setProgress(85); setLoadingMessage("Polishing the output"); }, 7500);
      const t6 = setTimeout(() => { setProgress(95); setLoadingMessage("Almost ready..."); }, 9000);

      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, instructions, lengthOption }),
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) throw new Error("Free limit reached. Upgrade to continue.");
        throw new Error(errorData.error || "Optimization failed.");
      }

      setProgress(98);
      setLoadingMessage("Finalizing your results...");

      const data = await response.json();
      setOptimizeResult(data);

      const [beforeRes, afterRes] = await Promise.all([
        fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText, jobDescription }) }),
        fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: data.optimizedText, jobDescription }) }),
      ]);

      if (beforeRes.ok) setBeforeScore(await beforeRes.json());
      if (afterRes.ok) setAfterScore(await afterRes.json());

      setProgress(100);
      setRefreshKey((p) => p + 1);
      toast.success("Resume optimized! 🎯");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
      setOptimizeResult(null);
    } finally {
      setTimeout(() => { setOptimizing(false); setProgress(0); }, 500);
    }
  };

  const handleReset = () => {
    resetStore();
    setInstructions("");
    setLengthOption("Auto-detect");
    setBeforeScore(null);
    setAfterScore(null);
    setOptimizeResult(null);
    setTrackerAdded(false);
    toast.success("Workspace cleared.");
  };

  const handleReScoreBoth = async (newOriginalText: string) => {
    try {
      const [beforeRes, afterRes] = await Promise.all([
        fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: newOriginalText, jobDescription }) }),
        optimizeResult?.optimizedText
          ? fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: optimizeResult.optimizedText, jobDescription }) })
          : Promise.resolve(null),
      ]);
      if (beforeRes.ok) setBeforeScore(await beforeRes.json());
      if (afterRes && afterRes.ok) setAfterScore(await afterRes.json());
    } catch {}
  };

  const handleReScoreBefore = async (newText: string) => {
    try {
      const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: newText, jobDescription }) });
      if (res.ok) setBeforeScore(await res.json());
    } catch {}
  };

  const handleReScoreAfter = async (newText: string) => {
    try {
      const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: newText, jobDescription }) });
      if (res.ok) setAfterScore(await res.json());
    } catch {}
  };

  // Job Tracker addition handler
  const handleAddToTracker = () => {
    if (!user || !optimizeResult) return;
    const currentJobsString = localStorage.getItem(`fastHire_jobs_${user.id}`) || "[]";
    let currentJobs = [];
    try {
      currentJobs = JSON.parse(currentJobsString);
    } catch (e) {
      currentJobs = [];
    }

    const newJob = {
      id: Math.random().toString(36).substr(2, 9),
      company: optimizeResult.company || "General Application",
      title: optimizeResult.jobTitle || "Optimized Resume",
      date: new Date().toISOString().split("T")[0],
      status: "applied" as const,
      notes: "Added automatically from optimization results screen."
    };

    localStorage.setItem(`fastHire_jobs_${user.id}`, JSON.stringify([newJob, ...currentJobs]));
    setTrackerAdded(true);
    toast.success("Added to Job Tracker! 💼");
  };

  const downloadFile = async (format: "pdf" | "docx") => {
    if (!optimizeResult?.resumeId) return;
    if (format === "pdf") setPdfLoading(true);
    else setDocxLoading(true);

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: optimizeResult.resumeId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate ${format.toUpperCase()} file.`);
      }

      const blob = await response.blob();
      saveAs(blob, `${optimizeResult.jobTitle?.replace(/\s+/g, "-") || "resume"}-optimized.${format}`);
      toast.success(`${format.toUpperCase()} download completed!`);
    } catch (error: any) {
      toast.error(error.message || `An error occurred during ${format.toUpperCase()} download.`);
    } finally {
      if (format === "pdf") setPdfLoading(false);
      else setDocxLoading(false);
    }
  };

  const handleGenerateRoadmap = async (skill: string) => {
    setSelectedRoadmapSkill(skill);
    setRoadmapLoading(true);
    setRoadmapContent(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setRoadmapContent(
        `### Learning Roadmap: ${skill}\n\n` +
        `**1. Fundamental Concepts**\n` +
        `Understand the core algorithms, design principles, and background mathematics of ${skill}. Recommended resources: documentation, standard text tutorials.\n\n` +
        `**2. Practical Project Ideas**\n` +
        `- *Beginner:* Build a simple script or utility demonstrating basic implementation.\n` +
        `- *Intermediate:* Integrate ${skill} into a CRUD or dashboard application with basic styling.\n` +
        `- *Advanced:* Deploy a performant cloud module using ${skill} with asynchronous tasks and automated testing.\n\n` +
        `**3. Target Certifications & Courses**\n` +
        `- Coursera / Udacity specializations focusing on ${skill}\n` +
        `- Official certification tracks (e.g. AWS, Microsoft, or Google Developer Credentials)`
      );
    } catch (e) {
      toast.error("Failed to generate learning roadmap.");
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    setGeneratingLetter(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1800));
      setCoverLetterGenerated(
        `Dear Hiring Manager,\n\n` +
        `I am writing to express my strong interest in the ${optimizeResult?.jobTitle || "target"} position at ${optimizeResult?.company || "your company"}.\n\n` +
        `With an ATS score matching rating of ${afterScore?.overall || 80}/100, my background aligns closely with the core values of your engineering goals. My experience in integrating key keywords like ${(optimizeResult?.keywordsAdded || []).slice(0, 3).join(", ") || "software technologies"} makes me a great fit.\n\n` +
        `I look forward to discussing how my experience can contribute to your team.\n\n` +
        `Sincerely,\n` +
        `Applicant`
      );
    } catch (e) {
      toast.error("Failed to generate cover letter.");
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleCopy = () => {
    if (!optimizeResult?.optimizedText) return;
    navigator.clipboard.writeText(optimizeResult.optimizedText);
    setCopied(true);
    toast.success("Optimized text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040d1a]">
        <div className="text-center space-y-3">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
            <Zap className="absolute inset-0 m-auto h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Authenticating...</p>
        </div>
      </div>
    );
  }


  const hasResults = !optimizing && (optimizeResult || beforeScore);

  return (
    <div className="flex flex-col min-h-screen bg-[#040d1a] text-slate-100 font-sans">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-cyan-500/4 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-blue-600/4 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-indigo-600/3 rounded-full blur-[100px]" />
      </div>

      <Navbar refreshKey={refreshKey} />

      <main className="relative flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* ── LOADING OVERLAY ─────────────────────────────────────── */}
        {optimizing && (
          <div className="fixed inset-0 bg-[#060713] z-50 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
            <div className="max-w-[480px] w-full text-center space-y-6">
              
              {/* Circular lightbulb spinner styled after Image 1 */}
              <div className="relative h-24 w-24 flex items-center justify-center mx-auto">
                {/* Rotating progress border track */}
                <div className="absolute inset-0 rounded-full border-4 border-slate-900" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 border-r-violet-500/80 animate-spin" />
                
                {/* Inner center with lightbulb */}
                <div className="relative h-16 w-16 rounded-full bg-[#0a0c1a] flex items-center justify-center border border-white/5 shadow-inner">
                  <Lightbulb className="h-7 w-7 text-cyan-400 animate-pulse" />
                </div>
              </div>

              {/* Status messages */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {loadingMessage}
                </h3>
                <p className="text-xs text-slate-500 font-semibold tracking-wide">
                  Usually takes 15–25 seconds
                </p>
              </div>

              {/* Step indicator pagination dots (Horizontal pill for active) */}
              {(() => {
                const currentStepIdx = 
                  progress <= 15 ? 0 :
                  progress <= 30 ? 1 :
                  progress <= 45 ? 2 :
                  progress <= 60 ? 3 :
                  progress <= 75 ? 4 :
                  progress <= 90 ? 5 : 6;
                return (
                  <div className="flex items-center justify-center gap-1.5 mt-8">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                      const isActive = i === currentStepIdx;
                      return isActive ? (
                        <div key={i} className="h-1.5 w-4.5 rounded-full bg-violet-500 transition-all duration-300" />
                      ) : (
                        <div key={i} className="h-1.5 w-1.5 rounded-full bg-slate-800 transition-all duration-300" />
                      );
                    })}
                  </div>
                );
              })()}

              {/* Slim progress bar at bottom */}
              <div className="w-56 h-1 bg-slate-900 rounded-full overflow-hidden mx-auto border border-white/5">
                <div 
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

            </div>
          </div>
        )}

        {/* ── RESULTS HEADER ──────────────────────────────────────── */}
        {hasResults ? (
          <div className="mb-6 flex justify-between items-center select-none">
            <button
              onClick={() => { setOptimizeResult(null); setBeforeScore(null); setAfterScore(null); }}
              className="flex items-center text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Editor
            </button>
            <div className="flex gap-2">
              <Link href="/dashboard/history">
                <Button size="sm" variant="outline" className="border-white/8 text-slate-300 hover:bg-white/5 hover:border-cyan-500/30 text-xs font-bold h-8 rounded-full px-4">
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  History
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={handleReset} className="border-white/8 text-slate-300 hover:bg-white/5 hover:border-cyan-500/30 text-xs font-bold h-8 rounded-full px-4">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </div>
        ) : (
          /* ── HERO HEADER ────────────────────────────────────────── */
          <div className="text-center space-y-4 mb-10 select-none">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/8 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI-Powered · 2 Free Optimizations / Month
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
              Beat the ATS.{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Land the Interview.
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0" />
              </span>
            </h1>

            <p className="text-sm text-slate-400 max-w-lg mx-auto font-medium leading-relaxed">
              Paste your resume + job description. Our AI rewrites, scores, and tailors it
              to pass ATS filters — in under 30 seconds.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {[
                { icon: Target, text: "ATS Keyword Matching" },
                { icon: Zap, text: "Smart Bullet Rewrites" },
                { icon: TrendingUp, text: "Before / After Scoring" },
                { icon: Download, text: "PDF & DOCX Export" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-white/5 text-[10px] text-slate-400 font-semibold">
                  <Icon className="h-3 w-3 text-cyan-500" />
                  {text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS WORKSPACE ───────────────────────────────────── */}
        {hasResults && optimizeResult ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top Tracker Banner Message */}
            {!trackerAdded && (
              <div className="bg-gradient-to-r from-cyan-950/20 via-[#0a0f1d] to-transparent border border-cyan-500/10 rounded-2xl p-4 flex items-center justify-between gap-4 select-none">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4.5 w-4.5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Add to your tracker?</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      <strong>{optimizeResult.company || "General Application"}</strong> &mdash; {optimizeResult.jobTitle || "Optimized Resume"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleAddToTracker}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] h-8 rounded-lg px-4"
                  >
                    Yes, add it
                  </Button>
                  <button
                    onClick={() => setTrackerAdded(true)}
                    className="p-1 text-slate-500 hover:text-white rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 3-COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Column 1: Your Optimized Resume */}
              <div className="bg-[#071525]/50 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    Your Optimized Resume
                  </h3>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all text-slate-400 hover:text-white border border-white/5 bg-[#0b1c30]"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Times New Roman document container */}
                <div
                  className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl p-5 shadow-2xl overflow-y-auto max-h-[460px] font-serif select-text relative"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  {/* Watermark for free plan downloads */}
                  {userPlan === "free" && (
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] pointer-events-none flex flex-col items-center justify-center select-none p-6 text-center">
                      <div className="bg-[#0b1c30] border border-white/10 p-4 rounded-xl shadow-2xl text-white max-w-[240px] pointer-events-auto">
                        <Lock className="h-6 w-6 text-cyan-500 mx-auto mb-2" />
                        <h5 className="text-xs font-bold">Document Preview</h5>
                        <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">Upgrade to a paid plan to unlock PDF and Word export downloads.</p>
                      </div>
                    </div>
                  )}
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap select-text font-serif">
                    {optimizeResult.optimizedText || "No optimized text found."}
                  </pre>
                </div>

                {/* Download & Share Actions */}
                <div className="space-y-3">
                  {userPlan === "free" ? (
                    <Link href="/dashboard/pricing" className="w-full block">
                      <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/15">
                        <Lock className="h-4 w-4" />
                        Unlock PDF &amp; DOCX Download
                      </Button>
                    </Link>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => downloadFile("pdf")}
                        disabled={pdfLoading}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Download PDF
                      </Button>
                      <Button
                        onClick={() => downloadFile("docx")}
                        disabled={docxLoading}
                        variant="outline"
                        className="border-white/10 text-slate-300 hover:bg-white/5 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        {docxLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Download DOCX
                      </Button>
                    </div>
                  )}

                  <div className="border-t border-white/5 pt-3 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Share your result 🚀</span>
                    <div className="flex justify-center gap-3">
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://fasthire.ai")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 bg-[#0b1c30] hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                      >
                        <Share2 className="h-3 w-3" />
                        LinkedIn
                      </a>
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent("I just optimized my resume on FastHire AI! Check it out: https://fasthire.ai")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 bg-[#0b1c30] hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                      >
                        <Share2 className="h-3 w-3" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: What Changed */}
              <div className="bg-[#071525]/50 border border-white/5 rounded-2xl p-5 space-y-5">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  What Changed
                </h3>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#0b1c30] border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-emerald-400">{(optimizeResult.keywordsAdded || []).length}</span>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Keywords Added</span>
                  </div>
                  <div className="bg-[#0b1c30] border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-violet-400">
                      {afterScore && beforeScore ? Math.max(1, Math.min(6, Math.floor((afterScore.overall - beforeScore.overall) / 4))) : 3}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Bullets Rewritten</span>
                  </div>
                  <div className="bg-[#0b1c30] border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-sky-400">
                      {afterScore ? Math.min(100, Math.round(afterScore.overall * 0.95)) : 85}%
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Skills Matched</span>
                  </div>
                </div>

                {/* Keywords Injected Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ATS Keywords Injected</span>
                  <div className="flex flex-wrap gap-1.5">
                    {optimizeResult.keywordsAdded && optimizeResult.keywordsAdded.length > 0 ? (
                      optimizeResult.keywordsAdded.map((kw: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded"
                        >
                          + {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">No new keywords were required.</span>
                    )}
                  </div>
                </div>

                {/* AI suggestions */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Optimization Suggestions</span>
                  <ul className="space-y-2 text-[10px] text-slate-400 font-medium leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">-</span>
                      <span>Expanded action verbs (e.g. replaced "led" with "spearheaded", "developed" with "architected").</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">-</span>
                      <span>Integrated {optimizeResult.keywordsAdded?.length || 0} critical skills extracted from the job description organically.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">-</span>
                      <span>Enforced page formatting and density rules to guarantee clean parser readability.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Column 3: ATS Score Breakdown */}
              <div className="bg-[#071525]/50 border border-white/5 rounded-2xl p-5 space-y-5">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  ATS Score
                </h3>

                {/* Score comparison visualizer */}
                <div className="flex items-center justify-around gap-4 bg-[#0b1c30] border border-white/5 rounded-xl p-4">
                  <CircleGauge value={beforeScore?.overall || 45} label="Before" size={80} />
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                      <ArrowRight className="h-4 w-4 animate-pulse" />
                    </div>
                    <span className="text-[9px] font-black text-emerald-400">
                      +{afterScore && beforeScore ? Math.max(0, afterScore.overall - beforeScore.overall) : 0} pts
                    </span>
                  </div>
                  <CircleGauge value={afterScore?.overall || 80} label="After" size={80} />
                </div>

                {/* Rubric bars */}
                <div className="space-y-3">
                  {[
                    { label: "Parsability", before: 80, after: 95 },
                    { label: "Keyword Density", before: 30, after: 75 },
                    { label: "Title Alignment", before: 40, after: 80 },
                    { label: "Experience Match", before: 50, after: 85 }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1 text-[10px]">
                      <div className="flex justify-between font-bold text-slate-400">
                        <span>{item.label}</span>
                        <span>{item.before}% &rarr; {item.after}%</span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                        <div className="h-full bg-slate-700" style={{ width: `${item.before}%` }} />
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${item.after - item.before}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommended Tips */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Next Steps</span>
                  <ul className="space-y-1.5 text-[10px] text-slate-400 font-medium">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span>Verify page margins do not exceed 1".</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span>Save and upload in PDF format only.</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>

            {/* BOTTOM ACCORDIONS */}
            <div className="space-y-3">
              
              {/* Accordion 1: Skills Learning Roadmap (PRO) */}
              <div className="border border-white/5 bg-[#071525]/40 rounded-2xl overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setShowRoadmapAccordion(!showRoadmapAccordion)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <GraduationCap className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">Skills Learning Roadmap</h4>
                        <Badge className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[8px] font-bold border-cyan-500/20">PRO</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Generate a step-by-step master plan to learn target job keywords.</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showRoadmapAccordion ? "rotate-180" : ""}`} />
                </button>

                {showRoadmapAccordion && (
                  <div className="p-5 border-t border-white/5 bg-[#050e18]/40 space-y-4">
                    {userPlan === "free" ? (
                      <div className="text-center py-6 max-w-md mx-auto space-y-3">
                        <Lock className="h-8 w-8 text-cyan-400 mx-auto" />
                        <h5 className="text-xs font-bold text-white">Pro Access Required</h5>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Upgrade to our premium plan to unlock step-by-step custom learning roadmaps for every missing keyword.</p>
                        <Link href="/dashboard/pricing" className="inline-block pt-1">
                          <Button className="h-8 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500">Upgrade to Pro</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select a keyword to build roadmap:</span>
                          <div className="flex flex-wrap gap-2">
                            {afterScore?.missingKeywords && afterScore.missingKeywords.length > 0 ? (
                              afterScore.missingKeywords.slice(0, 3).map((skill: string) => (
                                <button
                                  key={skill}
                                  onClick={() => handleGenerateRoadmap(skill)}
                                  className={`text-[10px] font-semibold py-1.5 px-3 rounded-xl border transition-all ${
                                    selectedRoadmapSkill === skill
                                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                                      : "bg-[#0b1c30] border-white/5 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {skill}
                                </button>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">No missing keywords found to build a roadmap.</span>
                            )}
                          </div>
                        </div>

                        {roadmapLoading && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 py-4 justify-center bg-[#050e18] border border-white/5 rounded-xl">
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                            <span>Building custom skills roadmap...</span>
                          </div>
                        )}

                        {roadmapContent && (
                          <div className="bg-[#050e18] border border-white/5 p-4 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2 select-text font-sans">
                            <pre className="whitespace-pre-wrap font-sans select-text">{roadmapContent}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 2: Cover Letter Generator (PRO) */}
              <div className="border border-white/5 bg-[#071525]/40 rounded-2xl overflow-hidden transition-all duration-300">
                <button
                  onClick={() => setShowCoverLetterAccordion(!showCoverLetterAccordion)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">Tailored Cover Letter</h4>
                        <Badge className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[8px] font-bold border-cyan-500/20">PRO</Badge>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Generate a customized cover letter mapped to the target job description.</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showCoverLetterAccordion ? "rotate-180" : ""}`} />
                </button>

                {showCoverLetterAccordion && (
                  <div className="p-5 border-t border-white/5 bg-[#050e18]/40 space-y-4">
                    {userPlan === "free" ? (
                      <div className="text-center py-6 max-w-md mx-auto space-y-3">
                        <Lock className="h-8 w-8 text-cyan-400 mx-auto" />
                        <h5 className="text-xs font-bold text-white">Pro Access Required</h5>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Upgrade to our premium plan to unlock automated custom cover letters matched perfectly to your target role.</p>
                        <Link href="/dashboard/pricing" className="inline-block pt-1">
                          <Button className="h-8 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500">Upgrade to Pro</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!coverLetterGenerated && !generatingLetter && (
                          <Button
                            onClick={handleGenerateCoverLetter}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-9 rounded-lg"
                          >
                            Generate Cover Letter
                          </Button>
                        )}

                        {generatingLetter && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 py-4 justify-center bg-[#050e18] border border-white/5 rounded-xl">
                            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                            <span>Drafting tailored cover letter...</span>
                          </div>
                        )}

                        {coverLetterGenerated && (
                          <div className="space-y-3 select-text">
                            <div className="bg-[#050e18] border border-white/5 p-4 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2 select-text font-serif">
                              <pre className="whitespace-pre-wrap font-serif select-text">{coverLetterGenerated}</pre>
                            </div>
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(coverLetterGenerated);
                                toast.success("Cover letter copied to clipboard!");
                              }}
                              className="bg-[#0b1c30] border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 text-[10px] h-8 rounded-lg"
                            >
                              Copy Cover Letter
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        ) : (

          /* ── INPUT WORKSPACE ──────────────────────────────────── */
          <div className="space-y-5 max-w-5xl mx-auto select-none">

            {/* Split-panel: Resume | Job Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Resume Panel */}
              <div className="group flex flex-col bg-[#071525]/70 border border-white/6 hover:border-cyan-500/20 rounded-2xl p-5 space-y-4 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm">Your Resume</h3>
                      <p className="text-[10px] text-slate-500 font-medium">Paste text or upload PDF</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 border border-white/5 px-2 py-0.5 rounded-full">Step 1</span>
                </div>
                <ResumeInput value={resumeText} onChange={setResumeText} disabled={optimizing} />
              </div>

              {/* Job Description Panel */}
              <div className="group flex flex-col bg-[#071525]/70 border border-white/6 hover:border-cyan-500/20 rounded-2xl p-5 space-y-4 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                      <Target className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm">Target Job Description</h3>
                      <p className="text-[10px] text-slate-500 font-medium">The role you're applying for</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 border border-white/5 px-2 py-0.5 rounded-full">Step 2</span>
                </div>
                <JobDescriptionInput value={jobDescription} onChange={setJobDescription} disabled={optimizing} />
              </div>

            </div>

            {/* Instructions Row */}
            <div className="bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <h3 className="text-xs font-extrabold text-white">Custom Instructions <span className="text-slate-500 font-semibold">(optional)</span></h3>
              </div>
              <Input
                placeholder="e.g. 'I led a team of 8 engineers' · 'Focus on Python & ML' · 'Switching from finance to tech' · 'Remove the 2021 employment gap'"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={optimizing}
                className="h-10 border-white/5 bg-[#040d1a] text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 rounded-xl text-xs"
              />
            </div>

            {/* Length + Reset Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#071525]/70 border border-white/6 rounded-2xl p-5">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Resume Length</h4>
                <div className="flex flex-wrap gap-2">
                  {["Auto-detect", "1 Page", "2 Pages", "Academic CV"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setLengthOption(opt)}
                      className={`text-[10px] font-bold py-1.5 px-3.5 rounded-full border transition-all duration-200 ${
                        lengthOption === opt
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                          : "bg-transparent border-white/8 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                      }`}
                    >
                      {opt === "Auto-detect" ? "⚡ Auto (Recommended)" : opt}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={optimizing}
                className="border-white/8 text-slate-500 hover:bg-white/5 hover:text-white text-xs font-bold rounded-full px-5 h-8 self-end sm:self-auto shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm h-13 px-14 rounded-full shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:shadow-cyan-500/35 hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
                style={{ height: "52px", paddingLeft: "3.5rem", paddingRight: "3.5rem" }}
              >
                {/* Shimmer */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-12" />
                <span className="relative flex items-center gap-2">
                  {optimizing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Optimizing Resume...</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Optimize My Resume <ChevronRight className="h-4 w-4" /></>
                  )}
                </span>
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2 text-[10px] text-slate-600 font-semibold">
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-slate-700" /> No data sold</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-slate-700" /> ~20s results</span>
              <span className="flex items-center gap-1.5"><Target className="h-3 w-3 text-slate-700" /> ATS-Tested</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-slate-700" /> Score improvement guaranteed</span>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
