"use client";

import React, { useState, useEffect } from "react";
import { 
  User, Mail, Phone, MapPin, Link2, ExternalLink, 
  Plus, Trash2, ChevronDown, ChevronUp, FileText, 
  Sparkles, Download, CheckCircle2, AlertTriangle, Eye, Loader2, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { parseResumeIntoBlocks, ResumeBlock } from "@/lib/export/pdf-document";

interface ManualResumeFormProps {
  resumeText: string;
  jobDescription: string;
  beforeScore: number;
  missingKeywords: string[];
  resumeId: string;
  onSwitchToAI: (editedText: string) => void;
  onBackToEditor: () => void;
}

interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  current: boolean;
  location: string;
  bullets: string;
}

interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  year: string;
  gpa: string;
}

interface ProjectEntry {
  id: string;
  name: string;
  technologies: string;
  description: string;
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
  // Collapsible section state (expanded by default for Personal, others collapsed/toggleable)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true,
    summary: false,
    experience: false,
    education: false,
    projects: false,
    skills: false
  });

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Form Fields State
  const [personal, setPersonal] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: ""
  });

  const [summary, setSummary] = useState("");
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [educations, setEducations] = useState<EducationEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [skillsText, setSkillsText] = useState("");

  // Keyword analysis states
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>(initialMissingKeywords);
  const [score, setScore] = useState<number>(beforeScore);
  const [isScoring, setIsScoring] = useState(false);

  // Preview Modal / Slideover state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  
  // Download states
  const [pdfLoading, setPdfLoading] = useState(false);

  const inspectATSCompliance = () => {
    const issues: { id: string; type: "success" | "warning" | "error"; msg: string }[] = [];

    // 1. Personal details email, phone, location checks
    if (!personal.name) {
      issues.push({ id: "name", type: "error", msg: "Full Name is missing (critical for resume header)." });
    }
    if (!personal.email || !/\S+@\S+\.\S+/.test(personal.email)) {
      issues.push({ id: "email", type: "error", msg: "Provide a valid email address (e.g. name@domain.com)." });
    }
    if (!personal.phone) {
      issues.push({ id: "phone", type: "warning", msg: "Phone number is missing." });
    }
    if (!personal.location) {
      issues.push({ id: "location", type: "warning", msg: "Location is missing (city, state or country)." });
    }

    // 2. Internship / Job tenure years checks
    let datePatternError = false;
    let shortTenureWarning = false;
    let missingDates = false;

    experiences.forEach((exp) => {
      if (!exp.startDate || (!exp.endDate && !exp.current)) {
        missingDates = true;
      }
      
      const dateStr = `${exp.startDate} ${exp.endDate || ""}`;
      // Check date format: Jan 2022, etc. (e.g. Month Year format or YYYY)
      const matchesFormat = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|20\d{2})/i.test(dateStr);
      if (exp.startDate && !matchesFormat) {
        datePatternError = true;
      }

      // Check tenure guidelines
      if (exp.title.toLowerCase().includes("intern") || exp.title.toLowerCase().includes("internship")) {
        // If it's an internship, make sure they mention tech stack & deliverables
        if (!exp.bullets || exp.bullets.split("\n").length < 2) {
          shortTenureWarning = true;
        }
      }
    });

    if (missingDates && experiences.length > 0) {
      issues.push({ id: "dates_missing", type: "error", msg: "Some experience entries are missing start/end dates." });
    }
    if (datePatternError) {
      issues.push({ id: "date_pattern", type: "warning", msg: "Use standard date format (e.g., 'Jan 2022' or '2022') for ATS parsing." });
    }
    if (shortTenureWarning) {
      issues.push({ id: "short_tenure", type: "warning", msg: "Internship bullets should detail the exact deliverables and team collaboration." });
    }

    // 3. Project tech stack check
    let projectMissingTech = false;
    projects.forEach(p => {
      if (!p.technologies || p.technologies.trim().split(",").filter(Boolean).length < 2) {
        projectMissingTech = true;
      }
    });
    if (projectMissingTech && projects.length > 0) {
      issues.push({ id: "proj_tech", type: "warning", msg: "List specific languages or frameworks in project technologies stack." });
    }

    // 4. Bullet sentence quality (Action Verbs and numerical metrics checklist)
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

    const allBullets: string[] = [];
    experiences.forEach(e => {
      if (e.bullets) {
        allBullets.push(...e.bullets.split("\n").filter(Boolean));
      }
    });
    projects.forEach(p => {
      if (p.description) {
        allBullets.push(...p.description.split("\n").filter(Boolean));
      }
    });

    if (allBullets.length > 0) {
      hasBullets = true;
      allBullets.forEach(bullet => {
        const clean = bullet.replace(/^[•\-\*–\s]+/, "").trim();
        if (!clean) return;
        const firstWord = clean.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "";
        
        if (firstWord && !STRONG_ACTION_VERBS.includes(firstWord)) {
          missingActionVerb = true;
        }

        // Check for numbers (quantification metrics)
        const hasNumber = /\d+/.test(clean);
        if (!hasNumber) {
          missingMetrics = true;
        }
      });
    }

    if (hasBullets) {
      if (missingActionVerb) {
        issues.push({ 
          id: "action_verb", 
          type: "warning", 
          msg: "Start experience and project bullet points with a strong Action Verb (e.g. 'Developed', 'Managed')." 
        });
      }
      if (missingMetrics) {
        issues.push({ 
          id: "metrics", 
          type: "warning", 
          msg: "Quantify your achievements (e.g., 'increased speed by 25%', 'reduced cost by $4k') for ATS weight." 
        });
      }
    } else {
      issues.push({ id: "no_bullets", type: "error", msg: "Add bullet points to experience or project entries detailing achievements." });
    }

    // 5. Technical skills count check
    const skillsList = skillsText.split(",").map(s => s.trim()).filter(Boolean);
    if (skillsList.length < 5) {
      issues.push({ id: "skills_count", type: "warning", msg: "Include at least 5-10 technical skills relevant to the role." });
    }

    return issues;
  };

  // Initialize and Pre-fill form from original resume plain text
  useEffect(() => {
    try {
      const blocks = parseResumeIntoBlocks(resumeText);
      
      // 1. Name & Contact info
      const nameBlock = blocks.find(b => b.type === "name");
      const contactBlock = blocks.find(b => b.type === "contact");
      
      const parsedPersonal = {
        name: nameBlock ? nameBlock.text : "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: ""
      };

      if (contactBlock) {
        const parts = contactBlock.text.split("|").map(p => p.trim());
        parts.forEach(part => {
          if (part.includes("@")) {
            parsedPersonal.email = part;
          } else if (part.toLowerCase().includes("linkedin.com") || part.toLowerCase().includes("linkedin")) {
            parsedPersonal.linkedin = part;
          } else if (part.toLowerCase().includes("github.com") || part.toLowerCase().includes("github")) {
            parsedPersonal.github = part;
          } else if (/[a-zA-Z]/.test(part) && (part.includes(",") || part.length > 5) && !/\d{5,}/.test(part)) {
            parsedPersonal.location = part;
          } else if (/\+?\d[\d\s\-\(\)]{7,}/.test(part)) {
            parsedPersonal.phone = part;
          }
        });
      }
      setPersonal(parsedPersonal);

      // Parse other sections
      let currentSection = "";
      let tempSummary = "";
      let tempExperiences: ExperienceEntry[] = [];
      let tempEducations: EducationEntry[] = [];
      let tempProjects: ProjectEntry[] = [];
      let tempSkills = "";

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === "section") {
          currentSection = block.text.toUpperCase();
          continue;
        }

        if (currentSection.includes("SUMMARY") || currentSection.includes("OBJECTIVE")) {
          if (block.type === "normal") {
            tempSummary += (tempSummary ? "\n" : "") + block.text;
          }
        } else if (currentSection.includes("EXPERIENCE") || currentSection.includes("WORK") || currentSection.includes("HISTORY")) {
          if (block.type === "jobTitle") {
            // Find company name on next line if normal, or parse |
            const textParts = block.text.split("|").map(t => t.trim());
            const title = textParts[0] || "";
            const company = textParts[1] || "";
            
            let dateLoc = "";
            let location = "";
            let bulletsList: string[] = [];

            // Lookahead for dates, locations, bullets
            let j = i + 1;
            while (j < blocks.length && blocks[j].type !== "jobTitle" && blocks[j].type !== "section") {
              const nextBlock = blocks[j];
              if (nextBlock.type === "dateLocation") {
                dateLoc = nextBlock.text;
              } else if (nextBlock.type === "bullet") {
                bulletsList.push("• " + nextBlock.text);
              } else if (nextBlock.type === "normal" && !bulletsList.length) {
                // Might be subtitle details
                if (nextBlock.text.includes("|")) {
                  const parts = nextBlock.text.split("|").map(t => t.trim());
                  location = parts[parts.length - 1] || "";
                }
              }
              j++;
            }

            // Extract start/end dates
            let startDate = "";
            let endDate = "";
            let isCurrent = false;
            if (dateLoc) {
              const dates = dateLoc.split("|")[0].split(/[–\-]/).map(d => d.trim());
              startDate = dates[0] || "";
              endDate = dates[1] || "";
              if (endDate.toLowerCase().includes("present") || endDate.toLowerCase().includes("current")) {
                isCurrent = true;
                endDate = "";
              }
            }

            tempExperiences.push({
              id: Math.random().toString(),
              title,
              company,
              startDate,
              endDate,
              current: isCurrent,
              location,
              bullets: bulletsList.join("\n")
            });
          }
        } else if (currentSection.includes("EDUCATION")) {
          if (block.type === "jobTitle" || block.type === "normal") {
            // Might be Degree, Institution
            const textParts = block.text.split("|").map(t => t.trim());
            const degree = textParts[0] || "";
            const inst = textParts[1] || "";
            
            let year = "";
            let gpa = "";
            
            let j = i + 1;
            while (j < blocks.length && blocks[j].type !== "jobTitle" && blocks[j].type !== "normal" && blocks[j].type !== "section") {
              const nextBlock = blocks[j];
              if (nextBlock.type === "dateLocation") {
                year = nextBlock.text;
              } else if (nextBlock.type === "normal") {
                if (nextBlock.text.toLowerCase().includes("gpa") || nextBlock.text.toLowerCase().includes("cgpa")) {
                  gpa = nextBlock.text;
                }
              }
              j++;
            }
            
            tempEducations.push({
              id: Math.random().toString(),
              degree,
              institution: inst,
              year,
              gpa
            });
          }
        } else if (currentSection.includes("PROJECTS")) {
          if (block.type === "jobTitle") {
            const parts = block.text.split("|").map(t => t.trim());
            const name = parts[0] || "";
            const tech = parts[1] || "";
            
            let descList: string[] = [];
            let j = i + 1;
            while (j < blocks.length && blocks[j].type !== "jobTitle" && blocks[j].type !== "section") {
              const nextBlock = blocks[j];
              if (nextBlock.type === "bullet" || nextBlock.type === "normal") {
                descList.push(nextBlock.text);
              }
              j++;
            }
            
            tempProjects.push({
              id: Math.random().toString(),
              name,
              technologies: tech,
              description: descList.join("\n")
            });
          }
        } else if (currentSection.includes("SKILLS")) {
          if (block.type === "normal" || block.type === "bullet") {
            tempSkills += (tempSkills ? ", " : "") + block.text.replace(/^[•\-\*–]\s*/, "");
          }
        }
      }

      if (tempSummary) setSummary(tempSummary);
      if (tempExperiences.length) setExperiences(tempExperiences);
      if (tempEducations.length) setEducations(tempEducations);
      if (tempProjects.length) setProjects(tempProjects);
      if (tempSkills) setSkillsText(tempSkills);

    } catch (e) {
      console.error("Failed to parse original resume:", e);
    }
  }, [resumeText]);

  // Run ATS scorer to extract matched/missing keywords on mount or compiled text changes
  useEffect(() => {
    const fetchLatestScores = async () => {
      setIsScoring(true);
      try {
        const compiledText = compileFormToText();
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText: compiledText || resumeText, jobDescription })
        });
        if (res.ok) {
          const scoreData = await res.json();
          setScore(scoreData.overall);
          setMissingKeywords(scoreData.missingKeywords || []);
          
          // Compute matched keywords based on original missing keywords vs current missing keywords
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
  }, [personal, summary, experiences, educations, projects, skillsText]);

  // Compile Form state to single plain text resume document format matching pdf parser rules
  const compileFormToText = (): string => {
    let output = "";
    
    // Personal header
    if (personal.name) output += `${personal.name.toUpperCase()}\n`;
    
    const contactLineParts = [];
    if (personal.email) contactLineParts.push(personal.email);
    if (personal.phone) contactLineParts.push(personal.phone);
    if (personal.location) contactLineParts.push(personal.location);
    if (contactLineParts.length) {
      output += contactLineParts.join(" | ") + "\n";
    }

    const socialParts = [];
    if (personal.linkedin) socialParts.push(personal.linkedin);
    if (personal.github) socialParts.push(personal.github);
    if (socialParts.length) {
      output += socialParts.join(" | ") + "\n";
    }

    output += "\n";

    // Summary
    if (summary.trim()) {
      output += "PROFESSIONAL SUMMARY\n";
      output += `${summary.trim()}\n\n`;
    }

    // Experience
    if (experiences.length) {
      output += "EXPERIENCE\n";
      experiences.forEach(exp => {
        if (!exp.title && !exp.company) return;
        output += `${exp.title || "Role"} | ${exp.company || "Company"}\n`;
        const endStr = exp.current ? "Present" : (exp.endDate || "");
        output += `${exp.startDate || ""} – ${endStr} | ${exp.location || ""}\n`;
        if (exp.bullets.trim()) {
          const lines = exp.bullets.split("\n").map(l => l.trim()).filter(Boolean);
          lines.forEach(l => {
            const prefix = l.startsWith("•") || l.startsWith("-") || l.startsWith("*") ? "" : "• ";
            output += `${prefix}${l}\n`;
          });
        }
        output += "\n";
      });
    }

    // Projects
    if (projects.length) {
      output += "PROJECTS\n";
      projects.forEach(proj => {
        if (!proj.name) return;
        output += `${proj.name} | ${proj.technologies || ""}\n`;
        if (proj.description.trim()) {
          const lines = proj.description.split("\n").map(l => l.trim()).filter(Boolean);
          lines.forEach(l => {
            const prefix = l.startsWith("•") || l.startsWith("-") || l.startsWith("*") ? "" : "• ";
            output += `${prefix}${l}\n`;
          });
        }
        output += "\n";
      });
    }

    // Education
    if (educations.length) {
      output += "EDUCATION\n";
      educations.forEach(edu => {
        if (!edu.degree && !edu.institution) return;
        output += `${edu.degree || "Degree"} | ${edu.institution || "Institution"}\n`;
        output += `${edu.year || ""} | ${edu.gpa || ""}\n\n`;
      });
    }

    // Skills
    if (skillsText.trim()) {
      output += "SKILLS\n";
      output += `Technical Skills: ${skillsText.trim()}\n\n`;
    }

    return output.trim();
  };

  const handleAddExperience = () => {
    setExperiences(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        title: "",
        company: "",
        startDate: "",
        endDate: "",
        current: false,
        location: "",
        bullets: ""
      }
    ]);
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences(prev => prev.filter(e => e.id !== id));
  };

  const handleAddEducation = () => {
    setEducations(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        degree: "",
        institution: "",
        year: "",
        gpa: ""
      }
    ]);
  };

  const handleRemoveEducation = (id: string) => {
    setEducations(prev => prev.filter(e => e.id !== id));
  };

  const handleAddProject = () => {
    setProjects(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        name: "",
        technologies: "",
        description: ""
      }
    ]);
  };

  const handleRemoveProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  // Click handler to append a missing keyword to Skills technical skills input box
  const handleKeywordClick = (word: string) => {
    const list = skillsText.split(",").map(s => s.trim()).filter(Boolean);
    if (!list.includes(word)) {
      list.push(word);
      setSkillsText(list.join(", "));
      toast.success(`Added "${word}" to skills! ✅`);
    } else {
      toast.error(`"${word}" is already in technical skills.`);
    }
  };

  // Preview form compiled text
  const handlePreview = () => {
    const text = compileFormToText();
    setPreviewText(text);
    setIsPreviewOpen(true);
  };

  // Direct PDF download from current form data
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const text = compileFormToText();
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, type: "optimized", text }),
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
    const plainText = compileFormToText();
    onSwitchToAI(plainText);
  };

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
              ✏️ Manual Resume Form Builder
              {isScoring ? (
                <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
              ) : (
                <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold px-2 py-0.5 rounded">
                  ATS Score: {score} 🎯
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 font-medium">Build your ATS-friendly resume section-by-section with live match checks.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePreview}
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5 font-bold text-xs h-9 rounded-xl flex items-center gap-1.5 bg-transparent"
          >
            <Eye className="h-4 w-4" />
            Preview Resume
          </Button>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* SECTION 1 — Personal Details */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("personal")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                  <User className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-white text-sm">SECTION 1 — Personal Details</h3>
              </div>
              {expandedSections.personal ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {expandedSections.personal && (
              <div className="p-5 border-t border-white/5 space-y-4 bg-slate-950/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      value={personal.name}
                      onChange={(e) => setPersonal(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      value={personal.email}
                      onChange={(e) => setPersonal(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. johndoe@example.com"
                      className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      value={personal.phone}
                      onChange={(e) => setPersonal(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. +1 555 123 4567"
                      className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                    <input
                      type="text"
                      value={personal.location}
                      onChange={(e) => setPersonal(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. New York, NY"
                      className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LinkedIn URL</label>
                    <input
                      type="text"
                      value={personal.linkedin}
                      onChange={(e) => setPersonal(prev => ({ ...prev, linkedin: e.target.value }))}
                      placeholder="e.g. linkedin.com/in/johndoe"
                      className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GitHub URL</label>
                    <input
                      type="text"
                      value={personal.github}
                      onChange={(e) => setPersonal(prev => ({ ...prev, github: e.target.value }))}
                      placeholder="e.g. github.com/johndoe"
                      className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2 — Professional Summary */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("summary")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-white text-sm">SECTION 2 — Professional Summary</h3>
              </div>
              {expandedSections.summary ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {expandedSections.summary && (
              <div className="p-5 border-t border-white/5 space-y-3 bg-slate-950/20">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Write 2-3 sentences about yourself</label>
                  <textarea
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="e.g. Result-driven Software Engineer with 4 years of experience building scalable microservices..."
                    className="w-full bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl p-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="flex gap-2 items-start p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-xl mt-1">
                    <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-slate-400 leading-normal">
                      <strong>💡 Tip:</strong> Include your job target role and reference your top 2 skills from the job description to align immediately.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3 — Experience */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("experience")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-white text-sm">SECTION 3 — Work Experience ({experiences.length})</h3>
              </div>
              {expandedSections.experience ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {expandedSections.experience && (
              <div className="p-5 border-t border-white/5 space-y-6 bg-slate-950/20">
                {experiences.map((exp, idx) => (
                  <div key={exp.id} className="relative border border-white/5 rounded-xl p-5 bg-[#0a0f1d] space-y-4">
                    <button
                      onClick={() => handleRemoveExperience(exp.id)}
                      className="absolute top-4 right-4 p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block mb-1">
                      Experience Entry #{idx + 1}
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Title *</label>
                        <input
                          type="text"
                          value={exp.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperiences(prev => prev.map(item => item.id === exp.id ? { ...item, title: val } : item));
                          }}
                          placeholder="e.g. Senior Software Engineer"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Name *</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperiences(prev => prev.map(item => item.id === exp.id ? { ...item, company: val } : item));
                          }}
                          placeholder="e.g. Google"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperiences(prev => prev.map(item => item.id === exp.id ? { ...item, startDate: val } : item));
                          }}
                          placeholder="e.g. Jun 2021"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                          <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={exp.current}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setExperiences(prev => prev.map(item => item.id === exp.id ? { ...item, current: val } : item));
                              }}
                              className="rounded border-white/10 bg-[#0d0e22] text-violet-600 focus:ring-violet-600 h-3 w-3"
                            />
                            Currently work here
                          </label>
                        </div>
                        <input
                          type="text"
                          disabled={exp.current}
                          value={exp.current ? "" : exp.endDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperiences(prev => prev.map(item => item.id === exp.id ? { ...item, endDate: val } : item));
                          }}
                          placeholder={exp.current ? "Present" : "e.g. Dec 2023"}
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Location</label>
                        <input
                          type="text"
                          value={exp.location}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperiences(prev => prev.map(item => item.id === exp.id ? { ...item, location: val } : item));
                          }}
                          placeholder="e.g. San Francisco, CA"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bullet Points (one bullet per line)</label>
                        <textarea
                          rows={4}
                          value={exp.bullets}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExperiences(prev => prev.map(item => item.id === exp.id ? { ...item, bullets: val } : item));
                          }}
                          placeholder="• Built distributed databases with AWS DynamoDB&#10;• Led optimization team of 4 software dev juniors"
                          className="w-full bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl p-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none resize-none leading-relaxed font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddExperience}
                  className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all bg-[#0a0f1d]/30"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Experience
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4 — Education */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("education")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                  <Plus className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-white text-sm">SECTION 4 — Education ({educations.length})</h3>
              </div>
              {expandedSections.education ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {expandedSections.education && (
              <div className="p-5 border-t border-white/5 space-y-6 bg-slate-950/20">
                {educations.map((edu, idx) => (
                  <div key={edu.id} className="relative border border-white/5 rounded-xl p-5 bg-[#0a0f1d] space-y-4">
                    <button
                      onClick={() => handleRemoveEducation(edu.id)}
                      className="absolute top-4 right-4 p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block mb-1">
                      Education Entry #{idx + 1}
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Degree / Field *</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEducations(prev => prev.map(item => item.id === edu.id ? { ...item, degree: val } : item));
                          }}
                          placeholder="e.g. B.Tech in Computer Science"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Institution / School *</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEducations(prev => prev.map(item => item.id === edu.id ? { ...item, institution: val } : item));
                          }}
                          placeholder="e.g. MIT University"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year / Dates</label>
                        <input
                          type="text"
                          value={edu.year}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEducations(prev => prev.map(item => item.id === edu.id ? { ...item, year: val } : item));
                          }}
                          placeholder="e.g. 2022 – 2026"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GPA / CGPA (optional)</label>
                        <input
                          type="text"
                          value={edu.gpa}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEducations(prev => prev.map(item => item.id === edu.id ? { ...item, gpa: val } : item));
                          }}
                          placeholder="e.g. CGPA: 7.62"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddEducation}
                  className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all bg-[#0a0f1d]/30"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Education
                </button>
              </div>
            )}
          </div>

          {/* SECTION 5 — Projects */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("projects")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                  <FileText className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-white text-sm">SECTION 5 — Projects ({projects.length})</h3>
              </div>
              {expandedSections.projects ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {expandedSections.projects && (
              <div className="p-5 border-t border-white/5 space-y-6 bg-slate-950/20">
                {projects.map((proj, idx) => (
                  <div key={proj.id} className="relative border border-white/5 rounded-xl p-5 bg-[#0a0f1d] space-y-4">
                    <button
                      onClick={() => handleRemoveProject(proj.id)}
                      className="absolute top-4 right-4 p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block mb-1">
                      Project Entry #{idx + 1}
                    </span>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name *</label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProjects(prev => prev.map(item => item.id === proj.id ? { ...item, name: val } : item));
                          }}
                          placeholder="e.g. Medical Diagnosis Platform"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technologies Used</label>
                        <input
                          type="text"
                          value={proj.technologies}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProjects(prev => prev.map(item => item.id === proj.id ? { ...item, technologies: val } : item));
                          }}
                          placeholder="e.g. ReactJS, PyTorch, Azure"
                          className="w-full h-10 bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl px-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description (one bullet per line)</label>
                        <textarea
                          rows={3}
                          value={proj.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProjects(prev => prev.map(item => item.id === proj.id ? { ...item, description: val } : item));
                          }}
                          placeholder="• Engineered CNN pipelines to inspect MRI imagery&#10;• Deployed cluster via Kubernetes"
                          className="w-full bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl p-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none resize-none leading-relaxed font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddProject}
                  className="w-full flex items-center justify-center gap-1.5 py-3 border border-dashed border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all bg-[#0a0f1d]/30"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Project
                </button>
              </div>
            )}
          </div>

          {/* SECTION 6 — Skills */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl overflow-hidden">
            <button
              onClick={() => toggleSection("skills")}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center">
                  <User className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-white text-sm">SECTION 6 — Skills</h3>
              </div>
              {expandedSections.skills ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {expandedSections.skills && (
              <div className="p-5 border-t border-white/5 space-y-4 bg-slate-950/20">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technical Skills (comma separated)</label>
                  <textarea
                    rows={3}
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="Python, ReactJS, Kubernetes, CI/CD, AWS"
                    className="w-full bg-[#0d0e22] text-slate-100 border border-white/5 rounded-xl p-4 text-xs focus:ring-1 focus:ring-violet-600 focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Guidance Sidebar (1/3 width) */}
        <div className="space-y-4">
          {/* Real-time ATS Compliance Inspector */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">ATS Inspector</h4>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-normal">
              Real-time inspection of your form data against standard ATS parsing guidelines:
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
              Click any keyword badge below to automatically append it to your **Technical Skills** list!
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
                <span className="text-[10px] text-slate-500 italic">Add missing keywords on the left to start matching.</span>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="bg-[#071525]/70 border border-white/6 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">Form Actions</h4>
            <p className="text-[10px] text-slate-400 leading-normal">
              Once you've filled in your details, trigger AI optimization to refine phrasing and metrics.
            </p>
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

      {/* Preview Dialog Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#070814] border border-white/10 rounded-2xl max-w-3xl w-full flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-cyan-400" />
                Resume Plain Text Preview
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto bg-white text-slate-900 font-sans min-h-[400px]">
              <div className="w-full max-w-2xl mx-auto bg-white p-6 leading-normal select-text relative">
                {parseResumeIntoBlocks(previewText).map((block, idx) => {
                  switch (block.type) {
                    case "name":
                      return (
                        <h1 key={idx} className="text-xl font-bold text-center text-black mb-1 leading-normal">
                          {block.text}
                        </h1>
                      );
                    case "contact":
                      return (
                        <div key={idx} className="text-[9.5px] text-center text-slate-600 mb-3 leading-normal">
                          {block.text}
                        </div>
                      );
                    case "section":
                      return (
                        <h2 key={idx} className="text-xs font-bold text-black uppercase border-b border-black mt-3 mb-1.5 pb-0.5 leading-normal">
                          {block.text}
                        </h2>
                      );
                    case "jobTitle":
                      return (
                        <div key={idx} className="text-[10.5px] font-bold text-black mb-0.5 leading-normal">
                          {block.text}
                        </div>
                      );
                    case "dateLocation":
                      return (
                        <div key={idx} className="text-[9.5px] text-slate-500 mb-1 leading-normal">
                          {block.text}
                        </div>
                      );
                    case "bullet":
                      return (
                        <div key={idx} className="flex items-start text-[10px] mb-0.5 pl-3 leading-normal">
                          <span className="w-3 shrink-0 select-none text-black">•</span>
                          <span className="flex-1 text-slate-800">{block.text}</span>
                        </div>
                      );
                    case "spacer":
                      return <div key={idx} className="h-1" />;
                    default:
                      return (
                        <p key={idx} className="text-[10px] mb-1 text-slate-800 leading-normal">
                          {block.text}
                        </p>
                      );
                  }
                })}
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-[#0f112a] flex justify-end gap-2 rounded-b-2xl">
              <Button
                onClick={() => setIsPreviewOpen(false)}
                className="bg-[#0b1c30] border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold h-9 rounded-lg"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
