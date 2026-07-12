"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, FileText, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { parseResumeIntoBlocks, ResumeBlock } from "@/lib/export/pdf-document";

interface ResumeViewerProps {
  text: string;
  originalText?: string;
  resumeId: string;
  jobDescription: string;
}

export default function ResumeViewer({
  text,
  originalText,
  resumeId,
  jobDescription
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
    if (!originalText || originalWordsSet.size === 0) {
      return <span>{lineText}</span>;
    }
    const parts = lineText.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (/^\s+$/.test(part)) {
        return <span key={idx}>{part}</span>;
      }
      const clean = part.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean && !originalWordsSet.has(clean)) {
        return (
          <span
            key={idx}
            className="bg-[#D1FAE5] text-emerald-900 px-0.5 rounded font-semibold dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Optimized resume text copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
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
      link.download = "resume-optimized-fasthire.pdf";
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
      link.download = "resume-optimized-fasthire.docx";
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
    <div className="bg-[#0b0c1e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Top Header Panel */}
      <div className="bg-[#0f112a] px-5 py-4 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-violet-400" />
          <h3 className="font-extrabold text-white text-sm">Optimized Resume Preview</h3>
        </div>

        {/* Action Downloads / Copy */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all text-slate-400 hover:text-white border border-white/5 bg-[#0b1c30] h-9"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>

          <Button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 px-4"
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4" />}
            Download PDF
          </Button>

          <Button
            onClick={handleDownloadDOCX}
            disabled={docxLoading}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 px-4 bg-transparent"
          >
            {docxLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-4 w-4" />}
            Download DOCX
          </Button>
        </div>
      </div>

      {/* Workspace Display Area */}
      <div className="flex-1 p-6 overflow-y-auto max-h-[650px] bg-[#070814] select-text">
        {/* Render visual styling matching the LaTeX-style PDF engine output */}
        <div className="w-full max-w-4xl mx-auto bg-white text-slate-900 border border-slate-200 rounded-xl p-8 shadow-2xl font-serif select-text relative leading-normal">
          {blocks.map((block, idx) => {
            switch (block.type) {
              case "name":
                return (
                  <h1 key={idx} className="text-xl font-bold text-center text-black mb-1 leading-normal select-text font-serif">
                    {block.text}
                  </h1>
                );
              case "contact":
                return (
                  <div key={idx} className="flex justify-center flex-wrap text-[9.5px] text-center text-slate-600 mb-3 leading-normal select-text font-serif">
                    {block.segments.map((seg, sIdx) => {
                      const el = seg.isLink && seg.url ? (
                        <a key={sIdx} href={seg.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          {seg.text}
                        </a>
                      ) : (
                        <span key={sIdx}>{seg.text}</span>
                      );
                      if (sIdx < block.segments.length - 1) {
                        return (
                          <React.Fragment key={sIdx}>
                            {el}
                            <span className="mx-1 text-slate-400">—</span>
                          </React.Fragment>
                        );
                      }
                      return el;
                    })}
                  </div>
                );
              case "section":
                return (
                  <h2 key={idx} className="text-xs font-bold text-black border-b border-black mt-3 mb-1.5 pb-0.5 leading-normal select-text font-serif">
                    {block.text}
                  </h2>
                );
              case "summary":
                return (
                  <p key={idx} className="text-[10px] mb-1 text-slate-800 leading-normal select-text font-serif">
                    {renderHighlightedText(block.text)}
                  </p>
                );
              case "skillLine":
                return (
                  <div key={idx} className="flex text-[10px] mb-1 leading-normal select-text font-serif">
                    <span className="font-bold text-black w-[140px] shrink-0">{block.label}:</span>
                    <span className="text-slate-800 flex-1">{renderHighlightedText(block.value)}</span>
                  </div>
                );
              case "project":
                return (
                  <div key={idx} className="mb-2">
                    <div className="flex justify-between text-[10.5px] font-bold text-black mb-0.5 leading-normal select-text font-serif">
                      <div className="flex items-center gap-1.5">
                        <span>{block.name}</span>
                        {block.projectUrl && (
                          <a href={block.projectUrl} target="_blank" rel="noopener noreferrer" className="text-[9.5px] text-blue-600 underline font-normal">
                            {block.projectUrl}
                          </a>
                        )}
                      </div>
                      {block.tech && (
                        <span className="font-normal italic text-slate-600">{renderHighlightedText(block.tech)}</span>
                      )}
                    </div>
                    {block.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start text-[10px] mb-0.5 pl-3 leading-normal select-text font-serif">
                        <span className="w-3 shrink-0 select-none text-black font-serif">•</span>
                        <span className="flex-1 text-slate-800 font-serif">{renderHighlightedText(bullet)}</span>
                      </div>
                    ))}
                  </div>
                );
              case "job":
                return (
                  <div key={idx} className="mb-2">
                    <div className="flex justify-between text-[10.5px] font-bold text-black mb-0.5 leading-normal select-text font-serif">
                      <span>{renderHighlightedText(block.title)}</span>
                      <span className="font-normal text-slate-700">{renderHighlightedText(block.dates)}</span>
                    </div>
                    <div className="text-[10px] italic text-slate-700 mb-1 leading-normal select-text font-serif">
                      {renderHighlightedText(block.company)}
                    </div>
                    {block.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start text-[10px] mb-0.5 pl-3 leading-normal select-text font-serif">
                        <span className="w-3 shrink-0 select-none text-black font-serif">•</span>
                        <span className="flex-1 text-slate-800 font-serif">{renderHighlightedText(bullet)}</span>
                      </div>
                    ))}
                  </div>
                );
              case "education":
                return (
                  <div key={idx} className="mb-2">
                    <div className="flex justify-between text-[10.5px] font-bold text-black mb-0.5 leading-normal select-text font-serif">
                      <span>{renderHighlightedText(block.degree)}</span>
                      <span className="font-normal text-slate-700">{renderHighlightedText(block.dates)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-800 leading-normal select-text font-serif">
                      <span>{renderHighlightedText(block.school)}</span>
                      <span>{renderHighlightedText(block.gpa)}</span>
                    </div>
                  </div>
                );
              case "bullet":
                return (
                  <div key={idx} className="flex items-start text-[10px] mb-0.5 pl-3 leading-normal select-text font-serif">
                    <span className="w-3 shrink-0 select-none text-black font-serif">•</span>
                    <span className="flex-1 text-slate-800 font-serif">{renderHighlightedText(block.text)}</span>
                  </div>
                );
              case "cert":
                return (
                  <div key={idx} className="text-[10px] text-slate-800 mb-0.5 leading-normal select-text font-serif">
                    {renderHighlightedText(block.text)}
                  </div>
                );
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
