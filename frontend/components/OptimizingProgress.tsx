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
  field: string;
  section?: string;
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

  // Interactive Question State (one question at a time before rewriting)
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [missingQuestions, setMissingQuestions] = useState<MissingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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

  const processStreamChunk = (data: any) => {
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
  };

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
      await new Promise((r) => setTimeout(r, 600));
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
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;

      const dur2 = ((Date.now() - stepStartTimes.current[2]) / 1000).toFixed(1) + "s";
      setSteps((prev) =>
        prev.map((s) => (s.id === 2 ? { ...s, status: "done", duration: dur2 } : s))
      );

      // Step 3: Detecting missing fields & placeholders
      stepStartTimes.current[3] = Date.now();
      setSteps((prev) =>
        prev.map((s) => (s.id === 3 ? { ...s, status: "running" } : s))
      );
      setProgress(45);

      try {
        const res = await fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText,
            jobDescription,
            instructions,
          }),
        });

        if (!res.body) throw new Error("No response body from optimization service.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!isMountedRef.current || cancelled) break;

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

              // Missing fields detected before rewrite!
              if (data.needsInput && Array.isArray(data.questions) && data.questions.length > 0) {
                setMissingQuestions(data.questions);
                setCurrentQuestionIndex(0);
                setAwaitingInput(true);
                return;
              }

              processStreamChunk(data);
            } catch (e) {
              // Ignore incomplete chunks
            }
          }
        }
      } catch (err: any) {
        if (onError) onError(err?.message || "Failed to start optimization.");
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
          skipDetection: true,
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

            processStreamChunk(data);
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

  const currentQ = missingQuestions[currentQuestionIndex] || missingQuestions[0];
  const isLast = currentQuestionIndex === missingQuestions.length - 1;
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
          ? "Answer each targeted question below to eliminate placeholders and maximize your ATS score."
          : "Stay on this tab — our AI is engineering your ATS-optimized resume."}
      </p>

      {/* ── INTERACTIVE MISSING VALUES PANEL (ONE QUESTION AT A TIME) ── */}
      {awaitingInput && missingQuestions.length > 0 && currentQ ? (
        <div className="w-full bg-white border border-teal-200/90 shadow-xl rounded-2xl p-5 sm:p-7 space-y-5 mb-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Header Bar with Step Counter & Progress bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0d6e5a] text-[10px] font-bold uppercase tracking-wider">
                {currentQ.section || "DETAILS"}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Question {currentQuestionIndex + 1} of {missingQuestions.length}
              </span>
            </div>
            {/* Step indicator pills */}
            <div className="flex items-center gap-1">
              {missingQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentQuestionIndex
                      ? "w-6 bg-[#0d6e5a]"
                      : i < currentQuestionIndex
                      ? "w-2.5 bg-emerald-400"
                      : "w-2.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Current Question */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#0d6e5a] uppercase tracking-wider">
              {currentQ.field}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {currentQ.question}
            </h3>
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={userAnswers[currentQ.field] || ""}
                onChange={(e) =>
                  setUserAnswers((prev) => ({
                    ...prev,
                    [currentQ.field]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!isLast) {
                      setCurrentQuestionIndex((prev) => prev + 1);
                    } else {
                      handleApplyAnswers(false);
                    }
                  }
                }}
                placeholder={currentQ.hint || `Type your answer for ${currentQ.field}...`}
                className="w-full h-11 px-3.5 text-sm bg-slate-50/80 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6e5a] focus:bg-white focus:border-transparent transition-all shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Enter ↵</kbd> to save and move to the next question.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentQuestionIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer"
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isLast) {
                    setCurrentQuestionIndex((prev) => prev + 1);
                  } else {
                    handleApplyAnswers(false);
                  }
                }}
                disabled={isApplying}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0d6e5a] hover:bg-[#0f766e] active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isLast ? "Finish & Optimize Resume ✨" : "Next Question →"}</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {!isLast && (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  Skip this question
                </button>
              )}
              <button
                type="button"
                onClick={() => handleApplyAnswers(true)}
                className="text-slate-400 hover:text-slate-600 text-[11px] transition-colors cursor-pointer"
              >
                Skip All &amp; Optimize
              </button>
            </div>
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
