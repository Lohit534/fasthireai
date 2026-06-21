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
import BulletImprover from "@/components/BulletImprover";
import KeywordBadges from "@/components/KeywordBadges";
import DownloadButtons from "@/components/DownloadButtons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ATSScore } from "@/types";
import { Sparkles, Loader2, RefreshCw, BarChart, History } from "lucide-react";
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

      // Perform POST call
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription })
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying user credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Resume Optimizer</h1>
            <p className="text-xs text-slate-500">
              Paste details below to optimize your ATS keyword profiles.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/history">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
                <History className="h-4.5 w-4.5 mr-2" />
                View History
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={optimizing}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className="h-4.5 w-4.5 mr-2" />
              Reset Inputs
            </Button>
          </div>
        </div>

        {/* Two-column layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Editor Inputs */}
          <div className="space-y-6">
            <Card className="border-gray-200 bg-white shadow-sm rounded-2xl">
              <CardContent className="p-6 space-y-6">
                {/* Resume Input Component */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <BarChart className="h-4 w-4 text-indigo-500" />
                    Candidate Resume
                  </label>
                  <ResumeInput value={resumeText} onChange={setResumeText} disabled={optimizing} />
                </div>

                {/* Job Description Input Component */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    Target Job Description
                  </label>
                  <JobDescriptionInput value={jobDescription} onChange={setJobDescription} disabled={optimizing} />
                </div>

                {/* Submit Optimization Trigger */}
                <Button
                  onClick={handleOptimize}
                  disabled={optimizing}
                  size="lg"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 shadow-lg shadow-indigo-600/10 rounded-xl"
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Optimizing Resume...
                    </>
                  ) : (
                    "Optimize My Resume"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results Section */}
          <div className="space-y-6 lg:sticky lg:top-24">
            
            {/* Optimization Progress Bar */}
            {optimizing && (
              <Card className="border-gray-200 bg-white shadow-md p-6 rounded-2xl">
                <CardContent className="p-0 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">{loadingMessage}</span>
                    <span className="text-indigo-600 font-black">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-gray-100 [&>div]:bg-indigo-600 rounded-full" />
                </CardContent>
              </Card>
            )}

            {/* Scorecard, badges and downloads */}
            {!optimizing && (resumeText.trim() || optimizeResult || beforeScore) ? (
              <div className="space-y-6">
                {/* PDF/DOCX Download buttons */}
                {optimizeResult?.resumeId && (
                  <div className="flex justify-end bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <DownloadButtons resumeId={optimizeResult.resumeId} />
                  </div>
                )}

                {/* Score Card Dashboard */}
                <ScoreCard before={beforeScore} after={afterScore} loading={optimizing} />

                {/* Keywords Badges */}
                {afterScore && (
                  <KeywordBadges
                    added={optimizeResult?.keywordsAdded || []}
                    missing={afterScore.missingKeywords}
                  />
                )}

                {/* Text View & Bullet Improver Tabs */}
                <Tabs defaultValue="optimized-text" className="w-full space-y-4">
                  <TabsList className="w-full flex border-b border-slate-200 bg-gray-100/60 p-1 rounded-xl">
                    <TabsTrigger value="optimized-text" className="flex-1 py-2 font-bold text-xs">
                      📝 Full Optimized Text
                    </TabsTrigger>
                    <TabsTrigger value="bullet-improver" className="flex-1 py-2 font-bold text-xs">
                      ⚡ Bullet-by-Bullet Reviewer
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="optimized-text" className="outline-none">
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
                      <div className="text-center p-8 bg-white border border-gray-200 rounded-2xl text-slate-400 text-xs italic">
                        No optimized text available. Please optimize your resume first.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="bullet-improver" className="outline-none">
                    <BulletImprover
                      resumeText={optimizeResult?.optimizedText || resumeText}
                      jobDescription={jobDescription}
                      onChange={(newText) => {
                        if (optimizeResult?.optimizedText) {
                          setOptimizeResult((prev: any) => ({ ...prev, optimizedText: newText }));
                          handleReScoreAfter(newText);
                        } else {
                          setResumeText(newText);
                          handleReScoreBefore(newText);
                        }
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              // Empty State
              !optimizing && (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gray-50 min-h-[460px]">
                  <Sparkles className="h-10 w-10 text-indigo-400/80 mb-4 animate-pulse" />
                  <h3 className="font-extrabold text-slate-800 text-lg">Results Workspace</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed font-medium">
                    Upload your resume and enter the target job description to begin. Our AI will analyze ATS compatibility scores, extract missing keywords, and write optimized bullets here.
                  </p>
                </div>
              )
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
