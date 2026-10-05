"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, FileText, Sparkles, Phone, Mail, Globe } from "lucide-react";
import { toast } from "react-hot-toast";
import { parseResumeIntoBlocks, stripMarkdownAsterisks, getCleanExportFilename, ResumeBlock, toSectionTitle, splitCertText } from "@/lib/export/pdf-document";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";

const LinkedInIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

function getPdfDownloadLimit(plan: string): number {
  if (plan === "promax" || plan === "owner") return 30;
  if (plan === "premium") return 15;
  return 1; // free
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getReadableLinkLabel(url: string, fallback?: string): string {
  if (!url) return fallback || url;
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("github.com")) return "GitHub";
  return fallback || url;
}

interface ResumeViewerProps {
  text: string;
  originalText?: string;
  resumeId: string;
  jobDescription: string;
  userId?: string;
  userPlan?: string;
  jobTitle?: string;
}

export default function ResumeViewer({
  text,
  originalText,
  resumeId,
  jobDescription,
  userId = "",
  userPlan = "free",
  jobTitle = ""
}: ResumeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);

  // Parse blocks for rendering
  const blocks = parseResumeIntoBlocks(text);

  // Set up original words Set for diff highlighting
  const originalClean = (originalText || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const originalWordsSet = new Set(originalClean.split(/\s+/).filter(Boolean));

  // Word-by-word diff highlighter helper
  const renderHighlightedText = (lineText: string) => {
    const cleanLineText = stripMarkdownAsterisks(lineText);
    if (!originalText || originalWordsSet.size === 0) {
      return <span>{cleanLineText}</span>;
    }
    const parts = cleanLineText.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (/^\s+$/.test(part)) {
        return <span key={idx}>{part}</span>;
      }
      const clean = part.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean && !originalWordsSet.has(clean)) {
        return (
          <span
            key={idx}
            className="bg-[#D1FAE5] text-emerald-900 px-0.5 rounded font-normal dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const handleCopy = async () => {
    const cleanText = text.split("\n").map(l => stripMarkdownAsterisks(l)).join("\n");
    await navigator.clipboard.writeText(cleanText);
    setCopied(true);
    toast.success("Optimized resume text copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (userPlan === "free") {
      useUpgradeModalStore.getState().openModal({
        badge: "DOWNLOAD BLOCKED",
        title: "Your 2 free optimizations are used up",
        description: "Your optimized resume is saved and stays in your history. Free includes the ATS score and live preview; downloading is on a paid plan.",
      });
      return;
    }

    // Check monthly PDF download limit
    const pdfLimit = getPdfDownloadLimit(userPlan);
    if (userId && pdfLimit !== Infinity) {
      const storageKey = `fastHire_pdfDownloads_${userId}_${getMonthKey()}`;
      const usedCount = parseInt(localStorage.getItem(storageKey) || "0", 10);
      if (usedCount >= pdfLimit) {
        toast.error(`You've reached your ${pdfLimit} PDF downloads for this month. Upgrade to Pro Max for 30/month.`);
        return;
      }
      localStorage.setItem(storageKey, (usedCount + 1).toString());
    }

    setPdfLoading(true);
    try {
      const response = await fetch("/api/export/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("PDF download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getCleanExportFilename(text, ".pdf", jobTitle);
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

  const handleDownloadDOCX = async () => {
    if (userPlan === "free") {
      useUpgradeModalStore.getState().openModal({
        badge: "DOWNLOAD BLOCKED",
        title: "Your 2 free optimizations are used up",
        description: "Your optimized resume is saved and stays in your history. Free includes the ATS score and live preview; downloading is on a paid plan.",
      });
      return;
    }

    setDocxLoading(true);
    try {
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, text }),
      });

      if (!response.ok) throw new Error("DOCX download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getCleanExportFilename(text, ".docx", jobTitle);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("DOCX Downloaded successfully! 📝");
    } catch (err: any) {
      toast.error(err.message || "Failed to download DOCX.");
    } finally {
      setDocxLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Top Header Panel */}
      <div className="bg-slate-50 px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#0d6e5a] shrink-0" />
          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">Optimized Resume Preview</h3>
        </div>

        {/* Action Downloads / Copy */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5 sm:py-2 rounded-lg transition-all text-slate-600 hover:text-slate-900 border border-slate-200 bg-white h-8 sm:h-9"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>

          <Button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className={`flex-1 sm:flex-initial text-xs h-8 sm:h-9 rounded-lg flex items-center justify-center gap-1.5 px-3 sm:px-4 cursor-pointer font-bold ${
              userPlan === "free"
                ? "bg-slate-100 text-slate-400 hover:bg-slate-200"
                : "bg-[#0d6e5a] hover:bg-[#0a5a49] text-white"
            }`}
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            <span>PDF</span>
            {userPlan === "free" && (
              <span className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase px-1 rounded">
                PRO
              </span>
            )}
          </Button>

          <Button
            onClick={handleDownloadDOCX}
            disabled={docxLoading}
            variant={userPlan === "free" ? "ghost" : "outline"}
            className={`flex-1 sm:flex-initial text-xs h-8 sm:h-9 rounded-lg flex items-center justify-center gap-1.5 px-3 sm:px-4 cursor-pointer font-bold ${
              userPlan === "free"
                ? "bg-slate-100 text-slate-400 hover:bg-slate-200 border-none"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-transparent"
            }`}
          >
            {docxLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            <span>DOCX</span>
            {userPlan === "free" && (
              <span className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase px-1 rounded">
                PRO
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Workspace Display Area */}
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto max-h-[650px] bg-slate-50 select-text">
        {/* Render visual styling matching the LaTeX-style PDF engine output */}
        <div
          className="w-full max-w-4xl mx-auto bg-white text-black border border-slate-200 rounded-lg sm:rounded-xl p-3.5 sm:p-6 md:p-10 shadow-md sm:shadow-2xl font-serif select-text relative leading-snug break-words"
          style={{ fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif" }}
        >
          {blocks.map((block, idx) => {
            switch (block.type) {
              case "name":
                return (
                  <h1
                    key={idx}
                    className="text-[20px] sm:text-[24px] font-normal text-center text-black mb-0 leading-tight select-text tracking-wide"
                    style={{ fontVariant: "small-caps" }}
                  >
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
                  <div key={idx} className="flex justify-center items-center flex-wrap gap-y-0.5 gap-x-3 sm:gap-x-4 text-[9.5px] sm:text-[10px] text-center text-black mt-0.5 mb-2 leading-normal select-text">
                    {block.segments.map((seg, sIdx) => {
                      const lower = (seg.text || "").toLowerCase() + " " + (seg.url || "").toLowerCase();
                      let IconComponent: React.ComponentType<{ className?: string }> = Globe;
                      if (seg.text.includes('@') || lower.includes('@')) IconComponent = Mail;
                      else if (/\+?\d[\d\s\-\(\)]{7,}/.test(seg.text)) IconComponent = Phone;
                      else if (lower.includes('linkedin')) IconComponent = LinkedInIcon;
                      else if (lower.includes('github')) IconComponent = GitHubIcon;

                      const cleanHandle = seg.text.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '').replace(/^mailto:/, '').replace(/^tel:/, '');

                      const el = seg.isLink && seg.url ? (
                        <a key={sIdx} href={seg.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-900">
                          {cleanHandle}
                        </a>
                      ) : (
                        <span key={sIdx}>{cleanHandle}</span>
                      );

                      return (
                        <div key={sIdx} className="inline-flex items-center gap-1">
                          <IconComponent className="h-2.5 w-2.5 text-black shrink-0" />
                          {el}
                        </div>
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
              case "summary": {
                const cleanText = block.text.trim();
                return (
                  <p
                    key={idx}
                    className="text-[10px] mb-1 text-black leading-snug select-text text-justify w-full"
                    style={{ textAlign: "justify", textJustify: "inter-word", hyphens: "none" }}
                  >
                    {renderHighlightedText(cleanText)}
                  </p>
                );
              }
              case "skillLine":
                return (
                  <div key={idx} className="text-[10px] mb-0.5 leading-snug select-text">
                    <span className="font-bold text-black">{block.label}: </span>
                    <span className="text-black" style={{ hyphens: "none" }}>{renderHighlightedText(block.value)}</span>
                  </div>
                );
              case "project":
                return (
                  <div key={idx} className="mb-1.5">
                    <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] font-bold text-black mt-1 mb-0.5 leading-snug select-text">
                      <div className="flex items-baseline gap-1.5 flex-wrap flex-1 min-w-0">
                        <span>{block.name}</span>
                        {block.tech && (
                          <span className="font-bold text-black">&nbsp;—&nbsp;{renderHighlightedText(block.tech)}</span>
                        )}
                        {block.projectUrl && (
                          <a href={block.projectUrl} target="_blank" rel="noopener noreferrer" className="text-[9.5px] text-blue-700 underline font-normal break-all">
                            {getReadableLinkLabel(block.projectUrl, block.name)}
                          </a>
                        )}
                      </div>
                      {(block as any).dates ? (
                        <span className="font-bold text-black shrink-0 ml-auto">{(block as any).dates}</span>
                      ) : null}
                    </div>
                    {block.bullets.map((bullet, bIdx) => {
                      const cleanBullet = bullet.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "").trim();
                      return (
                        <div key={bIdx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug select-text">
                          <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                          <span className="flex-1 min-w-0 text-black text-justify">{renderHighlightedText(cleanBullet)}</span>
                        </div>
                      );
                    })}
                  </div>
                );

              case "job":
                return (
                  <div key={idx} className="mb-1.5">
                    <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] font-bold text-black mt-1 leading-snug select-text">
                      <span className="flex-1 min-w-0">{renderHighlightedText(block.title)}</span>
                      <span className="font-bold text-black shrink-0 ml-auto">{renderHighlightedText(block.dates)}</span>
                    </div>
                    {(block.company || (block as any).tech) ? (
                      <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] italic text-black mb-0.5 leading-snug select-text">
                        <span className="min-w-0">{renderHighlightedText(block.company || "")}</span>
                        {(block as any).tech ? <span className="ml-auto">{renderHighlightedText((block as any).tech)}</span> : null}
                      </div>
                    ) : null}
                    {block.bullets.map((bullet, bIdx) => {
                      const cleanBullet = bullet.replace(/^\s*([•\-\*–—+•\u2022\u25cf\u2043▸►→]|\d+\.)\s*/, "").trim();
                      return (
                        <div key={bIdx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug select-text">
                          <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                          <span className="flex-1 min-w-0 text-black text-justify">{renderHighlightedText(cleanBullet)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              case "education":
                return (
                  <div key={idx} className="mb-1">
                    <div className="flex flex-row flex-wrap justify-between items-baseline gap-x-2 text-[10px] font-bold text-black leading-snug select-text">
                      <span className="min-w-0">{renderHighlightedText(block.degree)}</span>
                      <span className="font-bold text-black ml-auto">{renderHighlightedText(block.dates)}</span>
                    </div>
                    <div className="flex flex-wrap justify-between items-baseline gap-x-2 text-[10px] italic text-black leading-snug select-text">
                      <span className="min-w-0">{renderHighlightedText(block.school)}</span>
                      <span className="ml-auto">{renderHighlightedText(block.gpa)}</span>
                    </div>
                  </div>
                );
              case "bullet":
                return (
                  <div key={idx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug select-text">
                    <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                    <span className="flex-1 min-w-0 text-black">{renderHighlightedText(block.text)}</span>
                  </div>
                );
              case "cert": {
                const { title, rest } = splitCertText(block.text);
                return (
                  <div key={idx} className="flex items-start text-[10px] mb-px pl-2 sm:pl-3 leading-snug">
                    <span className="w-2.5 sm:w-3 shrink-0 select-none text-black">•</span>
                    <span className="flex-1 min-w-0 text-black text-justify">
                      {title ? <span className="font-bold">{title}</span> : null}
                      {renderHighlightedText(rest)}
                    </span>
                  </div>
                );
              }
              case "link":
                return (
                  <a key={idx} href={block.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline mb-0.5 block leading-normal select-text font-serif">
                    {block.label}
                  </a>
                );
              case "spacer":
                return <div key={idx} className="h-1" />;
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
