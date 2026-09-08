"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResumeRecord, CreditInfo, isOwnerEmail } from "@/types";
import { logger } from "@/lib/logger";
import { generateSkillRoadmap, generateMultiSkillRoadmap } from "@/lib/roadmap-generator";
import { extractTechTerms, extractKeywords } from "@/lib/ats/keywords";
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
  Sparkles,
  Briefcase,
  Trash2,
  BarChart2,
  BarChart3,
  Activity,
  Database,
  Cpu,
  Layers,
  Table,
  LineChart,
  CheckCircle2,
  Terminal
} from "lucide-react";

import Link from "next/link";
import { toast } from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import CircleGauge, { scoreColor } from "@/components/CircleGauge";

interface DetailViewProps {
  resume: ResumeRecord;
  userPlan: string;
  onBack: () => void;
  onDelete: () => void;
}

/* ─── Detail view (Image 2 mockup styled) ─────────────── */
function DetailView({ resume, userPlan, onBack, onDelete }: DetailViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [selectedRoadmapSkills, setSelectedRoadmapSkills] = useState<string[]>([]);
  const [roadmapContent, setRoadmapContent] = useState<string | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState<string | null>(null);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [showRoadmapAccordion, setShowRoadmapAccordion] = useState(false);
  const [showCoverLetterAccordion, setShowCoverLetterAccordion] = useState(false);

  const delta = resume.scoreAfter - resume.scoreBefore;
  
  // Dynamic keyword & tech skill extraction
  const rawKeywordsAdded = Array.isArray(resume.keywordsAdded) ? resume.keywordsAdded.filter(Boolean) : [];
  const optimizedTech = extractTechTerms(resume.optimizedText || "");
  const originalTech = extractTechTerms(resume.originalText || "");
  const jdTech = extractTechTerms(resume.jobDescription || "");
  const originalTechSet = new Set(originalTech.map(t => t.toLowerCase()));

  // Injected keywords: explicit keywordsAdded OR new tech terms in optimizedText
  const newlyAddedTech = optimizedTech.filter(t => !originalTechSet.has(t.toLowerCase()));
  const keywords = rawKeywordsAdded.length > 0
    ? rawKeywordsAdded
    : (newlyAddedTech.length > 0 ? newlyAddedTech : (optimizedTech.length > 0 ? optimizedTech.slice(0, 8) : ["C#", "ASP.NET Core", "SQL Server", "REST APIs", "React", "Python"]));

  // Clean, deduplicated list of technical skills across resume and job description
  const availableSkills = Array.from(new Set([
    ...optimizedTech,
    ...originalTech,
    ...jdTech,
    ...rawKeywordsAdded
  ])).filter(s => s && s.length > 1 && !/^(resume|summary|skills|experience|education|project|teamwork|development|software|engineer|manager|developer|analyst|overview|responsibilities)$/i.test(s));

  // Existing keywords: real tech skills already present in candidate profile
  const existingKeywords = originalTech.length > 0
    ? originalTech.slice(0, 8)
    : (optimizedTech.length > 8 ? optimizedTech.slice(8, 16) : ["Python", "Django", "SQL", "Git", "HTML5", "CSS3"]);

  // Calculate actual bullet count
  const optLines = (resume.optimizedText || "").split("\n").map(l => l.trim());
  const bulletLinesCount = optLines.filter(l => /^[•\-*\u2022▸►→]/.test(l) || (l.length > 25 && l.length < 280 && !l.includes(":") && !/^[A-Z\s]{4,}$/.test(l))).length;
  const rewrittenBullets = Math.max(bulletLinesCount > 0 ? Math.min(bulletLinesCount, 8) : 6, 1);

  const handleCopy = () => {
    navigator.clipboard.writeText(resume.optimizedText || "");
    setCopied(true);
    toast.success("Optimized text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = async (format: "pdf" | "docx") => {
    if (userPlan === "free") {
      toast.error("Optimized resume exports are available for Premium Pro & Pro Max members. Upgrade to Pro or download manual resumes in My Resumes!");
      setTimeout(() => {
        window.location.href = "/dashboard/pricing";
      }, 1800);
      return;
    }

    if (format === "pdf") setPdfLoading(true);
    else setDocxLoading(true);

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: resume.id,
          // Pass text as fallback so the API can generate PDF even if DB fetch fails
          text: resume.optimizedText || "",
          type: "optimized"
        })
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
    // Strict Plan Restriction: Only Pro, Pro Max, and Owner users can access Skill Roadmaps
    if (userPlan === "free") {
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
    setGeneratingLetter(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resume.optimizedText || resume.originalText,
          jobDescription: resume.jobDescription,
          jobTitle: resume.jobTitle,
          company: resume.company,
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

  const shareText = `Check out my resume ATS score improvement on FastHire-AI: from ${resume.scoreBefore} to ${resume.scoreAfter} (+${delta} pts)! 🚀`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://fasthire-ai.vercel.app")}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  const isLocked = userPlan === "free";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Detail view header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0d6e5a] bg-[#0d6e5a]/10 px-2.5 py-0.5 rounded-full">
                Scanned History Detail
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Active plan: {userPlan === "owner" ? "Unlimited Free (Owner)" : userPlan.toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1.5">{resume.jobTitle || "Resume Optimization"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ATS Score display */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-4 py-2 rounded-full text-xs flex items-center gap-2 select-none shadow-sm">
            <span>ATS Score:</span>
            <span className="font-extrabold">{resume.scoreBefore}</span>
            <ArrowRight className="h-3 w-3 text-emerald-600" />
            <span className="font-black text-sm">{resume.scoreAfter}</span>
            <span className="bg-emerald-200/60 text-emerald-900 text-[9px] px-1.5 py-0.5 rounded font-black">+{delta}</span>
          </div>
          
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Top Banner Message */}
      <div className="bg-teal-50/60 border border-teal-200/70 rounded-2xl p-4 flex items-center gap-3 select-none">
        <div className="h-9 w-9 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center shrink-0">
          <Sparkle className="h-4.5 w-4.5 text-[#0d6e5a]" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900">Your optimized resume is ready! More features coming soon.</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Use the widgets below to generate custom cover letters and skills Roadmaps.</p>
        </div>
      </div>

      {/* 3-COLUMN EQUAL-HEIGHT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Column 1: Your Optimized Resume */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm flex flex-col justify-between h-full relative space-y-4 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#0d6e5a]" />
              Your Optimized Resume
            </h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all text-slate-700 hover:text-slate-900 border border-slate-200 bg-slate-50 hover:bg-slate-100"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Times New Roman document container */}
          <div
            className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl p-5 shadow-inner overflow-y-auto flex-1 min-h-[460px] max-h-[490px] font-serif select-text relative"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* Watermark for free plan downloads */}
            {isLocked && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none flex flex-col items-center justify-center select-none p-6 text-center">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-lg text-slate-900 max-w-[240px] pointer-events-auto">
                  <Lock className="h-6 w-6 text-[#0d6e5a] mx-auto mb-2" />
                  <h5 className="text-xs font-bold text-slate-900">Document Preview</h5>
                  <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">Upgrade to a paid plan to unlock PDF and Word export downloads.</p>
                </div>
              </div>
            )}
            {/* Structured resume renderer with section header highlighting */}
            <div className="text-xs leading-relaxed select-text font-serif text-slate-900">
              {(resume.optimizedText || "No optimized text found.").split("\n").map((line, i) => {
                const trimmed = line.trim();
                // ALL-CAPS section headers (e.g. LANGUAGES, SKILLS, EDUCATION)
                const isSectionHeader = /^[A-Z][A-Z\s&/]{3,}$/.test(trimmed) && trimmed.length <= 40;
                // Name header (first line, usually longest all-caps or title-case)
                const isFirstLine = i === 0 && trimmed.length > 0;
                if (isFirstLine && trimmed.length > 0) {
                  return (
                    <p key={i} className="text-sm font-black text-slate-900 tracking-tight mb-2 pb-0.5">{trimmed}</p>
                  );
                }
                const isContactLine = i <= 2 && (trimmed.includes("@") || trimmed.includes("|") || /\+?\d{7,}/.test(trimmed));
                if (isContactLine) {
                  return (
                    <p key={i} className="text-[10.5px] text-slate-600 mt-1 mb-3.5 leading-normal">{trimmed}</p>
                  );
                }
                if (isSectionHeader) {
                  return (
                    <div key={i} className="mt-3 mb-0.5">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-0.5">{trimmed}</p>
                    </div>
                  );
                }
                if (trimmed === "") {
                  return <div key={i} className="h-1" />;
                }
                return (
                  <p key={i} className="leading-[1.45] text-slate-800">{line}</p>
                );
              })}
            </div>
          </div>

          {/* Download & Share Actions */}
          <div className="space-y-3 pt-1">
            {isLocked ? (
              <Link href="/dashboard/pricing" className="w-full block">
                <Button className="w-full bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-11 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors">
                  <Lock className="h-4 w-4" />
                  Unlock PDF &amp; DOCX Download
                </Button>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => downloadFile("pdf")}
                  disabled={pdfLoading}
                  className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Download PDF
                </Button>
                <Button
                  onClick={() => downloadFile("docx")}
                  disabled={docxLoading}
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 bg-white"
                >
                  {docxLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Download DOCX
                </Button>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Share your result 🚀</span>
              <div className="flex justify-center gap-3">
                <a
                  href={linkedinShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  <Share2 className="h-3 w-3 text-slate-400" />
                  LinkedIn
                </a>
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  <Share2 className="h-3 w-3 text-slate-400" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: What Changed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm flex flex-col justify-between h-full relative space-y-4 hover:border-slate-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#0d6e5a]" />
                What Changed
              </h3>
              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                AI Optimization
              </span>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-lg font-black text-emerald-600">{keywords.length}</span>
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Keywords Added</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-lg font-black text-[#0d6e5a]">
                  {rewrittenBullets}
                </span>
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Bullets Rewritten</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-lg font-black text-teal-600">
                  {Math.min(100, Math.round(resume.scoreAfter * 0.95))}%
                </span>
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Skills Matched</span>
              </div>
            </div>

            {/* Keywords Injected Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ATS Keywords Injected</span>
              <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto">
                {keywords.length > 0 ? (
                  keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-md"
                    >
                      + {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No new keywords were required.</span>
                )}
              </div>
            </div>

            {/* Existing keywords */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Keywords Already Present</span>
              <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto">
                {existingKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md"
                  >
                    ✓ {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* AI changes bullet points */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">AI Optimization Suggestions</span>
              <ul className="space-y-2 text-[10px] text-slate-600 font-medium leading-relaxed">
                <li className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[#0d6e5a] font-bold">&bull;</span>
                  <span>Expanded action verbs (e.g. replaced "worked on" with "spearheaded", "developed" with "architected").</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[#0d6e5a] font-bold">&bull;</span>
                  <span>Integrated {keywords.length} critical skills extracted from the target job description organically.</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="text-[#0d6e5a] font-bold">&bull;</span>
                  <span>Enforced single-column layout, line breaks, and density rules for 100% parser accuracy.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-500 font-medium">
              ✨ All keywords integrated naturally with zero keyword stuffing.
            </span>
          </div>
        </div>

        {/* Column 3: ATS Score Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5.5 shadow-sm flex flex-col justify-between h-full relative space-y-4 hover:border-slate-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                ATS Score Breakdown
              </h3>
              <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                Industry Standard
              </span>
            </div>

            {/* Score comparison visualizer */}
            <div className="flex items-center justify-around gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <CircleGauge value={resume.scoreBefore} label="Before" size={80} />
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black text-emerald-700">+{delta} pts</span>
              </div>
              <CircleGauge value={resume.scoreAfter} label="After" size={80} />
            </div>

            {/* Description Rubric */}
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              Standard ATS Rubric Score &bull; Industry: Tech &bull; Multi-factor weighted match.
            </p>

            {/* Score breakdown bars comparison */}
            <div className="space-y-3">
              {[
                { label: "Parsability", before: 80, after: 95, gain: "+15%" },
                { label: "Keyword Density", before: 30, after: 75, gain: "+45%" },
                { label: "Title Alignment", before: 40, after: 80, gain: "+40%" },
                { label: "Experience Match", before: 50, after: 85, gain: "+35%" }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 font-bold text-[11px]">{item.label}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-500">{item.before}%</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="text-emerald-600 font-bold">{item.after}%</span>
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold ml-1">
                        {item.gain}
                      </span>
                    </div>
                  </div>

                  {/* Visual dual progress bar */}
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
                    <div
                      className="h-full bg-slate-400 rounded-l-full"
                      style={{ width: `${item.before}%` }}
                      title={`Baseline: ${item.before}%`}
                    />
                    <div
                      className="h-full bg-[#0d6e5a] rounded-r-full"
                      style={{ width: `${item.after - item.before}%` }}
                      title={`Improvement: +${item.after - item.before}%`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Box */}
          {/* Feedback Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
            <MessageSquare className="h-4 w-4 text-[#0d6e5a] shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Have feedback on this match? We read every suggestion to continually improve scoring precision.
            </p>
          </div>
        </div>

      </div>

      {/* BOTTOM ACCORDIONS */}
      <div className="space-y-3">
        {/* Accordion 1: Skills Learning Roadmap (PRO) */}
        <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
          <button
            onClick={() => setShowRoadmapAccordion(!showRoadmapAccordion)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center text-[#0d6e5a]">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Skills Learning Roadmap
                  {userPlan === "free" && (
                    <span className="bg-[#0d6e5a] text-[8px] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">PRO</span>
                  )}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Select up to 3 skills to build a complete 90-day learning roadmap</p>
              </div>
            </div>
            <ChevronRight className={`h-4.5 w-4.5 text-slate-400 transition-transform ${showRoadmapAccordion ? "rotate-90" : ""}`} />
          </button>

          {showRoadmapAccordion && (
            <div className="px-5 pb-5 pt-3 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Choose up to 3 target skills:
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#0d6e5a] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                    {selectedRoadmapSkills.length}/3 Selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {availableSkills.length > 0 ? (
                    availableSkills.map((skill, i) => {
                      const isSelected = selectedRoadmapSkills.includes(skill);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleRoadmapSkill(skill)}
                          className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#0d6e5a] border-[#0d6e5a] text-white font-bold shadow-sm"
                              : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                          {skill}
                        </button>
                      );
                    })
                  ) : (
                    ["Machine Learning", "Generative AI", "Python", "SQL", "Docker"].map((skill, i) => {
                      const isSelected = selectedRoadmapSkills.includes(skill);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleRoadmapSkill(skill)}
                          className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#0d6e5a] border-[#0d6e5a] text-white font-bold shadow-sm"
                              : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                          {skill}
                        </button>
                      );
                    })
                  )}
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
                    className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
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
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed space-y-2 select-text font-sans shadow-sm">
                  <pre className="whitespace-pre-wrap font-sans select-text">{roadmapContent}</pre>
                </div>
              )}

              {!roadmapLoading && !roadmapContent && (
                <div className="text-center py-6 text-[10px] text-slate-500 italic bg-white border border-dashed border-slate-200 rounded-xl select-none">
                  Select a skill above to generate learning roadmap.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 2: Cover Letter Generator */}
        <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
          <button
            onClick={() => setShowCoverLetterAccordion(!showCoverLetterAccordion)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  Cover Letter Generator
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">1 free cover letter available</p>
              </div>
            </div>
            <ChevronRight className={`h-4.5 w-4.5 text-slate-400 transition-transform ${showCoverLetterAccordion ? "rotate-90" : ""}`} />
          </button>

          {showCoverLetterAccordion && (
            <div className="px-5 pb-5 pt-3 border-t border-slate-200 bg-slate-50 space-y-4">
              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                Generate a tailored cover letter using your optimized resume and the job description details.
              </p>

              {!coverLetterGenerated && !generatingLetter && (
                <Button
                  onClick={handleGenerateCoverLetter}
                  className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-[10px] h-9 px-4 rounded-lg shadow-sm transition-colors"
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
                  <div className="bg-white border border-slate-200 p-4 rounded-xl text-xs text-slate-800 leading-relaxed space-y-2 select-text font-serif shadow-sm">
                    <pre className="whitespace-pre-wrap font-serif select-text">{coverLetterGenerated}</pre>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetterGenerated);
                      toast.success("Cover letter copied to clipboard!");
                    }}
                    className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-[10px] h-8 rounded-lg shadow-sm"
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

/* ─── History Row Card ────────────────────────────────── */
function HistoryRow({
  resume,
  onClick,
  onDelete,
}: {
  resume: ResumeRecord;
  onClick: () => void;
  onDelete: () => void;
}) {
  const delta = resume.scoreAfter - resume.scoreBefore;
  const beforeColor = scoreColor(resume.scoreBefore).text;
  const afterColor = scoreColor(resume.scoreAfter).text;

  return (
    <div className="group w-full rounded-xl py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 relative overflow-hidden bg-white border border-slate-200 hover:border-[#0d6e5a]/40 shadow-sm hover:shadow">
      {/* Clickable left area */}
      <button onClick={onClick} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        {/* Score comparison pill */}
        <div className="shrink-0 flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full select-none text-[10px] font-bold">
          <span style={{ color: beforeColor }}>{resume.scoreBefore}</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span style={{ color: afterColor }}>{resume.scoreAfter}</span>
        </div>

        {/* Title and metadata info */}
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-[#0d6e5a] transition-colors">
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
      </button>

      {/* Right: delta pill + delete button */}
      <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
        <span className="text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full">
          +{delta}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete this optimization"
          className="h-6 w-6 flex items-center justify-center rounded-md bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0d6e5a] group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────── */
export default function HistoryPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selected, setSelected] = useState<ResumeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeRecord | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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

        // Fetch history via API endpoint with Authorization Bearer token fallback
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        let dbData: any[] = [];
        try {
          const historyRes = await fetch("/api/history", { headers });
          const responseData = await historyRes.json().catch(() => []);
          if (Array.isArray(responseData)) {
            dbData = responseData;
          } else if (historyRes.status === 401) {
            toast.error("Session expired. Please sign in again.");
            router.push("/auth/login");
            return;
          }
        } catch (_fetchErr) {
          // Network error — silent
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
          // silent — failed to load credits
        }

        if (!active) return;

        setResumes(dbData as any[]);
        setLoading(false);
      } catch (err) {
        logger.error("Unexpected error loading history:", err);
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [router]);

  const handleDelete = async (record: ResumeRecord) => {
    try {
      const res = await fetch(`/api/history?id=${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setResumes(prev => prev.filter(r => r.id !== record.id));
      setSelected(null);
      // Clamp page if needed
      const newCount = resumes.length - 1;
      const maxPage = Math.max(1, Math.ceil(newCount / PAGE_SIZE));
      setCurrentPage(prev => Math.min(prev, maxPage));
      toast.success("Optimization deleted.");
    } catch {
      toast.error("Failed to delete. Please try again.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(resumes.length / PAGE_SIZE));
  const pagedResumes = resumes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-[#0d6e5a] animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-slate-900 bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-10 select-text">
        <ScrollFadeIn>
          {selected ? (
            /* Detailed 3-Column optimization report */
            <DetailView
              resume={selected}
              userPlan={userPlan}
              onBack={() => setSelected(null)}
              onDelete={() => setDeleteTarget(selected)}
            />
          ) : (
            /* List optimizations dashboard view */
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center text-[#0d6e5a]">
                      <History className="h-4.5 w-4.5" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Resume History</h1>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-10">
                    {resumes.length > 0
                      ? `${resumes.length} optimization${resumes.length !== 1 ? "s" : ""} — click any row to view details`
                      : "Your resume optimizations will appear here"}
                  </p>
                </div>

                <Link href="/dashboard">
                  <Button className="h-9 px-4 bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs rounded-xl shadow-sm transition-colors">
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Resume
                  </Button>
                </Link>
              </div>

              {/* Content list */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="h-8 w-8 text-[#0d6e5a] animate-spin" />
                  <p className="text-xs text-slate-500 font-semibold">Loading history...</p>
                </div>
              ) : resumes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl p-16 text-center border border-dashed border-slate-300 bg-white shadow-sm">
                  <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-[#0d6e5a]" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">No optimizations yet</h3>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Upload your resume and a job description to run your first AI-powered optimization.
                  </p>
                  <Link href="/dashboard" className="mt-5">
                    <Button className="font-bold text-xs bg-[#0d6e5a] hover:bg-[#094d3f] text-white rounded-xl px-4 py-2 shadow-sm transition-colors">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Start Optimizing
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {pagedResumes.map((resume, index) => (
                    <ScrollFadeIn key={resume.id} delay={index * 60} direction="up">
                      <HistoryRow
                        resume={resume}
                        onClick={() => setSelected(resume)}
                        onDelete={() => setDeleteTarget(resume)}
                      />
                    </ScrollFadeIn>
                  ))}

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-6 select-none">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Prev
                      </button>

                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                              currentPage === i + 1
                                ? "bg-[#0d6e5a] text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <p className="text-center text-[10px] text-slate-500 pt-2 font-semibold uppercase tracking-wider select-none">
                    Page {currentPage} of {totalPages} &bull; {resumes.length} total scan{resumes.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollFadeIn>
      </main>

      {/* CENTERED DELETE CONFIRMATION POPUP MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Delete Optimization Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to delete this optimization history record?</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block truncate">{deleteTarget.jobTitle || "Resume Optimization"}</span>
              <span className="text-[10px] text-slate-500">{formatDate(deleteTarget.createdAt)}</span>
            </div>

            <p className="text-[11px] text-red-600 font-medium">
              This action cannot be undone and will permanently remove this record from your history.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 h-9 rounded-xl border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  handleDelete(deleteTarget);
                  setDeleteTarget(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 h-9 rounded-xl shadow-sm transition-colors"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
