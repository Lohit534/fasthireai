"use client";

import React, { useEffect, useState, useRef } from "react";
import { Sparkles, ArrowRight, Check, AlertCircle, HelpCircle } from "lucide-react";

const STEPS = [
  { id: 1, label: "Reading your resume" },
  { id: 2, label: "Parsing target job requirements" },
  { id: 3, label: "Detecting missing values & metrics" },
  { id: 4, label: "Rewriting experience with applied metrics" },
  { id: 5, label: "Aligning to ATS keywords" },
  { id: 6, label: "Polishing & calculating final ATS score" },
];

const FUN_FACTS = [
  "Recruiters spend about 7 seconds on the first pass of a resume",
  "Over 75% of resumes are rejected by ATS before a human reads them",
  "Resumes with metrics are 40% more likely to get callbacks",
  "Keywords from the job description boost ATS score by up to 60%",
  "Single-column resumes parse 3x better in ATS systems",
];

interface MissingQuestion {
  id: string;
  category?: "year_date" | "tech_stack" | "metrics" | "education" | "general";
  title?: string;
  originalBullet?: string;
  question: string;
  hint?: string;
}

interface OptimizingProgressProps {
  onComplete: (result: any) => void;
  onError?: (error: string) => void;
  resumeText: string;
  jobDescription: string;
  instructions?: string;
}

