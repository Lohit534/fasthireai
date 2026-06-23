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
  BarChart, 
  History, 
  ArrowLeft, 
  Check, 
  ChevronRight,
  TrendingUp,
  Settings,
  Cpu,
  BookOpen
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  
  // Zustand State Store
  const {
    resumeText,
    jobDescription,
    setResumeText,
    setJobDescription,
    reset: resetStore
  } = useResumeStore();

  const [authLoading, setAuthLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  const [beforeScore, setBeforeScore] = useState<ATSScore | null>(null);
  const [afterScore, setAfterScore] = useState<ATSScore | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Core visual fields from Image 3
  const [instructions, setInstructions] = useState("");
  const [lengthOption, setLengthOption] = useState("Auto-detect");

  // 1. Auth Guard Client Verification
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to access the dashboard.");
          router.push("/auth/login");
        } else {
          setAuthLoading(false);
        }
      } catch (err) {
        toast.error("Authentication check failed.");
        router.push("/auth/login");
      }
    }
    checkAuth();
  }, [router]);

  const handleOptimize = async () => {
    if (!resumeText || !resumeText.trim()) {
      toast.error("Please upload or paste your current resume first.");
      return;
    }
    if (!jobDescription || !jobDescription.trim()) {
      toast.error("Please paste the job description to optimize against.");
      return;
    }

    setOptimizing(true);
    setBeforeScore(null);
    setAfterScore(null);
    setOptimizeResult(null);
    setProgress(10);
    setLoadingMessage("Analyzing keywords...");

    try {
      // Step-by-step progress timeline simulation
      const t1 = setTimeout(() => {
        setProgress(35);
        setLoadingMessage("Running AI rewrite engine (rewriting weak bullets)...");
      }, 2000);

      const t2 = setTimeout(() => {
        setProgress(70);
        setLoadingMessage("Integrating keywords naturally...");
      }, 5000);

      const t3 = setTimeout(() => {
        setProgress(90);
        setLoadingMessage("Computing final ATS score weights...");
      }, 7500);

      // Perform POST call passing instructions & length option
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resumeText, 
          jobDescription,
          instructions,
          lengthOption
        })
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error("Free limit reached. Upgrade to continue.");
        }
        throw new Error(errorData.error || "Optimization handler failed.");
      }

      setProgress(95);
      setLoadingMessage("Mapping scoring reports...");
      
      const data = await response.json();
      setOptimizeResult(data);

      // Trigger detailed score calculations for before/after states
      const beforeScoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      const beforeScoreData = beforeScoreRes.ok ? await beforeScoreRes.json() : null;

      const afterScoreRes = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: data.optimizedText, jobDescription }),
      });
      const afterScoreData = afterScoreRes.ok ? await afterScoreRes.json() : null;

      setBeforeScore(beforeScoreData);
      setAfterScore(afterScoreData);
      
      setProgress(100);
      setRefreshKey(prev => prev + 1); // Trigger credits reload
      toast.success("Resume optimized successfully!");
    } catch (err: any) {
      toast.error(err.message || "Resume optimization failed.");
      setOptimizeResult(null);
    } finally {
      setTimeout(() => {
        setOptimizing(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleReset = () => {
    resetStore();
    setInstructions("");
    setLengthOption("Auto-detect");
    setBeforeScore(null);
    setAfterScore(null);
    setOptimizeResult(null);
    toast.success("Workspace reset.");
  };

  const handleReScoreBefore = async (newText: string) => {
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: newText, jobDescription }),
      });
      if (res.ok) {
        const data = await res.json();
        setBeforeScore(data);
      }
    } catch (err) {
      console.error("Failed to re-score before resume:", err);
    }
  };

  const handleReScoreAfter = async (newText: string) => {
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: newText, jobDescription }),
      });
      if (res.ok) {
        const data = await res.json();
        setAfterScore(data);
      }
    } catch (err) {
      console.error("Failed to re-score after resume:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying user credentials...</p>
        </div>
      </div>
    );
  }

  // Check if we show the Results Workspace view
  const hasResults = !optimizing && (optimizeResult || beforeScore);

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans select-text">
      <Navbar refreshKey={refreshKey} />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading Progress overlays */}
        {optimizing && (
          <div className="fixed inset-0 bg-[#060713]/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#0d0e1f] border border-white/10 p-8 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="text-center space-y-2">
                <Loader2 className="h-10 w-10 text-violet-500 animate-spin mx-auto" />
                <h3 className="font-black text-white text-lg tracking-tight">Improving Your Resume</h3>
                <p className="text-[11px] text-slate-400">Our AI pipeline is tailoring your resume for the target role...</p>
              </div>

              <div className="space-y-1.5">
                <Progress value={progress} className="h-1.5 bg-slate-950 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-indigo-500 rounded-full border border-white/5" />
                <div className="flex justify-between text-[10px] font-bold text-violet-400">
                  <span>{loadingMessage}</span>
                  <span>{progress}%</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5 text-left">
                {[
                  { label: "Analyze keywords & semantic patterns", minPrg: 10 },
                  { label: "Run AI rewrite engine to upgrade weak bullets", minPrg: 35 },
                  { label: "Inject missing job description keywords naturally", minPrg: 70 },
                  { label: "Compute and verify before/after ATS scores", minPrg: 90 },
                ].map((step, idx) => {
                  const isDone = progress > step.minPrg;
                  const isActive = progress >= step.minPrg && progress < (idx === 3 ? 101 : [35, 70, 90, 101][idx]);
                  return (
                    <div key={idx} className="flex items-center gap-3 transition-opacity duration-300">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border text-[10px] font-bold shrink-0 ${
                        isDone 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                          : isActive 
                          ? "bg-violet-500/10 border-violet-500/35 text-violet-400 animate-pulse" 
                          : "bg-slate-900 border-white/5 text-slate-600"
                      }`}>
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span className={`text-[11px] font-semibold ${
                        isDone 
                          ? "text-slate-300 line-through decoration-slate-600" 
                          : isActive 
                          ? "text-white font-extrabold" 
                          : "text-slate-500"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic header routing toggle */}
        {hasResults ? (
          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={() => {
                setOptimizeResult(null);
                setBeforeScore(null);
                setAfterScore(null);
              }}
              className="flex items-center text-xs font-bold text-slate-400 hover:text-violet-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Editor
            </button>
            <div className="flex gap-2">
              <Link href="/dashboard/history">
                <Button size="sm" variant="outline" className="border-white/5 text-slate-300 hover:bg-white/5 text-xs font-bold h-8 rounded-full">
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  View History
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="border-white/5 text-slate-300 hover:bg-white/5 text-xs font-bold h-8 rounded-full"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </div>
        ) : (
          /* Header Title Block (Image 3) */
          <div className="text-center space-y-3 mb-10">
            <h1 className="text-3xl md:text-4.5xl font-black text-white tracking-tight leading-none">
              Improve Your Resume <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">for Any Job</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
              Paste your resume and the job you want. We improve it to match — automatically. Get 2 free resumes per month.
            </p>
            <div>
              <Badge className="bg-[#00e699]/5 border border-[#00e699]/20 text-[#00e699] hover:bg-[#00e699]/5 px-3 py-1 text-[10px] rounded-full font-bold select-none">
                +1 extra resume for each referral
              </Badge>
            </div>
          </div>
        )}

        {/* WORKSPACE CONTENT SECTION */}
        {hasResults ? (
          
          /* RESULTS WORKSPACE ROW */
          <div className="space-y-6">
            
            {/* Top Row: Edit & review workspace split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Pane: Current raw editor */}
              <div className="lg:col-span-6 space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Candidate Current Text</h4>
                <ResumeInput value={resumeText} onChange={setResumeText} disabled={optimizing} />
              </div>

              {/* Right Pane: AI Optimized Text directly */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-[#0f1022] border border-white/5 p-3.5 rounded-xl flex items-center justify-between">
                  <span className="font-extrabold text-white text-xs flex items-center gap-1.5 select-none">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    AI Optimized Resume Text
                  </span>
                  <Badge className="bg-violet-500/10 border-violet-500/20 text-violet-400 text-[10px] font-bold select-none px-2 py-0.5">
                    Automatically Tailored
                  </Badge>
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
                  <div className="text-center p-8 bg-slate-950/20 border border-white/5 rounded-2xl text-slate-500 text-xs italic">
                    No optimized text available. Please optimize your resume first.
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Row: score comparisons and downloads */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-4 border-t border-white/5">
              <div className="lg:col-span-8">
                <ScoreCard before={beforeScore} after={afterScore} loading={optimizing} />
              </div>
              <div className="lg:col-span-4 flex flex-col justify-between gap-4">
                {optimizeResult?.resumeId && (
                  <div className="flex flex-col justify-center items-center h-full bg-slate-950/40 border border-white/5 rounded-2xl p-6 shadow-sm">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4">Export Tailored Document</span>
                    <DownloadButtons resumeId={optimizeResult.resumeId} text={optimizeResult.optimizedText} />
                  </div>
                )}
                {afterScore && (
                  <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                    <KeywordBadges
                      added={optimizeResult?.keywordsAdded || []}
                      missing={afterScore.missingKeywords}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Bullet Point Reviewer / Improver */}
            <Card className="border-white/5 bg-[#0e0f21]/40 shadow-xl rounded-2xl overflow-hidden mt-6">
              <CardContent className="p-6 space-y-4 text-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    <h3 className="text-sm font-extrabold text-white">Interactive Bullet Point Improver</h3>
                  </div>
                  <Badge className="bg-violet-500/10 border-violet-500/20 text-violet-400 text-[10px] font-bold select-none px-2 py-0.5">
                    Pro Feature
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  Scan and optimize individual bullet points on your original resume text. We identify missing action verbs and metrics.
                </p>
                <div className="bg-[#070814]/40 border border-white/5 p-4 rounded-xl">
                  <BulletImprover
                    resumeText={resumeText}
                    jobDescription={jobDescription}
                    onChange={(newText) => {
                      setResumeText(newText);
                      handleReScoreBefore(newText);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary of Changes Done */}
            {optimizeResult?.summary && (
              <Card className="border-white/5 bg-[#0e0f21]/40 shadow-xl rounded-2xl overflow-hidden mt-6">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    <h3 className="text-sm font-extrabold text-white">Summary of AI Optimizations Done</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {optimizeResult.summary}
                  </p>
                  {optimizeResult.keywordsAdded && optimizeResult.keywordsAdded.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Keywords Integrated Successfully</span>
                      <div className="flex flex-wrap gap-1.5">
                        {optimizeResult.keywordsAdded.map((kw: string) => (
                          <Badge key={kw} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            + {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

        ) : (

          /* INPUTS EDITOR WORKSPACE (Image 3) */
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Left Column: Your Resume Block */}
              <div className="flex flex-col bg-[#0b0c1a]/60 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-white text-sm">Your Resume</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Paste text or upload a PDF</p>
                </div>
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <ResumeInput value={resumeText} onChange={setResumeText} disabled={optimizing} />
                </div>
              </div>

              {/* Right Column: Job Description Block */}
              <div className="flex flex-col bg-[#0b0c1a]/60 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-white text-sm">Job Description</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Paste or fetch from a URL</p>
                </div>
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <JobDescriptionInput value={jobDescription} onChange={setJobDescription} disabled={optimizing} />
                </div>
              </div>

            </div>

            {/* Custom Instructions */}
            <div className="bg-[#0b0c1a]/60 border border-white/5 rounded-2xl p-6 space-y-3">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-white text-xs">Anything specific to add or change? <span className="text-slate-500 font-semibold">(optional)</span></h3>
              </div>
              <Input
                placeholder="e.g. 'I led a team of 8 but forgot to add it' - 'Focus on Python and ML' - 'Switching from finance to tech' - 'Remove the 2022 gap'"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={optimizing}
                className="h-11 border-white/5 bg-[#070814] text-white focus:border-violet-500 focus:ring-violet-500 rounded-xl text-xs"
              />
            </div>

            {/* Bottom Form Settings Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b0c1a]/60 border border-white/5 rounded-2xl p-6">
              
              {/* Length options */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Resume Length</h4>
                <div className="flex flex-wrap gap-1.5">
                  {["Auto-detect", "1 Page", "2 Pages", "Academic CV"].map((option) => {
                    const isActive = lengthOption === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setLengthOption(option)}
                        className={`text-[10px] font-bold py-1.5 px-3 rounded-full border transition-all ${
                          isActive
                            ? "bg-violet-950/40 border-violet-500 text-violet-400"
                            : "bg-transparent border-white/5 text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        {option === "Auto-detect" ? "Auto-detect (Let AI decide)" : option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset inputs button */}
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={optimizing}
                className="border-white/5 text-slate-400 hover:bg-white/5 hover:text-white text-xs font-bold rounded-full px-5 self-end md:self-auto h-8"
              >
                Reset inputs
              </Button>
            </div>

            {/* Main Submit Optimization Trigger */}
            <div className="pt-4 flex justify-center">
              <Button
                onClick={handleOptimize}
                disabled={optimizing}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold h-12 px-12 rounded-full shadow-lg shadow-violet-600/25 transition-all w-full sm:w-auto text-sm"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Improving Resume...
                  </>
                ) : (
                  <>
                    Improve My Resume →
                  </>
                )}
              </Button>
            </div>

            {/* Dashboard Footer Feature badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-6 text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">
              <span className="flex items-center gap-1.5">🔍 ATS Keyword Analysis</span>
              <span className="flex items-center gap-1.5">✍️ Smart Bullet Rewrites</span>
              <span className="flex items-center gap-1.5">📄 Smart Page Length</span>
              <span className="flex items-center gap-1.5">📊 Before/After Scoring</span>
              <span className="flex items-center gap-1.5">⏱️ ~20 Second Results</span>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
