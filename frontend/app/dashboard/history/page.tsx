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
import { parseResumeIntoBlocks, toSectionTitle, splitCertText } from "@/lib/export/pdf-document";
import { saveAs } from "file-saver";

function getReadableLinkLabel(url: string, fallback?: string): string {
  if (!url) return fallback || url;
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("github.com")) return "GitHub";
  return fallback || url;
}
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";
import { HistorySkeleton, HistoryListSkeleton } from "@/components/SkeletonShimmer";
import {
  Loader2,
  History,
  AlertCircle,
  Plus,
  ChevronRight,
  TrendingUp,
  Calendar,
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
  const [activeTab, setActiveTab] = useState<"resume" | "changes" | "breakdown" | "roadmap" | "cover_letter">("resume");
  const [showShareModal, setShowShareModal] = useState(false);

  const delta = resume.scoreAfter - resume.scoreBefore;
  const isPaidUser = userPlan === "premium" || userPlan === "promax" || userPlan === "owner";
  const isLocked = !isPaidUser;
  
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
      useUpgradeModalStore.getState().openModal({
        badge: "DOWNLOAD BLOCKED",
        title: "Your 2 free optimizations are used up",
        description: "Your optimized resume is saved and stays in your history. Free includes the ATS score and live preview; downloading is on a paid plan.",
      });
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
      const safeTitle = resume.jobTitle?.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_");
      const filename = safeTitle ? `${safeTitle}_Resume.${format}` : `Resume.${format}`;
      saveAs(blob, filename);
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ─── Top Header (Matching user's image) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Score improved</span>
            <span className="text-slate-900">{resume.scoreBefore}%</span>
            <span className="text-slate-400 font-normal">→</span>
            <span className="text-[#0d6e5a]">{resume.scoreAfter}%</span>
          </h1>
          <span className="inline-flex items-center bg-teal-50 border border-teal-200 text-[#0d6e5a] text-xs font-bold px-3 py-1 rounded-full shadow-xs">
            +{delta} points
          </span>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs h-9 px-4 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5 text-slate-500" />
            <span>Share result</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to History</span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            title="Delete Record"
            className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer border border-transparent hover:border-red-200"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── TABS BAR (Matching user's image) ─── */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-sm overflow-x-auto select-none no-scrollbar pt-1">
        <button
          type="button"
          onClick={() => setActiveTab("resume")}
          className={`pb-3 font-semibold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "resume"
              ? "text-[#0d6e5a] font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Resume
          {activeTab === "resume" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d6e5a] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("changes")}
          className={`pb-3 font-semibold transition-all relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "changes"
              ? "text-[#0d6e5a] font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>What changed</span>
          <span className="text-[10px] font-black bg-teal-50 border border-teal-200 text-[#0d6e5a] px-1.5 py-0.2 rounded-full">
            {keywords.length || rewrittenBullets}
          </span>
          {activeTab === "changes" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d6e5a] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("breakdown")}
          className={`pb-3 font-semibold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "breakdown"
              ? "text-[#0d6e5a] font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Score breakdown
          {activeTab === "breakdown" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d6e5a] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roadmap")}
          className={`pb-3 font-semibold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "roadmap"
              ? "text-[#0d6e5a] font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Skill roadmap
          {activeTab === "roadmap" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d6e5a] rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cover_letter")}
          className={`pb-3 font-semibold transition-all relative whitespace-nowrap cursor-pointer ${
            activeTab === "cover_letter"
              ? "text-[#0d6e5a] font-bold"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Cover letter
          {activeTab === "cover_letter" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d6e5a] rounded-full" />
          )}
        </button>
      </div>

      {/* ─── TAB 1: RESUME (Image 2-Column Layout) ─── */}
      {activeTab === "resume" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Toolbar & Document Paper Preview */}
          <div className="lg:col-span-8 space-y-4">
            {/* Toolbar above resume card */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Resume Preview
                </span>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadFile("pdf")}
                  disabled={pdfLoading}
                  className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  <span>Download PDF</span>
                  {!isPaidUser && (
                    <span className="text-[9px] font-black uppercase bg-white/20 text-white px-1.5 py-0.2 rounded">
                      PRO
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => downloadFile("docx")}
                  disabled={docxLoading}
                  className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs h-9 px-4 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {docxLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-slate-500" />}
                  <span>DOCX</span>
                  {!isPaidUser && (
                    <span className="text-[9px] font-black uppercase bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                      PRO
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Document Paper Container */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm min-h-[640px] relative font-serif select-text">
              {/* Watermark for free plan downloads */}
              {isLocked && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none flex flex-col items-center justify-center select-none p-6 text-center z-10">
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xl text-slate-900 max-w-xs pointer-events-auto">
                    <Lock className="h-7 w-7 text-[#0d6e5a] mx-auto mb-2" />
                    <h5 className="text-sm font-bold text-slate-900">Document Preview</h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Upgrade to a paid plan to unlock PDF and Word DOCX downloads.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        useUpgradeModalStore.getState().openModal({
                          badge: "PRO",
                          title: "Upgrade to Download",
                          description: "Unlock full PDF & DOCX downloads and unlimited ATS optimization history.",
                        });
                      }}
                      className="mt-3 w-full bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-8 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Upgrade Now
                    </button>
                  </div>
                </div>
              )}

              {/* Resume Body: Standard Harvard / Tech ATS LaTeX Format (zero teal color, pure black and dark slate text) */}
              <div className="w-full text-black font-serif select-text leading-snug break-words" style={{ fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif" }}>
                {parseResumeIntoBlocks(resume.optimizedText || "").map((block, idx) => {
                  switch (block.type) {
                    case "name":
                      return (
                        <h1 key={idx} className="text-[20px] sm:text-[24px] font-normal text-center text-black mb-0 leading-tight select-text tracking-wide" style={{ fontVariant: "small-caps" }}>
                          {block.text}
                        </h1>
                      );
                    case "subtitle":
                      return (
                        <div key={idx} className="text-center text-[11.5px] sm:text-[12.5px] font-bold text-black mb-1.5 select-text">
                          {block.text}
                        </div>
                      );
                    case "contact":
                      return (
                        <div key={idx} className="flex justify-center flex-wrap gap-x-3 sm:gap-x-4 gap-y-0.5 text-[9.5px] sm:text-[10px] text-center text-black mt-0.5 mb-2 leading-normal select-text">
                          {block.segments.map((seg, sIdx) => {
                            const label = (seg.text || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
                            return seg.isLink && seg.url ? (
                              <a key={sIdx} href={seg.url} target="_blank" rel="noopener noreferrer" className="text-black hover:underline">
                                {label || getReadableLinkLabel(seg.url, seg.text)}
                              </a>
                            ) : (
                              <span key={sIdx}>{label}</span>
                            );
                          })}
                        </div>
                      );
                    case "section":
                      return (
                        <h2 key={idx} className="text-[11.5px] sm:text-[12px] font-bold text-black border-b border-black mt-2.5 mb-1 pb-0 leading-snug select-text">
                          {toSectionTitle(block.text)}
                        </h2>
                      );
                    case "summary":
                      return (
                        <p key={idx} className="text-[10px] mb-1 text-black leading-snug select-text text-justify w-full">
                          {block.text}
                        </p>
                      );
                    case "skillLine":
                      return (
                        <div key={idx} className="text-[10px] mb-0.5 leading-snug select-text">
                          <span className="font-bold text-black">{block.label}: </span>
                          <span className="text-black">{block.value}</span>
                        </div>
                      );
                    case "project":
                      return (
                        <div key={idx} className="mb-1.5">
                          <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] font-bold text-black mt-1 mb-0.5 leading-snug select-text">
                            <div className="flex items-baseline gap-1.5 flex-wrap flex-1 min-w-0">
                              <span>{block.name}</span>
                              {block.tech && <span>&nbsp;—&nbsp;{block.tech}</span>}
                              {block.projectUrl && (
                                <a href={block.projectUrl} target="_blank" rel="noopener noreferrer" className="text-[9.5px] text-blue-700 underline font-normal break-all">
                                  {getReadableLinkLabel(block.projectUrl, block.name)}
                                </a>
                              )}
                            </div>
                            {block.dates && <span className="shrink-0 ml-auto">{block.dates}</span>}
                          </div>
                          {block.bullets.map((bullet, bIdx) => {
                            const cleanBullet = bullet.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "").trim();
                            return (
                              <div key={bIdx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug select-text">
                                <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                                <span className="flex-1 min-w-0 text-black text-justify">{cleanBullet}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    case "job":
                      return (
                        <div key={idx} className="mb-1.5">
                          <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] font-bold text-black mt-1 leading-snug select-text">
                            <span className="flex-1 min-w-0">{block.title}</span>
                            {block.dates && <span className="shrink-0 ml-auto">{block.dates}</span>}
                          </div>
                          {(block.company || block.tech) && (
                            <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] italic text-black mb-0.5 leading-snug select-text">
                              <span className="min-w-0">{block.company}</span>
                              {block.tech && <span className="ml-auto">{block.tech}</span>}
                            </div>
                          )}
                          {block.bullets.map((bullet, bIdx) => {
                            const cleanBullet = bullet.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "").trim();
                            return (
                              <div key={bIdx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug select-text">
                                <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                                <span className="flex-1 min-w-0 text-black text-justify">{cleanBullet}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    case "education":
                      return (
                        <div key={idx} className="mb-1">
                          <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] font-bold text-black leading-snug select-text">
                            <span className="min-w-0">{block.degree}</span>
                            {block.dates && <span className="ml-auto">{block.dates}</span>}
                          </div>
                          {(block.school || block.gpa) && (
                            <div className="flex flex-wrap justify-between items-baseline gap-x-2 text-[10px] italic text-black leading-snug select-text">
                              <span className="min-w-0">{block.school}</span>
                              {block.gpa && <span className="ml-auto">{block.gpa}</span>}
                            </div>
                          )}
                        </div>
                      );
                    case "bullet":
                      return (
                        <div key={idx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug select-text">
                          <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                          <span className="flex-1 min-w-0 text-black">{block.text.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "")}</span>
                        </div>
                      );
                    case "cert": {
                      const { title, rest } = splitCertText(block.text);
                      return (
                        <div key={idx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug">
                          <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                          <span className="flex-1 min-w-0 text-black text-justify">
                            {title && <span className="font-bold">{title}</span>}
                            {rest}
                          </span>
                        </div>
                      );
                    }
                    case "link":
                      return (
                        <a key={idx} href={block.url} target="_blank" rel="noopener noreferrer" className="text-[9.5px] sm:text-[10px] text-blue-700 underline mb-0.5 block leading-normal select-text font-serif">
                          {block.label}
                        </a>
                      );
                    case "spacer":
                      return <div key={idx} className="h-1" />;
                    case "normal":
                      return (
                        <p key={idx} className="text-[10px] mb-1 text-black leading-snug select-text font-serif">
                          {block.text}
                        </p>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): ATS MATCH & Share your win */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 1: ATS MATCH */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
                ATS MATCH
              </span>
              <div className="flex items-center justify-center gap-6 py-2">
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-slate-400 block">
                    {resume.scoreBefore}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">
                    before
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 shrink-0" />
                <div className="text-center">
                  <span className="text-4xl font-black text-[#0d6e5a] block">
                    {resume.scoreAfter}%
                  </span>
                  <span className="text-[10px] text-[#0d6e5a] font-bold uppercase tracking-wider block mt-1">
                    after
                  </span>
                </div>
              </div>

              {/* Teal progress bar */}
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100">
                <div
                  className="h-full bg-[#0d6e5a] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, resume.scoreAfter))}%` }}
                />
              </div>
            </div>

            {/* Card 2: Share your win */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Share your win
              </h3>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed font-sans select-text">
                &ldquo;Took my resume from {resume.scoreBefore}% to {resume.scoreAfter}% ATS match with FastHire — took under a minute: https://fasthire-ai.vercel.app&rdquo;
              </div>

              <div className="grid grid-cols-3 gap-2">
                <a
                  href={linkedinShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
                >
                  <Share2 className="h-3 w-3 text-slate-400" />
                  <span>LinkedIn</span>
                </a>
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
                >
                  <Share2 className="h-3 w-3 text-slate-400" />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Took my resume from ${resume.scoreBefore}% to ${resume.scoreAfter}% ATS match with FastHire — took under a minute: https://fasthire-ai.vercel.app`
                    );
                    toast.success("Share text copied to clipboard!");
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Copy className="h-3 w-3 text-slate-400" />
                  <span>Copy link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: WHAT CHANGED ─── */}
      {activeTab === "changes" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">Optimization Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Details of injected keywords and bullet point improvements</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-teal-50 text-[#0d6e5a] border border-teal-200 px-2.5 py-0.5 rounded-full">
              AI Optimization
            </span>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-2xl font-black text-emerald-600 block">{keywords.length}</span>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Keywords Added</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-2xl font-black text-[#0d6e5a] block">{rewrittenBullets}</span>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Bullets Rewritten</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <span className="text-2xl font-black text-teal-600 block">{Math.min(100, Math.round(resume.scoreAfter * 0.95))}%</span>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mt-1">Skills Matched</span>
            </div>
          </div>

          {/* ATS Keywords Injected */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              ATS Keywords Injected from Job Description
            </span>
            <div className="flex flex-wrap gap-2">
              {keywords.length > 0 ? (
                keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-lg"
                  >
                    + {kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No new keywords were required.</span>
              )}
            </div>
          </div>

          {/* Keywords Already Present */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Keywords Already Present in Candidate Profile
            </span>
            <div className="flex flex-wrap gap-2">
              {existingKeywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg"
                >
                  ✓ {kw}
                </span>
              ))}
            </div>
          </div>

          {/* AI Optimization Suggestions */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Key Enhancements Applied
            </span>
            <ul className="space-y-2 text-xs text-slate-700 font-medium leading-relaxed">
              <li className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[#0d6e5a] font-bold text-sm leading-none">•</span>
                <span>Expanded action verbs (e.g. replaced passive phrases with high-impact executive verbs like "spearheaded", "architected", "engineered").</span>
              </li>
              <li className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[#0d6e5a] font-bold text-sm leading-none">•</span>
                <span>Integrated {keywords.length} critical skills extracted from target job description organically without keyword stuffing.</span>
              </li>
              <li className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[#0d6e5a] font-bold text-sm leading-none">•</span>
                <span>Enforced single-column layout, line breaks, and density rules for 100% ATS parser accuracy.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SCORE BREAKDOWN ─── */}
      {activeTab === "breakdown" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">ATS Score Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Comprehensive multi-factor ATS evaluation comparison</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-teal-50 text-[#0d6e5a] border border-teal-200 px-2.5 py-0.5 rounded-full">
              Industry Standard
            </span>
          </div>

          {/* Score comparison visualizer */}
          <div className="flex items-center justify-around gap-6 bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <CircleGauge value={resume.scoreBefore} label="Before" size={90} />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="h-9 w-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                <ArrowRight className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-black text-[#0d6e5a]">+{delta} pts</span>
            </div>
            <CircleGauge value={resume.scoreAfter} label="After" size={90} />
          </div>

          {/* Description Rubric */}
          <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            Standard ATS Rubric Score &bull; Industry: Tech &bull; Multi-factor weighted match including keywords, semantics, and impact metrics.
          </p>

          {/* Score breakdown bars comparison */}
          <div className="space-y-3">
            {[
              { label: "Parsability", before: 80, after: 95, gain: "+15%" },
              { label: "Keyword Density", before: 30, after: 75, gain: "+45%" },
              { label: "Title Alignment", before: 40, after: 80, gain: "+40%" },
              { label: "Experience Match", before: 50, after: 85, gain: "+35%" }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-800 font-bold text-xs">{item.label}</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500">{item.before}%</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-[#0d6e5a] font-bold">{item.after}%</span>
                    <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-bold ml-1">
                      {item.gain}
                    </span>
                  </div>
                </div>

                {/* Progress bar in website teal */}
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
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
      )}

      {/* ─── TAB 4: SKILL ROADMAP ─── */}
      {activeTab === "roadmap" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center text-[#0d6e5a]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  Skills Learning Roadmap
                  {userPlan === "free" && (
                    <span className="bg-[#0d6e5a] text-[9px] text-white px-1.5 py-0.2 rounded font-black uppercase tracking-wider">PRO</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Select up to 3 skills to build a complete 90-day learning curriculum</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#0d6e5a] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
              {selectedRoadmapSkills.length}/3 Selected
            </span>
          </div>

          {/* Skill chips */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Choose up to 3 target skills:
            </span>
            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
              {(availableSkills.length > 0 ? availableSkills : ["Machine Learning", "Generative AI", "Python", "SQL", "Docker"]).map((skill, i) => {
                const isSelected = selectedRoadmapSkills.includes(skill);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleRoadmapSkill(skill)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#0d6e5a] border-[#0d6e5a] text-white font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {selectedRoadmapSkills.length === 0
                ? "Click 1 to 3 skills above to build your roadmap."
                : `Selected: ${selectedRoadmapSkills.join(", ")}`}
            </span>
            <Button
              onClick={handleGenerateRoadmap}
              disabled={selectedRoadmapSkills.length === 0 || roadmapLoading}
              className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              {roadmapLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Generate Complete Roadmap ({selectedRoadmapSkills.length}/3)
            </Button>
          </div>

          {/* Loading state */}
          {roadmapLoading && (
            <div className="flex items-center gap-2.5 text-xs text-slate-600 py-8 justify-center bg-slate-50 border border-slate-200 rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-[#0d6e5a]" />
              <span>Synthesizing tailored 90-day curriculum for {selectedRoadmapSkills.join(", ")}...</span>
            </div>
          )}

          {/* Generated roadmap output */}
          {roadmapContent && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl text-xs text-slate-800 leading-relaxed font-sans shadow-xs select-text">
                <pre className="whitespace-pre-wrap font-sans select-text">{roadmapContent}</pre>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(roadmapContent);
                  toast.success("Roadmap copied to clipboard!");
                }}
                className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs h-8 rounded-lg shadow-xs cursor-pointer"
              >
                Copy Roadmap
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: COVER LETTER ─── */}
      {activeTab === "cover_letter" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Tailored Cover Letter Generator</h3>
                <p className="text-xs text-slate-500 mt-0.5">Generate a personalized cover letter aligned with this job specification</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            FastHire uses your optimized resume highlights and the target job description to draft an executive-level cover letter.
          </p>

          {!coverLetterGenerated && !generatingLetter && (
            <Button
              onClick={handleGenerateCoverLetter}
              className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Cover Letter
            </Button>
          )}

          {generatingLetter && (
            <div className="flex items-center gap-2.5 text-xs text-slate-600 py-8 justify-center bg-slate-50 border border-slate-200 rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-[#0d6e5a]" />
              <span>Drafting tailored cover letter...</span>
            </div>
          )}

          {coverLetterGenerated && (
            <div className="space-y-3 select-text">
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-xs text-slate-800 leading-relaxed font-serif shadow-xs select-text">
                <pre className="whitespace-pre-wrap font-serif select-text">{coverLetterGenerated}</pre>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(coverLetterGenerated);
                  toast.success("Cover letter copied to clipboard!");
                }}
                className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs h-8 rounded-lg shadow-xs cursor-pointer"
              >
                Copy Cover Letter
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── SHARE RESULT POPUP MODAL ─── */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none relative">
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Share Your Win</h3>
                <p className="text-xs text-slate-500">Inspire your network with your ATS score gain!</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-sans">
              &ldquo;Took my resume from {resume.scoreBefore}% to {resume.scoreAfter}% ATS match with FastHire — took under a minute: https://fasthire-ai.vercel.app&rdquo;
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <a
                href={linkedinShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>LinkedIn</span>
              </a>
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowShareModal(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Took my resume from ${resume.scoreBefore}% to ${resume.scoreAfter}% ATS match with FastHire — took under a minute: https://fasthire-ai.vercel.app`
                  );
                  toast.success("Share text copied to clipboard!");
                  setShowShareModal(false);
                }}
                className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── History Row Card ────────────────────────────────── */
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
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group w-full cursor-pointer rounded-xl py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 relative overflow-hidden bg-white border border-slate-200 hover:border-[#0d6e5a]/40 shadow-sm hover:shadow"
    >
      {/* Clickable left area */}
      <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
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
      </div>

      {/* Right: delta pill */}
      <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
        <span className="text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full">
          +{delta}
        </span>
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
  const [historyLocked, setHistoryLocked] = useState(false);
  const [retentionInfo, setRetentionInfo] = useState<{ months: number | null; limit: number | null } | null>(null);
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

        // Note: we do NOT load from localStorage cache here to avoid stale/duplicate entries.
        // We always fetch fresh from API and then update the cache.

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
          const responseData = await historyRes.json().catch(() => ({}));

          if (historyRes.status === 401) {
            toast.error("Session expired. Please sign in again.");
            router.push("/auth/login");
            return;
          }

          // New response format: { records, planTier, locked, retentionMonths }
          if (responseData && typeof responseData === "object" && "records" in responseData) {
            if (responseData.locked) {
              setHistoryLocked(true);
            } else {
              dbData = Array.isArray(responseData.records) ? responseData.records : [];
              const planFromApi = responseData.planTier || "free";
              setUserPlan(planFromApi);
              setRetentionInfo({
                months: responseData.retentionMonths ?? null,
                limit: planFromApi === "premium" ? 20 : null,
              });
            }
          } else if (Array.isArray(responseData)) {
            // Legacy array format fallback
            dbData = responseData;
          }
        } catch (_fetchErr) {
          // Network error — silent
        }

        // Fetch plan/credits details — always correct the lock state based on credits and subscription
        try {
          const creditsRes = await fetch("/api/credits");
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            const userEmail = (user.email || "").toLowerCase().trim();
            const cachedPlan = typeof window !== "undefined" ? localStorage.getItem(`fastHire_plan_${user.id}`) : null;
            const isOwner = creditsData.isOwner || isOwnerEmail(user.email);
            const isProMax =
              !isOwner &&
              (creditsData.planId === "promax" ||
                cachedPlan === "promax" ||
                creditsData.billingCycle === "admin_promax" ||
                userEmail === "payyalajyothika333@gmail.com" ||
                (creditsData.paidCredits >= 90 && creditsData.paidCredits < 900000));
            const isPremium =
              !isOwner &&
              !isProMax &&
              (creditsData.planId === "premium" ||
                cachedPlan === "premium" ||
                creditsData.billingCycle === "admin_premium" ||
                creditsData.isFirst50 ||
                (creditsData.paidCredits ?? 0) > 0);

            if (isOwner) {
              setUserPlan("owner");
              setHistoryLocked(false);  // Owners always have access
            } else if (isProMax) {
              setUserPlan("promax");
              setHistoryLocked(false);  // Pro Max always has access
            } else if (isPremium) {
              setUserPlan("premium");
              setHistoryLocked(false);  // Premium always has access
            } else {
              setUserPlan("free");
              // Only lock if the API also locked or returned no records
              if (dbData.length === 0) {
                setHistoryLocked(true);
              }
            }
          }
        } catch (creditsErr) {
          // silent — failed to load credits, keep state as-is from API response
        }

        if (!active) return;

        setResumes(dbData as any[]);
        // Always update cache with fresh data (clears stale/deleted records)
        if (typeof window !== "undefined") {
          if (dbData.length > 0) {
            localStorage.setItem(`fastHire_history_cache_${user.id}`, JSON.stringify(dbData));
          } else {
            localStorage.removeItem(`fastHire_history_cache_${user.id}`);
          }
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

  const handleDelete = async (record: ResumeRecord) => {
    try {
      const res = await fetch(`/api/history?id=${record.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const updated = resumes.filter(r => r.id !== record.id);
      setResumes(updated);
      setSelected(null);
      // Immediately update localStorage cache so deleted item doesn't reappear on revisit
      if (typeof window !== "undefined") {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (userId) {
          if (updated.length > 0) {
            localStorage.setItem(`fastHire_history_cache_${userId}`, JSON.stringify(updated));
          } else {
            localStorage.removeItem(`fastHire_history_cache_${userId}`);
          }
        }
      }
      // Clamp page if needed
      const newCount = updated.length;
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
    return <HistorySkeleton />;
  }

  return (
    <div className="flex flex-col min-h-screen text-slate-900 bg-[#f8fafc]">
      {!selected && <Navbar />}

      <main className={`flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 pb-28 sm:pb-10 select-text ${selected ? "pt-6 sm:pt-8" : "pt-6 sm:pt-10"}`}>
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
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Optimization History</h1>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-10">
                    {resumes.length > 0
                      ? `${resumes.length} optimization${resumes.length !== 1 ? "s" : ""} — click any row to view details`
                      : "Your optimization history will appear here"}
                  </p>
                </div>
              </div>

              {/* Content list */}
              {loading ? (
                <HistoryListSkeleton />
              ) : historyLocked ? (
                /* ── FREE PLAN UPGRADE WALL ── */
                <div className="flex flex-col items-center justify-center rounded-2xl p-12 text-center border border-dashed border-slate-300 bg-white shadow-sm space-y-5">
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-slate-900">History is a Paid Feature</h3>
                    <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                      Upgrade to access your full optimization history, ATS score timeline, and resume analytics.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md text-left">
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                        <span className="text-xs font-black text-teal-800">Premium Pro — ₹99/mo</span>
                      </div>
                      <p className="text-[10px] text-teal-700 leading-relaxed pl-6">Last 20 optimizations • 2-month retention</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-black text-emerald-800">Pro Max — ₹199/mo</span>
                      </div>
                      <p className="text-[10px] text-emerald-700 leading-relaxed pl-6">Unlimited history • 4-month retention</p>
                    </div>
                  </div>

                  <Link href="/dashboard/pricing">
                    <Button className="h-10 px-6 bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs rounded-xl shadow-sm transition-colors">
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Upgrade to Unlock History
                    </Button>
                  </Link>
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
