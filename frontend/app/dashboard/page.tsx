"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import ResumeInput from "@/components/ResumeInput";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import ScoreCard from "@/components/ScoreCard";
import OptimizedResume from "@/components/OptimizedResume";
import KeywordBadges from "@/components/KeywordBadges";
import DownloadButtons from "@/components/DownloadButtons";
import BulletImprover from "@/components/BulletImprover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ATSScore } from "@/types";
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
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

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

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to continue.");
          router.push("/auth/login");
        } else {
          setAuthLoading(false);
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
    setProgress(10);
    setLoadingMessage("Scanning keywords & semantic patterns...");

    try {
      const t1 = setTimeout(() => { setProgress(35); setLoadingMessage("AI rewriting weak bullet points..."); }, 2000);
      const t2 = setTimeout(() => { setProgress(70); setLoadingMessage("Injecting missing keywords naturally..."); }, 5000);
      const t3 = setTimeout(() => { setProgress(90); setLoadingMessage("Computing ATS score improvements..."); }, 7500);

      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, instructions, lengthOption }),
      });

      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) throw new Error("Free limit reached. Upgrade to continue.");
        throw new Error(errorData.error || "Optimization failed.");
      }

      setProgress(95);
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
    toast.success("Workspace cleared.");
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
          <div className="fixed inset-0 bg-[#040d1a]/95 backdrop-blur-lg z-50 flex items-center justify-center p-6">
            <div className="max-w-[420px] w-full relative">
              {/* Glow behind card */}
              <div className="absolute -inset-8 bg-cyan-500/5 rounded-full blur-3xl" />
              <div className="relative bg-[#071525] border border-cyan-500/15 p-8 rounded-2xl shadow-2xl space-y-6">
                {/* Icon */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-14 w-14">
                    <div className="absolute inset-0 rounded-full bg-cyan-500/10 border border-cyan-500/20 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-cyan-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="font-black text-white text-base tracking-tight">Beating the ATS</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Tailoring your resume for the target role...</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-cyan-400">{loadingMessage}</span>
                    <span className="text-slate-500">{progress}%</span>
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-2.5 border-t border-white/5 pt-4">
                  {[
                    { label: "Keyword & semantic pattern analysis", thresh: 10 },
                    { label: "AI rewrites weak bullets with impact verbs", thresh: 35 },
                    { label: "Natural keyword injection into your resume", thresh: 70 },
                    { label: "Before & after ATS score computation", thresh: 90 },
                  ].map((step, idx) => {
                    const done = progress > step.thresh;
                    const active = progress >= step.thresh && !done;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center text-[9px] font-black shrink-0 transition-all ${
                          done ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                          : active ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse"
                          : "bg-slate-900 border-white/5 text-slate-600"
                        }`}>
                          {done ? "✓" : idx + 1}
                        </div>
                        <span className={`text-[11px] font-semibold transition-all ${
                          done ? "text-slate-500 line-through decoration-slate-700"
                          : active ? "text-white"
                          : "text-slate-600"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS HEADER ──────────────────────────────────────── */}
        {hasResults ? (
          <div className="mb-6 flex justify-between items-center">
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
          <div className="text-center space-y-4 mb-10">
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
        {hasResults ? (
          <div className="space-y-6">

            {/* Side-by-side editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Original Resume</span>
                </div>
                <ResumeInput value={resumeText} onChange={setResumeText} disabled={optimizing} />
              </div>

              {/* Optimized */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase text-cyan-500 tracking-widest">AI-Optimized Resume</span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    ATS-Tailored ✓
                  </span>
                </div>
                {optimizeResult?.optimizedText ? (
                  <OptimizedResume
                    text={optimizeResult.optimizedText}
                    resumeId={optimizeResult.resumeId}
                    onChange={(newText) => {
                      setOptimizeResult((prev: any) => ({ ...prev, optimizedText: newText }));
                      handleReScoreAfter(newText);
                    }}
                  />
                ) : (
                  <div className="text-center p-8 bg-slate-900/30 border border-white/5 rounded-2xl text-slate-600 text-xs italic">
                    No optimized output yet.
                  </div>
                )}
              </div>
            </div>

            {/* Score + Download + Keywords */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 border-t border-white/5 pt-6">
              <div className="lg:col-span-8">
                <ScoreCard before={beforeScore} after={afterScore} loading={optimizing} />
              </div>
              <div className="lg:col-span-4 flex flex-col gap-4">
                {optimizeResult?.resumeId && (
                  <div className="flex flex-col items-center justify-center bg-[#071525]/80 border border-cyan-500/10 rounded-2xl p-5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Export Document</span>
                    <DownloadButtons resumeId={optimizeResult.resumeId} text={optimizeResult.optimizedText} />
                  </div>
                )}
                {afterScore && (
                  <div className="flex-1 bg-[#071525]/60 border border-white/5 rounded-2xl p-4">
                    <KeywordBadges added={optimizeResult?.keywordsAdded || []} missing={afterScore.missingKeywords} />
                  </div>
                )}
              </div>
            </div>

            {/* Bullet Improver */}
            <div className="bg-[#071525]/60 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Bullet Point Enhancer</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Rewrite weak bullets with metrics & action verbs</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">Live Editor</span>
              </div>
              <div className="bg-[#040d1a]/60 border border-white/5 p-4 rounded-xl">
                <BulletImprover
                  resumeText={resumeText}
                  jobDescription={jobDescription}
                  onChange={(newText) => { setResumeText(newText); handleReScoreBefore(newText); }}
                />
              </div>
            </div>

            {/* AI Summary */}
            {optimizeResult?.summary && (
              <div className="bg-[#071525]/60 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">What Changed</h3>
                    <p className="text-[10px] text-slate-500 font-medium">AI summary of every optimization made</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{optimizeResult.summary}</p>
                {optimizeResult.keywordsAdded?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Keywords Added</span>
                    <div className="flex flex-wrap gap-1.5">
                      {optimizeResult.keywordsAdded.map((kw: string) => (
                        <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        ) : (

          /* ── INPUT WORKSPACE ──────────────────────────────────── */
          <div className="space-y-5 max-w-5xl mx-auto">

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