export default function OptimizingProgress({
  onComplete,
  onError,
  resumeText,
  jobDescription,
  instructions = "",
}: OptimizingProgressProps) {
  const [steps, setSteps] = useState<
    { id: number; status: "pending" | "running" | "done"; duration?: string }[]
  >(STEPS.map((s) => ({ id: s.id, status: "pending" })));
  const [progress, setProgress] = useState(0);
  const [funFact, setFunFact] = useState(FUN_FACTS[0]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef<number>(Date.now());

  // Interactive Question State (triggered in the middle of progress)
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [missingQuestions, setMissingQuestions] = useState<MissingQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);

  const stepStartTimes = useRef<Record<number, number>>({});
  const isMountedRef = useRef(true);

  // Timer & Fun facts
  useEffect(() => {
    isMountedRef.current = true;
    startRef.current = Date.now();
    let factIndex = 0;
    const factInterval = setInterval(() => {
      factIndex = (factIndex + 1) % FUN_FACTS.length;
      setFunFact(FUN_FACTS[factIndex]);
    }, 4500);

    const timerInterval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(factInterval);
      clearInterval(timerInterval);
    };
  }, []);

  // Main optimization workflow
  useEffect(() => {
    let cancelled = false;

    const startPipeline = async () => {
      // Step 1: Reading your resume
      stepStartTimes.current[1] = Date.now();
      setSteps((prev) =>
        prev.map((s) => (s.id === 1 ? { ...s, status: "running" } : s))
      );
      setProgress(15);
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;

      const dur1 = ((Date.now() - stepStartTimes.current[1]) / 1000).toFixed(1) + "s";
      setSteps((prev) =>
        prev.map((s) => (s.id === 1 ? { ...s, status: "done", duration: dur1 } : s))
      );

      // Step 2: Parsing the job description
      stepStartTimes.current[2] = Date.now();
      setSteps((prev) =>
        prev.map((s) => (s.id === 2 ? { ...s, status: "running" } : s))
      );
      setProgress(30);
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;

      const dur2 = ((Date.now() - stepStartTimes.current[2]) / 1000).toFixed(1) + "s";
      setSteps((prev) =>
        prev.map((s) => (s.id === 2 ? { ...s, status: "done", duration: dur2 } : s))
      );

      // Step 3: Detecting missing values & metrics
      stepStartTimes.current[3] = Date.now();
      setSteps((prev) =>
        prev.map((s) => (s.id === 3 ? { ...s, status: "running" } : s))
      );
      setProgress(45);

      try {
        const preCheckRes = await fetch("/api/pre-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText, jobDescription }),
        });

        let detected: MissingQuestion[] = [];
        if (preCheckRes.ok) {
          const data = await preCheckRes.json();
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            detected = data.questions;
          }
        }

        if (cancelled) return;

        // If missing values / metrics are detected, PAUSE here in the middle of progress to ask questions!
        if (detected.length > 0) {
          setMissingQuestions(detected);
          setAwaitingInput(true);
          // Wait for user interaction via handleApplyAnswers
          return;
        }

        // If no missing items detected, mark Step 3 done and proceed directly
        const dur3 = ((Date.now() - stepStartTimes.current[3]) / 1000).toFixed(1) + "s";
        setSteps((prev) =>
          prev.map((s) => (s.id === 3 ? { ...s, status: "done", duration: dur3 } : s))
        );

        proceedToOptimization({});
      } catch (err: any) {
        // Fallback: proceed to optimization without interrupting
        proceedToOptimization({});
      }
    };

    startPipeline();

    return () => {
      cancelled = true;
    };
  }, [resumeText, jobDescription]);

  // Proceed to Step 4, 5, 6 with user's applied answers
  const proceedToOptimization = async (collectedAnswers: Record<string, string>) => {
    setIsApplying(true);
    setAwaitingInput(false);

    // Mark Step 3 done
    const dur3 = ((Date.now() - (stepStartTimes.current[3] || Date.now())) / 1000).toFixed(1) + "s";
    setSteps((prev) =>
      prev.map((s) => (s.id === 3 ? { ...s, status: "done", duration: dur3 } : s))
    );

    // Mark Step 4 running
    stepStartTimes.current[4] = Date.now();
    setSteps((prev) =>
      prev.map((s) => (s.id === 4 ? { ...s, status: "running" } : s))
    );
    setProgress(55);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          instructions,
          userAnswers: collectedAnswers,
        }),
      });

      if (!res.body) throw new Error("No response body from optimization service.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!isMountedRef.current) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const jsonStart = line.indexOf("{");
            if (jsonStart === -1) continue;
            const data = JSON.parse(line.slice(jsonStart));

            if (data.error) {
              if (onError) onError(data.error);
              return;
            }

            // Map server steps 4, 5, 6 to client UI
            if (data.step >= 4) {
              if (data.status === "running") {
                stepStartTimes.current[data.step] = Date.now();
                setSteps((prev) =>
                  prev.map((s) =>
                    s.id === data.step ? { ...s, status: "running" } : s
                  )
                );
                setProgress(Math.round(((data.step - 1) / 6) * 100));
              }

              if (data.status === "done") {
                const dur =
                  (
                    (Date.now() -
                      (stepStartTimes.current[data.step] || Date.now())) /
                    1000
                  ).toFixed(1) + "s";

                setSteps((prev) =>
                  prev.map((s) =>
                    s.id === data.step ? { ...s, status: "done", duration: dur } : s
                  )
                );
                setProgress(Math.round((data.step / 6) * 100));

                if (data.result) {
                  setProgress(100);
                  setTimeout(() => {
                    if (isMountedRef.current) onComplete(data.result);
                  }, 600);
                }
              }
            }
          } catch (e) {
            // Ignore incomplete chunks
          }
        }
      }
    } catch (err: any) {
      if (onError) onError(err?.message || "Failed to complete resume optimization.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAnswers = (skipMode = false) => {
    const answersToSend = skipMode ? {} : userAnswers;
    proceedToOptimization(answersToSend);
  };

  const filledCount = Object.values(userAnswers).filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-4 animate-in fade-in zoom-in-95 duration-500 w-full max-w-2xl mx-auto">
      {/* Circular progress ring */}
      <div className="relative w-32 h-32 mb-6">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#d1fae5"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#0d6e5a"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900">{progress}%</span>
          <span className="text-[11px] text-slate-500 font-semibold">{elapsedSec}s elapsed</span>
        </div>
      </div>

      {/* Title block */}
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1 text-center">
        {awaitingInput
          ? "Missing Details Detected"
          : STEPS.find((s) => steps.find((st) => st.id === s.id && st.status === "running"))?.label ?? "Polishing final output"}
      </h2>
      <p className="text-slate-500 text-xs sm:text-sm mb-6 text-center max-w-md">
        {awaitingInput
          ? "Provide quick metrics or details below to maximize your ATS match score before generating the resume."
          : "Stay on this tab — our AI is engineering your ATS-optimized resume."}
      </p>

      {/* ── INTERACTIVE MISSING VALUES PANEL (TRIGGERED IN MIDDLE OF PROGRESS) ── */}
      {awaitingInput && missingQuestions.length > 0 ? (
        <div className="w-full bg-white border border-teal-200/80 shadow-md rounded-2xl p-5 sm:p-6 space-y-4 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 text-[#0d6e5a]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0d6e5a] text-[10px] font-bold uppercase tracking-wider mb-1">
                ATS Boost Checkpoint • Step 3 of 6
              </div>
              <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                Provide Missing Details &amp; Metrics
              </h3>
              <p className="text-xs text-slate-600 font-normal mt-0.5 leading-relaxed">
                Add missing dates, year values, or measurable metrics to dynamically elevate your ATS score to <strong>90+ points</strong>. Fill in what you know; leave any blank to use AI defaults.
              </p>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 pt-1">
            {missingQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 hover:border-teal-200 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                    {q.category === "year_date"
                      ? "Dates & Year"
                      : q.category === "education"
                        ? "Graduation & GPA"
                        : q.category === "tech_stack"
                          ? "Technologies"
                          : "Quantified Metric"}
                  </span>
                  {q.title && (
                    <span className="text-xs font-bold text-slate-800">
                      {q.title}
                    </span>
                  )}
                </div>

                {q.originalBullet && (
                  <div className="text-[11px] text-slate-600 font-medium italic border-l-2 border-[#0d6e5a] pl-2 line-clamp-2 bg-white/70 py-1 rounded-r">
                    &ldquo;{q.originalBullet}&rdquo;
                  </div>
                )}
                <label className="block text-xs font-semibold text-slate-700">
                  {q.question}
                </label>
                <input
                  type="text"
                  value={userAnswers[q.id] || ""}
                  onChange={(e) =>
                    setUserAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                  placeholder={q.hint || "e.g., 2021 – 2025, or improved speed by 35%"}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6e5a] focus:border-transparent transition-all shadow-xs"
                />
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleApplyAnswers(false)}
              disabled={isApplying}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0d6e5a] hover:bg-[#0f766e] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {filledCount > 0
                  ? `Apply ${filledCount} Detail${filledCount > 1 ? "s" : ""} & Continue`
                  : "Continue Optimization"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleApplyAnswers(true)}
              disabled={isApplying}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
            >
              Skip (Use AI Estimation) &rarr;
            </button>
          </div>
        </div>
      ) : null}

      {/* Steps progress list */}
      <div className="w-full max-w-lg space-y-2">
        {STEPS.map((step) => {
          const s = steps.find((x) => x.id === step.id);
          const status = s?.status ?? "pending";

          return (
            <div
              key={step.id}
              className={`
                flex items-center justify-between
                px-5 py-3 rounded-xl
                transition-all duration-300
                ${
                  status === "done"
                    ? "bg-teal-50/70 border border-teal-100 opacity-90"
                    : status === "running"
                      ? "bg-teal-50 border border-teal-200 shadow-xs"
                      : "bg-transparent opacity-60"
                }
              `}
            >
              <div className="flex items-center gap-3">
                {status === "done" ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 text-white">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : status === "running" ? (
                  <div className="w-5 h-5 rounded-full border-2 border-[#0d6e5a] border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                )}

                <span
                  className={`text-xs sm:text-sm font-medium ${
                    status === "done"
                      ? "text-slate-700"
                      : status === "running"
                        ? "text-[#0d6e5a] font-bold"
                        : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {status === "done" && s?.duration && (
                <span className="text-[11px] text-slate-400 font-medium">{s.duration}</span>
              )}
              {status === "running" && (
                <span className="text-[11px] text-[#0d6e5a] font-bold">running...</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Fun fact at bottom */}
      <p className="mt-6 text-xs text-slate-400 text-center max-w-sm transition-opacity duration-500">
        Tip: {funFact}
      </p>
    </div>
  );
}
