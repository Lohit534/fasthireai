"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import ResumeInput from "@/components/ResumeInput";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordBadges from "@/components/KeywordBadges";
import { generateSkillRoadmap, generateMultiSkillRoadmap } from "@/lib/roadmap-generator";
import ResumeViewer from "@/components/ResumeViewer";
import BulletImprover from "@/components/BulletImprover";
import LoadingOverlay from "@/components/LoadingOverlay";
import MissingDetailsModal from "@/components/MissingDetailsModal";
import { detectMissingFields, enrichResumeWithAnswers } from "@/lib/resume-inspector";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ATSScore, isOwnerEmail } from "@/types";
import { SAMPLE_RESUME_TEXT, SAMPLE_JD_TEXT } from "@/lib/sample-data";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  History,
  ArrowLeft,
  Zap,
  Target,
  FileText,
  TrendingUp,
  ArrowRight,
  Lock,
  GraduationCap,
  Briefcase,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  FolderOpen
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import CircleGauge from "@/components/CircleGauge";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import { UseSavedResumeModal } from "@/components/UseSavedResumeModal";

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

  // User plan states
  const [user, setUser] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [trackerAdded, setTrackerAdded] = useState(false);
  const [bulletImprovementsCount, setBulletImprovementsCount] = useState(0);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);

  // Roadmap & Cover letter generator states
  const [selectedRoadmapSkills, setSelectedRoadmapSkills] = useState<string[]>([]);
  const [roadmapContent, setRoadmapContent] = useState<string | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState<string | null>(null);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [showRoadmapAccordion, setShowRoadmapAccordion] = useState(false);
  const [showCoverLetterAccordion, setShowCoverLetterAccordion] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isSavedResumesOpen, setIsSavedResumesOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Missing details modal state
  const [missingFields, setMissingFields] = useState<ReturnType<typeof detectMissingFields>>([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [pendingResumeText, setPendingResumeText] = useState("");

  const handleLoadSample = () => {
    setResumeText(SAMPLE_RESUME_TEXT);
    setJobDescription(SAMPLE_JD_TEXT);
    toast.success("✨ Sample resume template and job description loaded!");
  };

  useEffect(() => {
    // Check if sample data was requested from landing page or query
    const isPendingSample = localStorage.getItem("fastHire_pendingSample");
    const sampleResume = localStorage.getItem("fastHire_sampleResume");
    const sampleJD = localStorage.getItem("fastHire_sampleJD");
    const hasSampleQuery = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("sample") === "true";

    if ((isPendingSample === "true" && sampleResume && sampleJD) || hasSampleQuery) {
      setResumeText(sampleResume || SAMPLE_RESUME_TEXT);
      setJobDescription(sampleJD || SAMPLE_JD_TEXT);
      toast.success("✨ Sample resume loaded! Ready to optimize.");
      // Clean up sample storage once loaded into state
      localStorage.removeItem("fastHire_pendingSample");
      localStorage.removeItem("fastHire_sampleResume");
      localStorage.removeItem("fastHire_sampleJD");
    }
  }, [setResumeText, setJobDescription]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to continue.");
          const hasSample = typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("sample") === "true" || localStorage.getItem("fastHire_pendingSample") === "true");
          router.push(hasSample ? "/auth/login?sample=true" : "/auth/login");
          return;
        }
        setUser(data.user);
        // Pre-load cached plan to prevent UI flash
        const cachedPlan = localStorage.getItem(`fastHire_plan_${data.user.id}`);
        if (cachedPlan) {
          setUserPlan(cachedPlan);
        }
        setAuthLoading(false);

        // Fetch plan/credits details safely in separate block
        try {
          const creditsRes = await fetch("/api/credits");
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            let plan = "free";
            if (creditsData.isOwner) {
              plan = "owner";
            } else if (creditsData.paidCredits > 900000) {
              plan = "promax";
            } else if (creditsData.paidCredits > 0 || creditsData.isFirst50) {
              plan = "premium";
            } else {
              plan = creditsData.planId || localStorage.getItem(`fastHire_plan_${data.user.id}`) || "free";
            }
            setUserPlan(plan);
            localStorage.setItem(`fastHire_plan_${data.user.id}`, plan);
          }
        } catch (creditsErr) {
          // silent — failed to load credits info
        }
      } catch (err) {
        // silent — auth check failed, redirecting
        router.push("/auth/login");
      }
    }
    checkAuth();
  }, [router]);

  const runAIAutoImprove = async (targetResumeText = resumeText) => {
    setIsAILoading(true);
    setOptimizing(true);
    setBeforeScore(null);
    setAfterScore(null);
    setOptimizeResult(null);
    setTrackerAdded(false);
    setBulletImprovementsCount(0);
    
    // Clear detail view states
    setRoadmapContent(null);
    setSelectedRoadmapSkills([]);
    setCoverLetterGenerated(null);
    setShowRoadmapAccordion(false);
    setShowCoverLetterAccordion(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const apiHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) {
        apiHeaders["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ resumeText: targetResumeText, jobDescription, instructions, lengthOption }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) throw new Error(errorData.error || "Optimization quota limit reached. Please upgrade to continue.");
        throw new Error(errorData.error || "Optimization failed.");
      }

      const data = await response.json();
      setOptimizeResult(data);

      const beforeRes = await fetch("/api/score", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ resumeText: targetResumeText, jobDescription }),
      });

      let beforeScoreVal = 0;
      if (beforeRes.ok) {
        const scoreData = await beforeRes.json();
        setBeforeScore(scoreData);
        beforeScoreVal = scoreData.overall;
      }

      const afterRes = await fetch("/api/score", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ resumeText: data.optimizedText, jobDescription, scoreBefore: beforeScoreVal }),
      });

      let afterScoreVal = 0;
      if (afterRes.ok) {
        const scoreData = await afterRes.json();
        setAfterScore(scoreData);
        afterScoreVal = scoreData.overall;
      }

      setRefreshKey((p) => p + 1);
      setCurrentResumeId(data.resumeId || null);

      // Scroll to results Ref
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
      toast.success(`🎉 Resume optimized! Score: ${beforeScoreVal} → ${afterScoreVal}`);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
      setOptimizeResult(null);
    } finally {
      setIsAILoading(false);
      setOptimizing(false);
    }
  };

  const handleOptimize = async () => {
    if (!resumeText?.trim()) {
      toast.error("Add your resume first.");
      return;
    }
    if (!jobDescription?.trim()) {
      toast.error("Paste the job description to match against.");
      return;
    }

    // Detect missing critical fields in resume and prompt user to enrich if needed
    const missing = detectMissingFields(resumeText);
    if (missing && missing.length > 0) {
      setMissingFields(missing);
      setPendingResumeText(resumeText);
      setShowMissingModal(true);
      return;
    }

    runAIAutoImprove(resumeText);
  };

  const handleMissingDetailsContinue = (answers: Record<string, string>) => {
    setShowMissingModal(false);
    const enriched = enrichResumeWithAnswers(pendingResumeText, answers);
    runAIAutoImprove(enriched);
  };

  const handleMissingDetailsCancel = () => {
    setShowMissingModal(false);
    setPendingResumeText("");
    setMissingFields([]);
  };

  const handleReset = () => {
    resetStore();
    setInstructions("");
    setLengthOption("Auto-detect");
    setBeforeScore(null);
    setAfterScore(null);
    setOptimizeResult(null);
    setTrackerAdded(false);
    setIsAILoading(false);
    setBulletImprovementsCount(0);
    // silent clear — user can see the cleared workspace
  };

  const handleReScoreBefore = async (newText: string, currentImprovementsCount?: number) => {
    const impCount = currentImprovementsCount ?? bulletImprovementsCount;
    // Only update afterScore (optimized) — keep beforeScore frozen at the original pre-optimization value
    try {
      if (afterScore && optimizeResult) {
        const prevOverall = afterScore.overall;
        const afterRes = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: newText,
            jobDescription,
            scoreBefore: beforeScore?.overall,
            bulletImprovementsCount: impCount
          })
        });
        if (afterRes.ok) {
          const newAfterScore = await afterRes.json();
          // Guarantee score strictly increases by a small increment (+1 per bullet) and never drops
          const guaranteedOverall = Math.min(98, Math.max(prevOverall + 1, newAfterScore.overall));
          const adjustedAfterScore = {
            ...newAfterScore,
            overall: guaranteedOverall,
            impactBullets: Math.min(100, Math.max(newAfterScore.impactBullets || 70, (afterScore.impactBullets || 65) + 2))
          };
          setAfterScore(adjustedAfterScore);

          // Persist updated scoreAfter to history DB so history shows the same improved score
          if (currentResumeId) {
            fetch("/api/history", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resumeId: currentResumeId, scoreAfter: guaranteedOverall })
            }).catch(() => {});
          }
        }
      }
    } catch {}
  };

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
  };

  const toggleRoadmapSkill = (skill: string) => {
    if (selectedRoadmapSkills.includes(skill)) {
      setSelectedRoadmapSkills(selectedRoadmapSkills.filter(s => s !== skill));
    } else {
      if (selectedRoadmapSkills.length >= 3) {
        toast.error("You can select up to 3 skills for your comprehensive roadmap.");
        return;
      }
      setSelectedRoadmapSkills([...selectedRoadmapSkills, skill]);
    }
  };

  const handleGenerateRoadmap = async () => {
    const isOwner = userPlan === "owner" || (user?.email && isOwnerEmail(user.email));
    if (userPlan === "free" && !isOwner) {
      toast.error("Skills learning roadmaps are a Pro & Pro Max feature. Please upgrade your plan to unlock instant career roadmaps!");
      setTimeout(() => {
        router.push("/dashboard/pricing");
      }, 1800);
      return;
    }

    if (selectedRoadmapSkills.length === 0) {
      toast.error("Please select at least 1 skill (up to 3) to generate your roadmap.");
      return;
    }

    if (!isOwner) {
      const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const limit = userPlan === "premium" ? 5 : 15;
      const storageKey = `fastHire_roadmaps_count_${user?.id || 'anon'}_${monthKey}`;
      const currentCount = parseInt(localStorage.getItem(storageKey) || "0", 10);
      
      if (currentCount >= limit) {
        toast.error(`You have reached your monthly limit of ${limit} roadmaps for the ${userPlan === "premium" ? "Premium Pro" : "Pro Max"} plan.`);
        setTimeout(() => {
          router.push("/dashboard/pricing");
        }, 1800);
        return;
      }
      localStorage.setItem(storageKey, (currentCount + 1).toString());
    }

    setRoadmapLoading(true);
    setRoadmapContent(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const content = generateMultiSkillRoadmap(selectedRoadmapSkills);
      setRoadmapContent(content);
      toast.success(`Generated 90-day roadmap for ${selectedRoadmapSkills.length} selected skill${selectedRoadmapSkills.length > 1 ? "s" : ""}!`);
    } catch (e) {
      toast.error("Failed to generate learning roadmap.");
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    const isOwner = userPlan === "owner" || (user?.email && isOwnerEmail(user.email));
    if (!isOwner) {
      const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const limit = userPlan === "free" ? 1 : userPlan === "premium" ? 5 : 15;
      const storageKey = `fastHire_coverLetters_count_${user?.id || 'anon'}_${monthKey}`;
      const currentCount = parseInt(localStorage.getItem(storageKey) || "0", 10);
      
      if (currentCount >= limit) {
        toast.error(`You have reached your limit of ${limit} cover letters for the ${userPlan === "free" ? "Free" : userPlan === "premium" ? "Premium Pro" : "Pro Max"} plan.`);
        setTimeout(() => {
          router.push("/dashboard/pricing");
        }, 2000);
        return;
      }
      localStorage.setItem(storageKey, (currentCount + 1).toString());
    }

    setGeneratingLetter(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: optimizeResult?.optimizedText || resumeText,
          jobDescription,
          jobTitle: optimizeResult?.jobTitle,
          company: optimizeResult?.company,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate cover letter.");
      }

      const data = await res.json();
      setCoverLetterGenerated(data.coverLetter);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate cover letter.");
    } finally {
      setGeneratingLetter(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-3">
          <div className="relative mx-auto h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[#0d6e5a] animate-spin" />
            <Zap className="absolute inset-0 m-auto h-5 w-5 text-[#0d6e5a]" />
          </div>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Authenticating...</p>
        </div>
      </div>
    );
  }



  const hasResults = !optimizing && (optimizeResult || beforeScore);
  const delta = afterScore && beforeScore ? afterScore.overall - beforeScore.overall : 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans">
      {/* Missing Details Modal — shown before optimization if resume has gaps */}
      {showMissingModal && missingFields.length > 0 && (
        <MissingDetailsModal
          fields={missingFields}
          onContinue={handleMissingDetailsContinue}
          onCancel={handleMissingDetailsCancel}
        />
      )}

      {/* Ambient background - subtle light pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[700px] h-[500px] bg-[#0d6e5a]/3 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#0f766e]/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-slate-200/50 rounded-full blur-[120px]" />
      </div>

      <Navbar refreshKey={refreshKey} />

      <main className="relative flex-1 mx-auto max-w-[1280px] w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* ── LOADING OVERLAY ─────────────────────────────────────── */}
        {optimizing && (
          <div className="fixed inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300">
            <div className="max-w-[480px] w-full text-center space-y-6">
              <div className="relative mx-auto h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-[#0d6e5a]/10" />
                <div className="absolute inset-0 rounded-full border-t-4 border-[#0d6e5a] animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-[#0d6e5a] animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Improving Your Resume</h3>
                <p className="text-xs text-slate-500 font-medium">Running advanced AI optimizations to upgrade metrics &amp; structure...</p>
              </div>

              <div className="space-y-2">
                <Progress value={progress} className="h-1.5 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-[#0d6e5a] [&>div]:to-[#0f766e] rounded-full border border-slate-200" />
                <div className="flex justify-between text-[10px] font-bold text-[#0d6e5a]">
                  <span className="uppercase tracking-wider">{loadingMessage}</span>
                  <span>{progress}%</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 text-left max-w-md mx-auto">
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
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                          : isActive 
                          ? "bg-[#0d6e5a]/10 border-[#0d6e5a]/30 text-[#0d6e5a] animate-pulse" 
                          : "bg-slate-100 border-slate-200 text-slate-400"
                      }`}>
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span className={`text-[11px] font-semibold ${
                        isDone 
                          ? "text-slate-400 line-through decoration-slate-300" 
                          : isActive 
                          ? "text-slate-900 font-extrabold" 
                          : "text-slate-400"
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
          <div className="mb-6 flex justify-between items-center select-none">
            <button
              onClick={() => {
                setOptimizeResult(null);
                setBeforeScore(null);
                setAfterScore(null);
              }}
              className="flex items-center text-xs font-bold text-slate-500 hover:text-[#0d6e5a] transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Editor
            </button>
            <div className="flex gap-2">
              <Link href="/dashboard/history">
                <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold h-8 rounded-lg">
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  View History
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold h-8 rounded-lg"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </div>
        ) : (
          /* Header Title Block */
          <div className="text-center space-y-3 mb-10 select-none">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
              Improve Your Resume <span className="bg-gradient-to-r from-[#0d6e5a] via-[#0f766e] to-[#134e4a] bg-clip-text text-transparent">for Any Job</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
              Paste your resume and the job you want. We improve it to match &mdash; automatically. Get 2 free resumes per month.
            </p>
            <div>
              <Badge className="bg-[#0d6e5a]/8 border border-[#0d6e5a]/20 text-[#0d6e5a] hover:bg-[#0d6e5a]/8 px-3 py-1 text-[10px] rounded-full font-bold select-none">
                +1 extra resume for each referral
              </Badge>
            </div>
          </div>
        )}

        {/* WORKSPACE CONTENT SECTION */}
        {hasResults && optimizeResult ? (
          
          /* RESULTS WORKSPACE ROW */
          <div ref={resultsRef} className="space-y-6">
            {/* Top Tracker Banner Message */}
            {!trackerAdded && (
              <div className="bg-gradient-to-r from-[#0d6e5a]/5 via-white to-transparent border border-[#0d6e5a]/10 rounded-xl p-4 flex items-center justify-between gap-4 select-none">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-[#0d6e5a]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Add to your tracker?</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      <strong>{optimizeResult.company || "General Application"}</strong> &mdash; {optimizeResult.jobTitle || "Optimized Resume"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleAddToTracker}
                    className="bg-[#0d6e5a] hover:bg-[#0a5a49] text-white font-bold text-[10px] h-8 rounded-lg px-4"
                  >
                    Yes, add it
                  </Button>
                  <button
                    onClick={() => setTrackerAdded(true)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Overall Score Banner */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 select-none shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    ATS Optimization Complete
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Your resume has been optimized with target keywords and metrics.</p>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs h-9 rounded-lg px-5 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Optimize Another Resume
              </Button>
            </div>

            {/* Top Row: Edit & review workspace split (Score gauges & PDF Preview) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-6">
              
              {/* Left Column: ATS Score circle gauges and keywords */}
              <ScrollFadeIn direction="left" className="lg:col-span-5 space-y-6">
                
                {/* Score circular gauges (like in History DetailView) */}
                <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-6 space-y-5">
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2 select-none">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      ATS Match Score Comparison
                    </h3>

                    <div className="flex items-center justify-around gap-4 bg-slate-50 border border-slate-100 rounded-xl p-5">
                      <CircleGauge value={beforeScore?.overall || 0} label="Original" size={80} />
                      <div className="flex flex-col items-center gap-1 shrink-0 select-none">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                          <ArrowRight className="h-4 w-4 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600">+{delta} pts</span>
                      </div>
                      <CircleGauge value={afterScore?.overall || 0} label="Optimized" size={80} />
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed font-semibold bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center select-none">
                      Industry Standard ATS Scorer Rubric. Overlap analysis shows your keyword matching has been successfully enhanced.
                    </p>
                  </CardContent>
                </Card>

                {/* Keywords Badges */}
                {afterScore && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm select-none">
                    <KeywordBadges
                      added={optimizeResult?.keywordsAdded || []}
                      missing={afterScore.missingKeywords}
                    />
                  </div>
                )}

              </ScrollFadeIn>

              {/* Right Column: AI Optimized styled Preview */}
              <ScrollFadeIn direction="right" className="lg:col-span-7 space-y-4">
                <ResumeViewer
                  text={optimizeResult.optimizedText}
                  originalText={resumeText}
                  resumeId={optimizeResult.resumeId}
                  jobDescription={jobDescription}
                  userId={user?.id || ""}
                  userPlan={userPlan}
                  jobTitle={optimizeResult.jobTitle || ""}
                />
              </ScrollFadeIn>

            </div>

            {/* BELOW PDF PREVIEW: Full-width AI Optimization Summary & Tools Box */}
            {optimizeResult?.summary && (
              <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden mb-6 w-full select-none">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#0d6e5a]" />
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">AI Optimization Summary</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl">
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      {optimizeResult.summary}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full-width Tools Accordions: Skills Learning Roadmap & Cover Letter */}
            <div className="space-y-4 select-none mb-6 w-full">
              {/* Accordion 1: Skills Learning Roadmap (PRO: 3, PRO MAX: 9) */}
              <div className="border border-slate-200 bg-white rounded-xl overflow-hidden transition-all duration-300 shadow-sm">
                <button
                  onClick={() => setShowRoadmapAccordion(!showRoadmapAccordion)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center text-[#0d6e5a]">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">Skills Learning Roadmap</h4>
                        {userPlan === "free" && (
                          <Badge className="bg-[#0d6e5a]/10 hover:bg-[#0d6e5a]/20 text-[#0d6e5a] text-[8px] font-bold border-[#0d6e5a]/20">PRO</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Select up to 3 skills to generate a comprehensive 90-day learning roadmap.</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showRoadmapAccordion ? "rotate-180" : ""}`} />
                </button>

                {showRoadmapAccordion && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-4">
                    {userPlan === "free" && !(user?.email && isOwnerEmail(user.email)) ? (
                      <div className="text-center py-6 max-w-md mx-auto space-y-3">
                        <Lock className="h-8 w-8 text-[#0d6e5a] mx-auto" />
                        <h5 className="text-xs font-bold text-slate-900">Pro Access Required</h5>
                        <p className="text-[10px] text-slate-500 leading-relaxed">Upgrade to our premium plan to unlock step-by-step custom learning roadmaps for target keywords.</p>
                        <Link href="/dashboard/pricing" className="inline-block pt-1">
                          <Button className="h-8 text-[10px] font-bold bg-[#0d6e5a] hover:bg-[#0a5a49] text-white">Upgrade to Pro</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Choose up to 3 target skills:
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#0d6e5a] bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 px-2 py-0.5 rounded-full">
                              {selectedRoadmapSkills.length}/3 Selected
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                            {(() => {
                              const candidateSkills = Array.from(new Set([
                                ...(beforeScore?.extractedSkills || []),
                                ...(afterScore?.missingKeywords || []),
                                ...(afterScore?.foundKeywords || []),
                                ...(optimizeResult?.keywordsAdded || [])
                              ])).filter(s => s && s.length > 1 && !/^(resume|summary|skills|experience|education|project|teamwork|development|software|engineer|manager|developer|analyst|overview|responsibilities)$/i.test(s));

                              const listToRender = candidateSkills.length > 0 ? candidateSkills : ["Python", "SQL", "Machine Learning", "Docker", "REST APIs"];
                              return listToRender.map((skill: string) => {
                                const isSelected = selectedRoadmapSkills.includes(skill);
                                return (
                                  <button
                                    key={skill}
                                    type="button"
                                    onClick={() => toggleRoadmapSkill(skill)}
                                    className={`text-[10px] font-semibold py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 ${
                                      isSelected
                                        ? "bg-[#0d6e5a]/10 border-[#0d6e5a] text-[#0d6e5a] font-bold shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                                    }`}
                                  >
                                    {isSelected && <span className="text-[#0d6e5a] font-bold">✓</span>}
                                    {skill}
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          <div className="pt-2 flex items-center justify-between gap-3">
                            <span className="text-[10px] text-slate-500">
                              {selectedRoadmapSkills.length === 0 
                                ? "Click 1 to 3 skills above to build your roadmap." 
                                : `Selected: ${selectedRoadmapSkills.join(", ")}`}
                            </span>
                            <Button
                              onClick={handleGenerateRoadmap}
                              disabled={selectedRoadmapSkills.length === 0 || roadmapLoading}
                              className="bg-[#0d6e5a] hover:bg-[#0a5a49] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-sm disabled:opacity-50"
                            >
                              {roadmapLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              Generate Complete Roadmap ({selectedRoadmapSkills.length}/3)
                            </Button>
                          </div>
                        </div>

                        {roadmapLoading && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 py-6 justify-center bg-white border border-slate-200 rounded-xl">
                            <Loader2 className="h-4 w-4 animate-spin text-[#0d6e5a]" />
                            <span>Synthesizing tailored 90-day mastery curriculum for {selectedRoadmapSkills.join(", ")}...</span>
                          </div>
                        )}

                        {roadmapContent && (
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2 select-text font-sans">
                            <pre className="whitespace-pre-wrap font-sans select-text">{roadmapContent}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 2: Cover Letter Generator (Free: 1, Pro: 5, Pro Max: 15) */}
              <div className="border border-slate-200 bg-white rounded-xl overflow-hidden transition-all duration-300 shadow-sm">
                <button
                  onClick={() => setShowCoverLetterAccordion(!showCoverLetterAccordion)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center text-[#0d6e5a]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">Tailored Cover Letter Generator</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">Generate a customized cover letter mapped to target job description (Free: 1, Pro: 5, Pro Max: 15).</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showCoverLetterAccordion ? "rotate-180" : ""}`} />
                </button>

                {showCoverLetterAccordion && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-4">
                    <div className="space-y-4">
                      {!coverLetterGenerated && !generatingLetter && (
                        <Button
                          onClick={handleGenerateCoverLetter}
                          className="bg-[#0d6e5a] hover:bg-[#0a5a49] text-white font-bold text-xs h-9 rounded-lg"
                        >
                          Generate Cover Letter
                        </Button>
                      )}

                      {generatingLetter && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 py-4 justify-center bg-white border border-slate-200 rounded-xl">
                          <Loader2 className="h-4 w-4 animate-spin text-[#0d6e5a]" />
                          <span>Drafting tailored cover letter...</span>
                        </div>
                      )}

                      {coverLetterGenerated && (
                        <div className="space-y-3 select-text">
                          <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2 select-text font-serif">
                            <pre className="whitespace-pre-wrap font-serif select-text">{coverLetterGenerated}</pre>
                          </div>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(coverLetterGenerated);
                              toast.success("Cover letter copied to clipboard!");
                            }}
                            className="bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 text-[10px] h-8 rounded-lg"
                          >
                            Copy Cover Letter
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Bullet Point Reviewer / Improver (Below Columns) */}
            <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden mt-6">
              <CardContent className="p-6 space-y-4 text-slate-800">
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#0d6e5a]" />
                    <h3 className="text-sm font-extrabold text-slate-900">Interactive Bullet Point Improver</h3>
                  </div>
                  <Badge className="bg-[#0d6e5a]/10 border-[#0d6e5a]/20 text-[#0d6e5a] text-[10px] font-bold select-none px-2 py-0.5">
                    Pro Feature
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold select-none">
                  Scan and optimize individual bullet points on your original resume text. We identify missing action verbs and metrics.
                </p>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <BulletImprover
                    resumeText={optimizeResult.optimizedText}
                    jobDescription={jobDescription}
                    userId={user?.id || ""}
                    userPlan={userPlan}
                    onChange={(newText, wasImproved) => {
                      // Update the optimizedText in result so the viewer shows the new text
                      setOptimizeResult((prev: any) => prev ? { ...prev, optimizedText: newText } : prev);
                      let newCount = bulletImprovementsCount;
                      if (wasImproved) {
                        newCount += 1;
                        setBulletImprovementsCount(newCount);
                      }
                      handleReScoreBefore(newText, newCount);
                    }}
                  />
                </div>
              </CardContent>
            </Card>

          </div>
        ) : (
          
          /* ── INPUT WORKSPACE ──────────────────────────────────── */
          <div className="space-y-5 max-w-5xl mx-auto select-none">

            {/* Split-panel: Resume | Job Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

              {/* Resume Column (Panel + Use Saved Resume Button below) */}
              <div className="flex flex-col space-y-3">
                <div className="group flex-1 flex flex-col bg-white border border-slate-200 hover:border-[#0d6e5a]/30 rounded-xl p-6 space-y-4 transition-colors duration-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-[#0d6e5a]" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-slate-900 text-base">Your Resume</h3>
                        <p className="text-xs text-slate-400 font-normal">Paste text or upload PDF</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-medium text-[#0d6e5a] bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 px-2.5 py-0.5 rounded-full">Step 1</span>
                  </div>
                  <ResumeInput value={resumeText} onChange={setResumeText} disabled={optimizing} />
                </div>

                {/* Saved Resume & Sample buttons */}
                <div className="flex flex-wrap items-center gap-2.5 justify-start">
                  <button
                    type="button"
                    onClick={() => setIsSavedResumesOpen(true)}
                    disabled={optimizing}
                    className="bg-white border border-slate-200 hover:border-[#0d6e5a]/40 hover:bg-[#0d6e5a]/5 py-2 px-3.5 text-xs font-bold rounded-lg inline-flex items-center gap-2 text-slate-600 hover:text-[#0d6e5a] transition-all shadow-xs cursor-pointer"
                  >
                    <FolderOpen className="h-4 w-4 text-slate-400" />
                    Use Saved Resume
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    disabled={optimizing}
                    className="bg-teal-50 border border-teal-200 hover:bg-teal-100/80 py-2 px-3.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 text-[#0d6e5a] transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-[#0d6e5a]" />
                    Try Sample Resume &amp; JD
                  </button>
                </div>
              </div>

              {/* Job Description Column */}
              <div className="flex flex-col space-y-3">
                <div className="group flex-1 flex flex-col bg-white border border-slate-200 hover:border-[#0d6e5a]/30 rounded-xl p-6 space-y-4 transition-colors duration-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center">
                        <Target className="h-4 w-4 text-[#0d6e5a]" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-slate-900 text-base">Job Description</h3>
                        <p className="text-xs text-slate-400 font-normal">Paste the job post description</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-medium text-[#0d6e5a] bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 px-2.5 py-0.5 rounded-full">Step 2</span>
                  </div>
                  <JobDescriptionInput value={jobDescription} onChange={setJobDescription} disabled={optimizing} />
                </div>
                {/* Spacer matching button height */}
                <div className="h-[42px] hidden md:block" />
              </div>

            </div>

            {/* Custom optimization instructions card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0d6e5a]" />
                <h4 className="font-heading font-bold text-sm text-slate-900">Custom Guidance <span className="text-slate-400 font-normal">(Optional)</span></h4>
              </div>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. 'Emphasize engineering scale' or 'Keep it concise' or 'Focus on leadership'"
                className="w-full h-10 bg-slate-50 text-slate-900 border border-slate-200 focus:border-[#0d6e5a] focus:ring-1 focus:ring-[#0d6e5a]/30 rounded-lg px-3.5 text-xs font-normal focus:outline-none"
              />
            </div>

            {/* Resume Length card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0d6e5a]" />
                <h4 className="font-heading font-bold text-sm text-slate-900">Resume Length</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: "Auto-detect", label: "Auto-detect", sub: "Let AI decide" },
                  { value: "1 Page",      label: "1 Page",       sub: "Fresher / under 5 yrs" },
                  { value: "2 Pages",     label: "2 Pages",      sub: "5-10+ yrs experience" },
                  { value: "Academic CV", label: "Academic CV",  sub: "PhD / research / academia" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLengthOption(opt.value)}
                    className={`flex flex-col items-start gap-1.5 rounded-lg p-3.5 border text-left transition-all duration-200 ${
                      lengthOption === opt.value
                        ? "bg-[#0d6e5a]/8 border-[#0d6e5a]/40 shadow-sm"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <span className={`text-xs font-bold block ${
                        lengthOption === opt.value ? "text-[#0d6e5a]" : "text-slate-700"
                      }`}>{opt.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal leading-tight block mt-1">{opt.sub}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>



            {/* CTA Button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="btn-primary-gradient px-12 py-3.5 text-sm font-semibold flex items-center gap-2.5 rounded-lg shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {optimizing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Optimizing Resume...</>
                ) : (
                  <><Zap className="h-4.5 w-4.5" /> Optimize My Resume <ChevronRight className="h-4.5 w-4.5" /></>
                )}
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2 text-[10px] text-slate-600 font-semibold select-none">
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3 text-slate-700" /> No data sold</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-slate-700" /> ~20s results</span>
              <span className="flex items-center gap-1.5"><Target className="h-3 w-3 text-slate-700" /> ATS-Tested</span>
              <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-slate-700" /> Score improvement guaranteed</span>
            </div>

          </div>
        )}

      </main>

      {/* Loading Overlay */}
      {isAILoading && <LoadingOverlay />}

      {/* Saved Resumes Modal */}
      <UseSavedResumeModal
        isOpen={isSavedResumesOpen}
        onClose={() => setIsSavedResumesOpen(false)}
        onSelectResume={(text) => setResumeText(text)}
      />
    </div>
  );
}
