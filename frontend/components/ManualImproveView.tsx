"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, FileText, Loader2, ArrowRight, Play, RefreshCw, AlertCircle, Award } from "lucide-react";
import { toast } from "react-hot-toast";
import { scoreBullet, getBulletSuggestions } from "./BulletScorer";

interface ManualImproveViewProps {
  resumeText: string;
  jobDescription: string;
  beforeScore: number;
  missingKeywords: string[];
  onSwitchToAI: (editedText: string) => void;
  resumeId: string;
}

function StrongBulletItem({ bullet }: { bullet: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-3 transition-colors duration-200">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">✓</div>
          <span className="text-xs font-semibold text-emerald-400">Strong Bullet Point</span>
        </div>
        <button className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-wider">
          {isOpen ? "Hide" : "View"}
        </button>
      </div>
      {isOpen && (
        <p className="text-xs text-slate-300 mt-2.5 font-mono select-text leading-relaxed border-l-2 border-emerald-500/30 pl-3">
          • {bullet}
        </p>
      )}
    </div>
  );
}

export default function ManualImproveView({
  resumeText,
  jobDescription,
  beforeScore,
  missingKeywords,
  onSwitchToAI,
  resumeId
}: ManualImproveViewProps) {
  const [currentText, setCurrentText] = useState(resumeText);
  const [currentScore, setCurrentScore] = useState(beforeScore);
  const [currentMissing, setCurrentMissing] = useState(missingKeywords);
  const [rescoring, setRescoring] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Extract bullets dynamically from current text to enable live review
  const lines = currentText.split(/\r?\n/);
  const bullets = lines
    .map((l) => l.trim())
    .filter((l) => /^[•\-\*\–\u2022]/.test(l))
    .map((l) => l.replace(/^[•\-\*\–\u2022\s]+/, ""));

  const handleCopyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw);
    setCopiedKey(kw);
    toast.success(`Copied "${kw}"!`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleReScore = async () => {
    setRescoring(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: currentText, jobDescription })
      });
      if (res.ok) {
        const scoreData = await res.json();
        setCurrentScore(scoreData.overall);
        setCurrentMissing(scoreData.missingKeywords || []);
        toast.success(`Score updated to ${scoreData.overall}! 🎯`);
      }
    } catch (err) {
      toast.error("Re-scoring failed");
    } finally {
      setRescoring(false);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, type: "original", text: currentText }),
      });
      if (!response.ok) throw new Error("PDF download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "resume-manually-improved.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF Downloaded successfully! 📄");
    } catch (err: any) {
      toast.error(err.message || "Failed to download PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* Header Banner */}
      <div className="bg-[#0b0c1e] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Manual Optimization Board</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Improve your resume score step-by-step by resolving the recommendations below.
            </p>
          </div>
        </div>
        <div className="bg-[#121332] border border-white/10 rounded-xl px-5 py-3 text-center shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ATS Score</span>
          <span className="text-2xl font-black text-violet-400">{currentScore}/100</span>
        </div>
      </div>

      {/* Section A: Missing Keywords */}
      <div className="bg-[#071525]/40 border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white uppercase tracking-wider">❌ Missing Keywords (Add These)</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Click any badge to copy. Add these keywords naturally into your resume bullets and skills section.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {currentMissing && currentMissing.length > 0 ? (
            currentMissing.map((kw) => (
              <button
                key={kw}
                onClick={() => handleCopyKeyword(kw)}
                className="group flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all cursor-pointer"
              >
                {copiedKey === kw ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-red-400/60 group-hover:text-red-400" />}
                <span>{kw}</span>
              </button>
            ))
          ) : (
            <span className="text-xs text-emerald-400 font-bold">All target keywords found! 🎉</span>
          )}
        </div>
      </div>

      {/* Section B: Bullets to Improve */}
      <div className="bg-[#071525]/40 border border-white/5 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white uppercase tracking-wider">💡 Bullets to Improve</span>
        </div>
        
        {bullets.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No bullet points detected. Ensure your bullet lines start with •, -, *, or –.</p>
        ) : (
          <div className="space-y-4">
            {bullets.map((bullet, idx) => {
              const { score, hasVerb, hasMetric } = scoreBullet(bullet);
              const isWeak = score < 0.5;

              if (isWeak) {
                const { suggestions, exampleVerbs } = getBulletSuggestions(bullet);
                return (
                  <div key={idx} className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-xs text-slate-300 font-mono select-text leading-relaxed flex-1">
                        • {bullet}
                      </p>
                      <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                        Score: {score}
                      </span>
                    </div>
                    <div className="border-t border-amber-500/10 pt-2.5 space-y-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="text-[11px] font-extrabold text-amber-400 block">Suggested Fixes:</span>
                          {suggestions.map((s, i) => (
                            <p key={i} className="text-[10.5px] text-slate-400 font-medium">
                              - {s}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold pl-5">
                        Example verbs to start with: <span className="text-slate-300">{exampleVerbs.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return <StrongBulletItem key={idx} bullet={bullet} />;
              }
            })}
          </div>
        )}
      </div>

      {/* Section C: Edit Your Resume Here */}
      <div className="bg-[#071525]/40 border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white uppercase tracking-wider">📝 Edit Your Resume Here</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Make updates inside the textarea below. Changes to bullet points and keywords will score immediately when you hit Re-score.
        </p>

        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          className="w-full min-h-[350px] bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl p-5 font-mono text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none resize-none leading-relaxed select-text"
        />

        <div className="flex justify-end pt-1">
          <Button
            onClick={handleReScore}
            disabled={rescoring}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 px-5"
          >
            {rescoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Re-score My Changes
          </Button>
        </div>
      </div>

      {/* Section D: Done Editing / Alternative */}
      <div className="bg-[#0b0c1e] border border-white/5 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white uppercase">✅ Done Editing?</h4>
          <p className="text-[11px] text-slate-400 font-medium">Export your manually optimized resume as PDF or run AI auto-improve.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <Button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 px-6 w-full sm:w-auto"
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4" />}
            Download My Manually Improved Resume
          </Button>

          <Button
            onClick={() => onSwitchToAI(currentText)}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 px-6 bg-transparent w-full sm:w-auto"
          >
            Switch to AI Improve Instead
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>

    </div>
  );
}
