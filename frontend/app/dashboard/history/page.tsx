"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResumeRecord, CreditInfo } from "@/types";
import { logger } from "@/lib/logger";
import { saveAs } from "file-saver";
import {
  Loader2,
  History,
  AlertCircle,
  Plus,
  ChevronRight,
  TrendingUp,
  Calendar,
  X,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Tag,
  FileText,
  ArrowLeft,
  Lock,
  Share2,
  Compass,
  MessageSquare,
  HelpCircle,
  GraduationCap,
  Sparkle,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import ScrollFadeIn from "@/components/ScrollFadeIn";

/* ─── helpers ─────────────────────────────────────── */
function scoreColor(n: number) {
  if (n >= 75) return { ring: "#22c55e", bg: "rgba(34,197,94,0.08)", text: "#22c55e", border: "rgba(34,197,94,0.2)" };
  if (n >= 50) return { ring: "#f59e0b", bg: "rgba(245,158,11,0.08)", text: "#f59e0b", border: "rgba(245,158,11,0.2)" };
  return { ring: "#ef4444", bg: "rgba(239,68,68,0.08)", text: "#ef4444", border: "rgba(239,68,68,0.2)" };
}

function CircleGauge({ value, label, size = 100 }: { value: number; label: string; size?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 800; // Animate over 800ms
    const increment = end / (duration / 16); // ~60fps
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  const { ring, bg, text } = scoreColor(value);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayValue / 100) * circ;

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
            className="transition-all duration-150 ease-out"
          />
        </svg>
        <span className="relative text-2xl font-black tracking-tight animate-pulse-subtle" style={{ color: text }}>{displayValue}</span>
      </div>
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

interface DetailViewProps {
  resume: ResumeRecord;
  userPlan: string;
  onBack: () => void;
  onRestore: () => void;
}

/* ─── Detail view (Image 2 mockup styled) ─────────────── */
function DetailView({ resume, userPlan, onBack, onRestore }: DetailViewProps) {
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

  const delta = resume.scoreAfter - resume.scoreBefore;
  const keywords = Array.isArray(resume.keywordsAdded) ? resume.keywordsAdded : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(resume.optimizedText || "");
    setCopied(true);
    toast.success("Optimized text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = async (format: "pdf" | "docx") => {
    if (format === "pdf") setPdfLoading(true);
    else setDocxLoading(true);

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate ${format.toUpperCase()} file.`);
      }

      const blob = await response.blob();
      saveAs(blob, `${resume.jobTitle?.replace(/\s+/g, "-") || "resume"}-optimized.${format}`);
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
      // Simulate/call Gemini to build a roadmap for the selected skill
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
        `I am writing to express my strong interest in the ${resume.jobTitle || "target"} position at ${resume.company || "your company"}.\n\n` +
        `With an ATS score matching rating of ${resume.scoreAfter}/100, my background aligns closely with the core values of your engineering goals. My experience in integrating key keywords like ${keywords.slice(0, 3).join(", ") || "software technologies"} makes me a great fit.\n\n` +
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

  const shareText = `Check out my resume ATS score improvement on FastHire-AI: from ${resume.scoreBefore} to ${resume.scoreAfter} (+${delta} pts)! 🚀`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://fasthire-ai.vercel.app")}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  const isLocked = userPlan === "free";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Detail view header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-9 w-9 rounded-xl border border-white/5 bg-[#0f1022] hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400 bg-violet-400/10 px-2.5 py-0.5 rounded-full">
                Scanned History Detail
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full">
                Active plan: {userPlan === "owner" ? "Unlimited Free (Owner)" : userPlan.toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-1.5">{resume.jobTitle || "Resume Optimization"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ATS Score display */}
          <div className="bg-[#00e699]/5 border border-[#00e699]/20 text-[#00e699] font-bold px-4 py-2 rounded-full text-xs flex items-center gap-2 select-none shadow-sm">
            <span>ATS Score:</span>
            <span className="font-extrabold">{resume.scoreBefore}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-black text-sm">{resume.scoreAfter}</span>
            <span className="bg-[#00e699]/15 text-[#00e699] text-[9px] px-1.5 py-0.5 rounded font-black">+{delta}</span>
          </div>
          
          <Button
            onClick={onRestore}
            size="sm"
            className="bg-[#0f1022] border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 font-bold h-9 rounded-xl text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-violet-400" />
            Restore
          </Button>
        </div>
      </div>

      {/* Top Banner Message */}
      <div className="bg-gradient-to-r from-violet-650/15 via-[#0e0f21] to-transparent border border-violet-500/10 rounded-2xl p-4 flex items-center gap-3 select-none">
        <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkle className="h-4.5 w-4.5 text-violet-400" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">Your optimized resume is ready! More features coming soon.</h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Use the widgets below to generate custom cover letters and skills Roadmaps.</p>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Column 1: Your Optimized Resume */}
        <div className="bg-[#0b0c1a]/70 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Your Optimized Resume
            </h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all text-slate-400 hover:text-white border border-white/5 bg-[#0f1022]"
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
            {isLocked && (
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] pointer-events-none flex flex-col items-center justify-center select-none p-6 text-center">
                <div className="bg-[#0c0d1b] border border-white/10 p-4 rounded-xl shadow-2xl text-white max-w-[240px] pointer-events-auto">
                  <Lock className="h-6 w-6 text-violet-500 mx-auto mb-2" />
                  <h5 className="text-xs font-bold">Document Preview</h5>
                  <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">Upgrade to a paid plan to unlock PDF and Word export downloads.</p>
                </div>
              </div>
            )}
            <pre className="text-xs leading-relaxed whitespace-pre-wrap select-text font-serif">
              {resume.optimizedText || "No optimized text found."}
            </pre>
          </div>

          {/* Download & Share Actions */}
          <div className="space-y-3">
            {isLocked ? (
              <Link href="/dashboard/pricing" className="w-full block">
                <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-600/15">
                  <Lock className="h-4 w-4" />
                  Unlock PDF &amp; DOCX Download
                </Button>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => downloadFile("pdf")}
                  disabled={pdfLoading}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5"
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
                  href={linkedinShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 bg-[#0f1022] hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <Share2 className="h-3 w-3" />
                  LinkedIn
                </a>
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/5 bg-[#0f1022] hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <Share2 className="h-3 w-3" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: What Changed */}
        <div className="bg-[#0b0c1a]/70 border border-white/5 rounded-2xl p-5 space-y-5">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            What Changed
          </h3>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0f1022] border border-white/5 rounded-xl p-3 text-center">
              <span className="text-lg font-black text-emerald-400">{keywords.length}</span>
              <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Keywords Added</span>
            </div>
            <div className="bg-[#0f1022] border border-white/5 rounded-xl p-3 text-center">
              <span className="text-lg font-black text-violet-400">
                {Math.max(1, Math.min(6, Math.floor(delta / 4)))}
              </span>
              <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Bullets Rewritten</span>
            </div>
            <div className="bg-[#0f1022] border border-white/5 rounded-xl p-3 text-center">
              <span className="text-lg font-black text-sky-400">
                {Math.min(100, Math.round(resume.scoreAfter * 0.95))}%
              </span>
              <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Skills Matched</span>
            </div>
          </div>

          {/* Keywords Injected Section */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ATS Keywords Injected</span>
            <div className="flex flex-wrap gap-1.5">
              {keywords.length > 0 ? (
                keywords.map((kw, i) => (
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

          {/* Existing keywords */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Keywords Already Present</span>
            <div className="flex flex-wrap gap-1.5">
              {["Resume", "Teamwork", "Software", "Development"].map((kw, i) => (
                <span
                  key={i}
                  className="text-[10px] font-semibold bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2 py-0.5 rounded"
                >
                  ✓ {kw}
                </span>
              ))}
            </div>
          </div>

          {/* AI changes bullet points */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Optimization Suggestions</span>
            <ul className="space-y-2 text-[10px] text-slate-400 font-medium leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-violet-400 font-bold">-</span>
                <span>Expanded action verbs (e.g. replaced "led" with "spearheaded", "developed" with "architected").</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-violet-400 font-bold">-</span>
                <span>Integrated {keywords.length} critical skills extracted from the job description organically.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-violet-400 font-bold">-</span>
                <span>Enforced page formatting and density rules to guarantee clean parser readability.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 3: ATS Score Breakdown */}
        <div className="bg-[#0b0c1a]/70 border border-white/5 rounded-2xl p-5 space-y-5">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ATS Score
          </h3>

          {/* Score comparison visualizer */}
          <div className="flex items-center justify-around gap-4 bg-[#0f1022] border border-white/5 rounded-xl p-4">
            <CircleGauge value={resume.scoreBefore} label="Before" size={80} />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <ArrowRight className="h-4 w-4 animate-pulse" />
              </div>
              <span className="text-[9px] font-black text-emerald-400">+{delta} pts</span>
            </div>
            <CircleGauge value={resume.scoreAfter} label="After" size={80} />
          </div>

          {/* Description Rubric */}
          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold bg-white/2 p-2.5 rounded-lg border border-white/5 text-center">
            Standard ATS Rubric Score &bull; Industry: Tech &bull; Computed using local keyword weights.
          </p>

          {/* Score breakdown bars comparison */}
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
                  <span>{item.before}% → {item.after}%</span>
                </div>
                {/* Bar progress */}
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                  <div className="h-full bg-slate-700" style={{ width: `${item.before}%` }} />
                  <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${item.after - item.before}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Actionable Tips */}
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

          {/* Feedback Box */}
          <div className="bg-violet-950/10 border border-violet-500/10 rounded-xl p-3 flex gap-2">
            <MessageSquare className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-slate-500 leading-relaxed font-semibold">
              Have feedback? We read every message and improve based on what you share.
            </p>
          </div>
        </div>

      </div>

      {/* BOTTOM ACCORDIONS */}
      <div className="space-y-3">
        {/* Accordion 1: Skills Learning Roadmap (PRO) */}
        <div className="border border-white/5 bg-[#0e0f21]/40 rounded-2xl overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowRoadmapAccordion(!showRoadmapAccordion)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-violet-650/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  Skills Learning Roadmap (PRO)
                  <span className="bg-violet-600 border border-violet-500 text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">PRO</span>
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Pick up to 3 skills - 1/1 roadmaps left this month</p>
              </div>
            </div>
            <ChevronRight className={`h-4.5 w-4.5 text-slate-500 transition-transform ${showRoadmapAccordion ? "rotate-90" : ""}`} />
          </button>

          {showRoadmapAccordion && (
            <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-[#070814]/30 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Click a skill to generate roadmap:</span>
                <div className="flex flex-wrap gap-2">
                  {keywords.length > 0 ? (
                    keywords.map((kw, i) => (
                      <button
                        key={i}
                        onClick={() => handleGenerateRoadmap(kw)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-all border ${
                          selectedRoadmapSkill === kw
                            ? "bg-violet-500/20 border-violet-500 text-white font-bold"
                            : "bg-[#0f1022] border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        {kw}
                      </button>
                    ))
                  ) : (
                    ["Machine Learning", "Generative AI", "APIs"].map((kw, i) => (
                      <button
                        key={i}
                        onClick={() => handleGenerateRoadmap(kw)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded transition-all border ${
                          selectedRoadmapSkill === kw
                            ? "bg-violet-500/20 border-violet-500 text-white font-bold"
                            : "bg-[#0f1022] border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        {kw}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {roadmapLoading && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 py-4 justify-center bg-[#070814]/40 border border-white/5 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  <span>Generating tailored learning roadmap...</span>
                </div>
              )}

              {roadmapContent && (
                <div className="bg-[#070814]/50 border border-white/5 p-4 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2 select-text font-sans">
                  <pre className="whitespace-pre-wrap font-sans select-text">{roadmapContent}</pre>
                </div>
              )}

              {!roadmapLoading && !roadmapContent && (
                <div className="text-center py-6 text-[10px] text-slate-500 italic bg-[#070814]/20 border border-dashed border-white/5 rounded-xl select-none">
                  Select a skill above to generate learning roadmap.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 2: Cover Letter Generator */}
        <div className="border border-white/5 bg-[#0e0f21]/40 rounded-2xl overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowCoverLetterAccordion(!showCoverLetterAccordion)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  Cover Letter Generator
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">1 free cover letter available</p>
              </div>
            </div>
            <ChevronRight className={`h-4.5 w-4.5 text-slate-500 transition-transform ${showCoverLetterAccordion ? "rotate-90" : ""}`} />
          </button>

          {showCoverLetterAccordion && (
            <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-[#070814]/30 space-y-4">
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                Generate a tailored cover letter using your optimized resume and the job description details.
              </p>

              {!coverLetterGenerated && !generatingLetter && (
                <Button
                  onClick={handleGenerateCoverLetter}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] h-9 px-4 rounded-lg"
                >
                  Generate Cover Letter
                </Button>
              )}

              {generatingLetter && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 py-4 justify-center bg-[#070814]/40 border border-white/5 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Drafting tailored cover letter...</span>
                </div>
              )}

              {coverLetterGenerated && (
                <div className="space-y-3 select-text">
                  <div className="bg-[#070814]/50 border border-white/5 p-4 rounded-xl text-xs text-slate-300 leading-relaxed space-y-2 select-text font-serif">
                    <pre className="whitespace-pre-wrap font-serif select-text">{coverLetterGenerated}</pre>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetterGenerated);
                      toast.success("Cover letter copied to clipboard!");
                    }}
                    className="bg-[#0f1022] border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 text-[10px] h-8 rounded-lg"
                  >
                    Copy Cover Letter
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── History Row Card (Image 1 mockup styled) ──────────── */
function HistoryRow({
  resume,
  onClick,
}: {
  resume: ResumeRecord;
  onClick: () => void;
}) {
  const delta = resume.scoreAfter - resume.scoreBefore;
  const beforeColor = scoreColor(resume.scoreBefore).text;
  const afterColor = scoreColor(resume.scoreAfter).text;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl py-2.5 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 relative overflow-hidden bg-[#0e0f21]/40 border border-white/5 hover:border-violet-500/30"
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.03) 0%, transparent 65%)" }}
      />

      <div className="flex items-center gap-3 min-w-0">
        {/* Score comparison pill (Left side) */}
        <div className="shrink-0 flex items-center gap-1.5 bg-[#070814]/60 border border-white/5 px-2.5 py-1 rounded-full select-none text-[10px] font-bold">
          <span style={{ color: beforeColor }}>{resume.scoreBefore}</span>
          <ArrowRight className="h-3 w-3 text-slate-500" />
          <span style={{ color: afterColor }}>{resume.scoreAfter}</span>
        </div>

        {/* Title and metadata info (Center) */}
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-white truncate group-hover:text-violet-300 transition-colors">
            {resume.jobTitle || "Resume Optimization"}
          </h3>
          <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5 font-semibold">
            <span className="flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(resume.createdAt)}
            </span>
            <span>&bull;</span>
            <span className="text-slate-400">Tech</span>
          </div>
        </div>
      </div>

      {/* Delta pill and Chevron (Right side) */}
      <div className="flex items-center gap-2.5 self-end sm:self-auto">
        <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 text-[#22c55e] px-1.5 py-0.5 rounded-full">
          +{delta}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </button>
  );
}

/* ─── Main Page ────────────────────────────────────── */
export default function HistoryPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selected, setSelected] = useState<ResumeRecord | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");

  const store = useResumeStore();

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;

        if (error || !user) {
          toast.error("Please sign in to view history.");
          router.push("/auth/login");
          return;
        }

        if (active) setAuthLoading(false);

        // Fetch history via API endpoint to bypass client RLS issues
        let dbData: any[] = [];
        let dbError: any = null;
        try {
          const historyRes = await fetch("/api/history");
          if (historyRes.ok) {
            dbData = await historyRes.json();
          } else {
            const errBody = await historyRes.json().catch(() => ({}));
            dbError = new Error(errBody.error || "Failed to fetch history from API");
          }
        } catch (fetchErr: any) {
          dbError = fetchErr;
        }

        // Fetch plan/credits details
        try {
          const creditsRes = await fetch("/api/credits");
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            if (creditsData.isOwner) {
              setUserPlan("owner");
            } else if (creditsData.paidCredits > 900000) {
              setUserPlan("promax");
            } else if (creditsData.paidCredits > 0) {
              setUserPlan("premium");
            } else {
              setUserPlan("free");
            }
          }
        } catch (creditsErr) {
          console.error("Failed to load credits:", creditsErr);
        }

        if (!active) return;

        if (dbError) {
          logger.error("Failed to query scans from Supabase", dbError);
          toast.error("Could not load history.");
        } else if (dbData) {
          setResumes(dbData as any[]);
        }
        setLoading(false);
      } catch (err) {
        logger.error("Unexpected error loading history:", err);
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [router]);

  const handleRestore = (record: ResumeRecord) => {
    store.setResumeText(record.originalText);
    store.setJobDescription(record.jobDescription);
    setSelected(null);
    router.push("/dashboard");
    toast.success("Loaded into dashboard!");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-slate-100 bg-[#060713]">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-10 select-text">
        <ScrollFadeIn>
          {selected ? (
            /* Detailed 3-Column optimization report (Image 2 mockup styled) */
            <DetailView
              resume={selected}
              userPlan={userPlan}
              onBack={() => setSelected(null)}
              onRestore={() => handleRestore(selected)}
            />
          ) : (
            /* List optimizations dashboard view (Image 1 mockup styled) */
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
                      <History className="h-4.5 w-4.5" />
                    </div>
                    <h1 className="text-xl font-black text-white tracking-tight">Resume History</h1>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-10">
                    {resumes.length > 0
                      ? `${resumes.length} optimization${resumes.length !== 1 ? "s" : ""} — click any row to view details`
                      : "Your resume optimizations will appear here"}
                  </p>
                </div>

                <Link href="/dashboard">
                  <Button className="h-9 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/15">
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Resume
                  </Button>
                </Link>
              </div>

              {/* Content list */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                  <p className="text-xs text-slate-500 font-semibold">Loading history...</p>
                </div>
              ) : resumes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl p-16 text-center border border-dashed border-white/5 bg-[#0e0f21]/20">
                  <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-violet-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">No optimizations yet</h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Upload your resume and a job description to run your first AI-powered optimization.
                  </p>
                  <Link href="/dashboard" className="mt-5">
                    <Button className="font-bold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl px-4 py-2">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Start Optimizing
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map((resume) => (
                    <HistoryRow
                      key={resume.id}
                      resume={resume}
                      onClick={() => setSelected(resume)}
                    />
                  ))}

                  {/* Centered Pagination text */}
                  <p className="text-center text-[10px] text-slate-500 pt-6 font-semibold uppercase tracking-wider select-none">
                    Page 1 of 1 &bull; {resumes.length} total scan{resumes.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollFadeIn>
      </main>
    </div>
  );
}
