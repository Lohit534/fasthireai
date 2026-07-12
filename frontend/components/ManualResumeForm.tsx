"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Mail, Phone, MapPin, Link2, ExternalLink, 
  Sparkles, Download, CheckCircle2, AlertTriangle, Eye, Loader2, ArrowLeft,
  Check, Copy, Code, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { parseResumeIntoBlocks, parseLaTeXToPlainText } from "@/lib/export/pdf-document";
import { convertBlocksToLaTeX } from "@/components/ResumeViewer";

interface ManualResumeFormProps {
  resumeText: string;
  jobDescription: string;
  beforeScore: number;
  missingKeywords: string[];
  resumeId: string;
  onSwitchToAI: (editedText: string) => void;
  onBackToEditor: () => void;
}

export default function ManualResumeForm({
  resumeText,
  jobDescription,
  beforeScore,
  missingKeywords: initialMissingKeywords,
  resumeId,
  onSwitchToAI,
  onBackToEditor
}: ManualResumeFormProps) {
  // Current text being edited (Overleaf style LaTeX code)
  const [currentText, setCurrentText] = useState(() => {
    const initialBlocks = parseResumeIntoBlocks(resumeText);
    const nameBlock = initialBlocks.find(n => n.type === "name");
    const contactBlock = initialBlocks.find(n => n.type === "contact");
    const nameText = nameBlock && nameBlock.type === "name" ? nameBlock.text : "Resume Document";
    const contactText = contactBlock && contactBlock.type === "contact"
      ? contactBlock.segments.map(s => s.text).join(" | ")
      : "";
    return convertBlocksToLaTeX(nameText, contactText, initialBlocks);
  });

  // Keyword analysis states
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>(initialMissingKeywords);
  const [score, setScore] = useState<number>(beforeScore);
  const [isScoring, setIsScoring] = useState(false);
  
  // Download states
  const [pdfLoading, setPdfLoading] = useState(false);

  // Run ATS scorer to extract matched/missing keywords on mount or text changes
  useEffect(() => {
    if (!currentText.trim()) {
      setScore(beforeScore);
      setMissingKeywords(initialMissingKeywords);
      setMatchedKeywords([]);
      return;
    }

    const fetchLatestScores = async () => {
      setIsScoring(true);
      try {
        const plainText = parseLaTeXToPlainText(currentText);
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText: plainText, jobDescription })
        });
        if (res.ok) {
          const scoreData = await res.json();
          setScore(scoreData.overall);
          setMissingKeywords(scoreData.missingKeywords || []);
          
          // Compute matched keywords
          const originalKeywords = initialMissingKeywords;
          const currentMissing = scoreData.missingKeywords || [];
          const matched = originalKeywords.filter(k => !currentMissing.includes(k));
          setMatchedKeywords(matched);
        }
      } catch (err) {
        console.error("ATS score fetch failed:", err);
      } finally {
        setIsScoring(false);
      }
    };

    const debounceScore = setTimeout(fetchLatestScores, 1000);
    return () => clearTimeout(debounceScore);
  }, [currentText]);

  // Click badge to append to Skills section helper
  const handleKeywordClick = (word: string) => {
    let newText = currentText;
    const lines = newText.split('\n');
    let skillLineIndex = -1;
    
    // Find the technical skills heading
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      if (lineLower.includes("technical skills") || lineLower.includes("skills")) {
        skillLineIndex = i;
        break;
      }
    }
    
    if (skillLineIndex !== -1) {
      // Look for the next non-empty line or edit the heading line itself
      let targetIndex = skillLineIndex;
      for (let j = skillLineIndex + 1; j < Math.min(lines.length, skillLineIndex + 4); j++) {
        if (lines[j].trim() && !lines[j].toLowerCase().includes("experience") && !lines[j].toLowerCase().includes("projects")) {
          targetIndex = j;
        }
      }
      
      const line = lines[targetIndex];
      if (!line.toLowerCase().includes(word.toLowerCase())) {
        lines[targetIndex] = line.trim() ? `${line.trim()}, ${word}` : word;
        newText = lines.join('\n');
        toast.success(`Appended "${word}" to skills section!`);
      } else {
        toast.error(`"${word}" is already in skills.`);
      }
    } else {
      // Append new skills section at the bottom
      newText = `${newText.trim()}\n\nTECHNICAL SKILLS\n${word}`;
      toast.success(`Created TECHNICAL SKILLS section with "${word}"!`);
    }
    setCurrentText(newText);
  };

  // Direct PDF download from current text data
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const plainText = parseLaTeXToPlainText(currentText);
      const response = await fetch("/api/export/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainText }),
      });

      if (!response.ok) throw new Error("PDF download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "manual-resume.pdf";
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

  const handleOptimizeAI = () => {
    const plainText = parseLaTeXToPlainText(currentText);
    onSwitchToAI(plainText);
  };

  const inspectATSCompliance = () => {
    const issues: { id: string; type: "success" | "warning" | "error"; msg: string }[] = [];
    const blocks = parseResumeIntoBlocks(currentText);

    // 1. Name check
    const nameBlock = blocks.find(b => b.type === "name");
    if (!nameBlock || !nameBlock.text.trim()) {
      issues.push({ id: "name", type: "error", msg: "Full Name is missing (critical for resume header)." });
    }

    // 2. Contact details check
    const contactBlock = blocks.find(b => b.type === "contact");
    if (!contactBlock) {
      issues.push({ id: "contact_missing", type: "error", msg: "Contact info (email, phone, location) is missing." });
    } else {
      const segments = contactBlock.type === "contact" ? contactBlock.segments : [];
      const hasEmail = segments.some(s => s.url && s.url.startsWith("mailto:"));
      const hasPhone = segments.some(s => s.url && s.url.startsWith("tel:"));
      const hasLinks = segments.some(s => s.isLink && !s.url?.startsWith("mailto:") && !s.url?.startsWith("tel:"));
      
      if (!hasEmail) {
        issues.push({ id: "email", type: "error", msg: "Provide a valid email address." });
      }
      if (!hasPhone) {
        issues.push({ id: "phone", type: "warning", msg: "Phone number is missing or invalid." });
      }
      if (!hasLinks) {
        issues.push({ id: "contact_pipes", type: "warning", msg: "Include links (LinkedIn/GitHub) in your contact header." });
      }
    }

    // 3. Dates format check
    let datePatternError = false;
    let missingDates = false;
    let shortTenureWarning = false;

    blocks.forEach((block) => {
      if (block.type === "job") {
        if (!block.dates || !block.dates.trim()) {
          missingDates = true;
        } else {
          const matchesFormat = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2})/i.test(block.dates);
          if (!matchesFormat) {
            datePatternError = true;
          }
        }
        
        if (block.title.toLowerCase().includes("intern") || block.company.toLowerCase().includes("intern") ||
            block.title.toLowerCase().includes("internship") || block.company.toLowerCase().includes("internship")) {
          if (block.bullets.length < 2) {
            shortTenureWarning = true;
          }
        }
      }
    });

    if (missingDates) {
      issues.push({ id: "dates_missing", type: "error", msg: "Some experience entries are missing start/end dates." });
    }
    if (datePatternError) {
      issues.push({ id: "date_pattern", type: "warning", msg: "Use standard dates (e.g., 'Jan 2022 – Present') for ATS parsing." });
    }
    if (shortTenureWarning) {
      issues.push({ id: "short_tenure", type: "warning", msg: "Internship bullets should detail exact deliverables and tech used." });
    }

    // 4. Project tech stack check
    let projectMissingTech = false;
    blocks.forEach((block) => {
      if (block.type === "project") {
        if (!block.tech || !block.tech.trim()) {
          projectMissingTech = true;
        }
      }
    });
    if (projectMissingTech) {
      issues.push({ id: "proj_tech", type: "warning", msg: "List project technologies stack separated by pipe (e.g. 'Project Name | React, Node')." });
    }

    // 5. Bullet sentence Action Verbs and metrics checklist
    const STRONG_ACTION_VERBS = [
      "designed", "developed", "implemented", "managed", "led", "created", 
      "built", "engineered", "optimized", "reduced", "increased", "automated", 
      "refactored", "scaled", "collaborated", "coordinated", "improved", 
      "accelerated", "accomplished", "achieved", "analyzed", "delivered", 
      "established", "formulated", "generated", "launched", "maximized", 
      "pioneered", "restructured", "streamlined", "transformed"
    ];

    let missingActionVerb = false;
    let missingMetrics = false;
    let hasBullets = false;

    const checkBulletText = (bText: string) => {
      hasBullets = true;
      const clean = bText.replace(/^[•\-\*–\s]+/, "").trim();
      const firstWord = clean.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "";
      
      if (firstWord && !STRONG_ACTION_VERBS.includes(firstWord)) {
        missingActionVerb = true;
      }
      if (!/\d+/.test(clean)) {
        missingMetrics = true;
      }
    };

    blocks.forEach((block) => {
      if (block.type === "bullet") {
        checkBulletText(block.text);
      } else if (block.type === "job") {
        block.bullets.forEach(checkBulletText);
      } else if (block.type === "project") {
        block.bullets.forEach(checkBulletText);
      }
    });

    if (hasBullets) {
      if (missingActionVerb) {
        issues.push({ 
          id: "action_verb", 
          type: "warning", 
          msg: "Start bullets with a strong Action Verb (e.g. 'Developed', 'Optimized')." 
        });
      }
      if (missingMetrics) {
        issues.push({ 
          id: "metrics", 
          type: "warning", 
          msg: "Add numerical metrics (e.g. percentages or values) to prove bullet impact." 
        });
      }
    } else {
      issues.push({ id: "no_bullets", type: "error", msg: "Add bullet points detailing experience or project outcomes." });
    }

    // 6. Skills count check
    let skillsCount = 0;
    blocks.forEach((block) => {
      if (block.type === "skillLine") {
        const list = block.value.split(",").map(s => s.trim()).filter(Boolean);
        skillsCount += list.length;
      }
    });
    if (skillsCount < 5) {
      issues.push({ id: "skills_count", type: "warning", msg: "List at least 5-10 key technical skills relevant to the role." });
    }

    if (issues.length === 0) {
      issues.push({ id: "perfect", type: "success", msg: "Your resume code meets all standard ATS parsing formatting! 🎉" });
    }

    return issues;
  };

  const plainText = parseLaTeXToPlainText(currentText);
  const blocks = parseResumeIntoBlocks(plainText);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0e0f21] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToEditor}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              ✏️ Overleaf-Style manual Editor
              {isScoring ? (
                <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
              ) : (
                <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold px-2 py-0.5 rounded">
                  ATS Score: {score} 🎯
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 font-medium">Replace code, adjust text formatting, and preview layouts in real-time.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-9 rounded-xl flex items-center gap-1.5 px-4"
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch min-h-[750px]">
        {/* Left Side: Code Editor (5/12) */}
        <div className="xl:col-span-5 flex flex-col bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Code className="h-4 w-4 text-cyan-400" />
              Text Editor
            </span>
          </div>
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            className="w-full flex-1 min-h-[600px] bg-[#030712] text-slate-100 border border-white/5 rounded-xl p-5 font-mono text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none resize-none leading-relaxed select-text"
            placeholder="Type or paste your resume content here..."
          />
        </div>

        {/* Middle Side: Live Styled Preview (4/12) */}
        <div className="xl:col-span-4 flex flex-col bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-4 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-cyan-400" />
              styled Preview
            </span>
          </div>

          <div className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl p-6 shadow-md font-serif select-text relative leading-normal overflow-y-auto">
            {blocks.map((block, idx) => {
              switch (block.type) {
                case "name":
                  return (
                    <h1 key={idx} className="text-lg font-bold text-center text-black mb-0.5 leading-normal select-text font-serif">
                      {block.text}
                    </h1>
                  );
                case "contact":
                  return (
                    <div key={idx} className="flex justify-center flex-wrap text-[9px] text-center text-slate-600 mb-2 leading-normal select-text font-serif">
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
                    <h2 key={idx} className="text-[11px] font-bold text-black border-b border-black mt-2 mb-1 pb-0.5 leading-normal select-text font-serif">
                      {block.text}
                    </h2>
                  );
                case "summary":
                  return (
                    <p key={idx} className="text-[9.5px] mb-0.5 text-slate-800 leading-normal select-text font-serif">
                      {block.text}
                    </p>
                  );
                case "skillLine":
                  return (
                    <div key={idx} className="flex text-[9.5px] mb-0.5 leading-normal select-text font-serif">
                      <span className="font-bold text-black w-[120px] shrink-0">{block.label}:</span>
                      <span className="text-slate-800 flex-1">{block.value}</span>
                    </div>
                  );
                case "project":
                  return (
                    <div key={idx} className="mb-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-black mb-0.5 leading-normal select-text font-serif">
                        <div className="flex items-center gap-1">
                          <span>{block.name}</span>
                          {block.projectUrl && (
                            <a href={block.projectUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 underline font-normal">
                              {block.projectUrl}
                            </a>
                          )}
                        </div>
                        {block.tech && (
                          <span className="font-normal italic text-slate-600">{block.tech}</span>
                        )}
                      </div>
                      {block.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start text-[9.5px] mb-0.5 pl-3 leading-normal select-text font-serif">
                          <span className="w-2.5 shrink-0 select-none text-black">•</span>
                          <span className="flex-1 text-slate-800">{bullet}</span>
                        </div>
                      ))}
                    </div>
                  );
                case "job":
                  return (
                    <div key={idx} className="mb-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-black mb-0.5 leading-normal select-text font-serif">
                        <span>{block.title}</span>
                        <span className="font-normal text-slate-700">{block.dates}</span>
                      </div>
                      <div className="text-[9.5px] italic text-slate-700 mb-0.5 leading-normal select-text font-serif">
                        {block.company}
                      </div>
                      {block.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start text-[9.5px] mb-0.5 pl-3 leading-normal select-text font-serif">
                          <span className="w-2.5 shrink-0 select-none text-black">•</span>
                          <span className="flex-1 text-slate-800">{bullet}</span>
                        </div>
                      ))}
                    </div>
                  );
                case "education":
                  return (
                    <div key={idx} className="mb-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-black mb-0.5 leading-normal select-text font-serif">
                        <span>{block.degree}</span>
                        <span className="font-normal text-slate-700">{block.dates}</span>
                      </div>
                      <div className="flex justify-between text-[9.5px] text-slate-800 leading-normal select-text font-serif">
                        <span>{block.school}</span>
                        <span>{block.gpa}</span>
                      </div>
                    </div>
                  );
                case "bullet":
                  return (
                    <div key={idx} className="flex items-start text-[9.5px] mb-0.5 pl-3 leading-normal select-text font-serif">
                      <span className="w-2.5 shrink-0 select-none text-black">•</span>
                      <span className="flex-1 text-slate-800">{block.text}</span>
                    </div>
                  );
                case "cert":
                  return (
                    <div key={idx} className="text-[9.5px] text-slate-800 mb-0.5 leading-normal select-text font-serif">
                      {block.text}
                    </div>
                  );
                case "link":
                  return (
                    <a key={idx} href={block.url} target="_blank" rel="noopener noreferrer" className="text-[9.5px] text-blue-600 underline mb-0.5 block leading-normal select-text font-serif">
                      {block.label}
                    </a>
                  );
                case "spacer":
                  return <div key={idx} className="h-0.5" />;
                case "normal":
                  return (
                    <p key={idx} className="text-[9.5px] mb-0.5 text-slate-800 leading-normal select-text font-serif">
                      {block.text}
                    </p>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </div>

        {/* Right Side: Guidance & Keywords (3/12) */}
        <div className="xl:col-span-3 space-y-4 max-h-[750px] overflow-y-auto">
          {/* ATS Inspector Card */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">ATS Inspector</h4>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-normal">
              Real-time inspection of your code/text content against standard ATS parsing guidelines:
            </p>

            <div className="space-y-3">
              {inspectATSCompliance().map((issue) => {
                const iconColor = 
                  issue.type === "success" ? "text-emerald-400 bg-emerald-500/10" :
                  issue.type === "warning" ? "text-amber-400 bg-amber-500/10" :
                  "text-rose-400 bg-rose-500/10";
                
                return (
                  <div key={issue.id} className="flex gap-2.5 items-start text-left">
                    <span className={`h-4.5 w-4.5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${iconColor}`}>
                      {issue.type === "success" ? "✓" : issue.type === "warning" ? "!" : "✗"}
                    </span>
                    <span className="text-[10px] text-slate-300 leading-normal font-medium">
                      {issue.msg}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missing Keywords Box */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">Missing JD Keywords ({missingKeywords.length})</h4>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-normal">
              Click any keyword badge below to automatically append it to your **Skills** section!
            </p>

            <div className="flex flex-wrap gap-1.5">
              {missingKeywords.length > 0 ? (
                missingKeywords.map(word => (
                  <button
                    key={word}
                    onClick={() => handleKeywordClick(word)}
                    className="text-[10px] font-bold py-1 px-2.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                  >
                    + {word}
                  </button>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 italic">No missing keywords found! Nice job! 🎉</span>
              )}
            </div>
          </div>

          {/* Matched Keywords Box */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">Matched JD Keywords ({matchedKeywords.length})</h4>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {matchedKeywords.length > 0 ? (
                matchedKeywords.map(word => (
                  <span
                    key={word}
                    className="text-[10px] font-semibold py-1 px-2.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 select-none"
                  >
                    {word}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 italic">Add missing keywords in the editor to start matching.</span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">Actions</h4>
            <Button
              onClick={handleOptimizeAI}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/10"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              Optimize with AI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
