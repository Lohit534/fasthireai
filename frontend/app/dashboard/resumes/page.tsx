"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResumeRecord } from "@/types";
import { logger } from "@/lib/logger";
import { formatDate, generateUUID } from "@/lib/utils";
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  Trash2, 
  Download, 
  Plus, 
  Edit3,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  Briefcase,
  BookOpen,
  FolderGit,
  Wrench,
  Check,
  AlertCircle,
  Award,
  Languages,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { saveAs } from "file-saver";

// Structured Resume Form Types
interface StructuredResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  summary: string;
  experience: { id: string; company: string; title: string; date: string; bullets: string[] }[];
  education: { id: string; school: string; degree: string; field: string; date: string; gpa: string; description: string }[];
  projects: { id: string; name: string; techStack: string; link: string; date: string; bullets: string[] }[];
  skills: { id: string; category: string; list: string[] }[];
  certifications: string[];
  languages: string[];
  achievements: string[];
}

const renderRichText = (text: string) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export default function ResumesPage() {
  const router = useRouter();
  const store = useResumeStore();
  
  // Resumes list state
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState("free");
 
  // View state: list vs editor split screen
  const [editingResume, setEditingResume] = useState<ResumeRecord | null>(null);
  const [editorData, setEditorData] = useState<StructuredResume | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Accordion collapsibles state in left column of Editor
  const [collapsibles, setCollapsibles] = useState({
    personal: true,
    summary: true,
    experience: true,
    education: true,
    projects: true,
    skills: true,
    certifications: true,
    languages: true,
    achievements: true
  });

  // Load initial list
  useEffect(() => {
    let active = true;

    async function loadResumes() {
      try {
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;

        if (error || !user) {
          toast.error("Please sign in to view your resumes.");
          router.push("/auth/login");
          return;
        }

        if (active) {
          setUserId(user.id);
          setAuthLoading(false);
          const plan = localStorage.getItem(`fastHire_plan_${user.id}`) || "free";
          setActivePlan(plan);
        }

        // Fetch resumes via API endpoint to bypass client RLS issues
        let dbData: any[] = [];
        let dbError: any = null;
        try {
          const historyRes = await fetch("/api/resumes");
          if (historyRes.ok) {
            dbData = await historyRes.json();
          } else {
            const errBody = await historyRes.json().catch(() => ({}));
            dbError = new Error(errBody.error || "Failed to fetch resumes from API");
          }
        } catch (fetchErr: any) {
          dbError = fetchErr;
        }

        if (!active) return;

        if (dbError) {
          logger.error("Failed to query resumes from Supabase", dbError);
          toast.error("Could not load resumes.");
        } else if (dbData) {
          setResumes(dbData as ResumeRecord[]);
        }
        setLoading(false);
      } catch (err) {
        logger.error("Unexpected error loading resumes page:", err);
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResumes();

    return () => {
      active = false;
    };
  }, [router]);

  // Collapsible toggle helper
  const toggleCollapsible = (key: keyof typeof collapsibles) => {
    setCollapsibles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Convert plain text resume details into structured format for editing
  const parseResumeText = (text: string): StructuredResume => {
    const lines = text.split(/\r?\n/).map(l => l.trim());
    const resume: StructuredResume = {
      name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: [],
      certifications: [],
      languages: [],
      achievements: []
    };

    if (lines.length > 0 && lines[0]) {
      resume.name = lines[0].replace(/^[#\s\-\*\_]+|[\#\s\-\*\_]+$/g, "").trim();
    }

    // Try finding the contact line
    const contactLine = lines.find(l => l.includes("@") || l.includes("|") || l.toLowerCase().includes("email:") || l.toLowerCase().includes("phone:"));
    if (contactLine) {
      const cleanContactLine = contactLine.replace(/^[#\s\-\*\_]+|[\#\s\-\*\_]+$/g, "").trim();
      const parts = cleanContactLine.split("|").map(p => p.trim());
      parts.forEach(part => {
        const lower = part.toLowerCase();
        if (lower.startsWith("email:")) {
          resume.email = part.substring(6).trim();
        } else if (lower.startsWith("phone:")) {
          resume.phone = part.substring(6).trim();
        } else if (lower.startsWith("linkedin:")) {
          resume.linkedin = part.substring(9).trim();
        } else if (lower.startsWith("portfolio:")) {
          resume.website = part.substring(10).trim();
        } else if (lower.startsWith("website:")) {
          resume.website = part.substring(8).trim();
        } else if (part.includes("@")) {
          resume.email = part;
        } else if (part.includes("linkedin.com")) {
          resume.linkedin = part;
        } else if (/^\+?[\d\-\(\)\s]{9,18}$/.test(part)) {
          resume.phone = part;
        } else if ((part.includes(".") || part.includes("localhost")) && !resume.website) {
          resume.website = part;
        } else if (!resume.location && part.length < 50) {
          resume.location = part;
        }
      });
    }

    // Parse Sections via simple state check
    let currentSection = "";
    let currentExp: any = null;
    let currentEdu: any = null;
    let currentProj: any = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line === contactLine) continue;

      // Clean the line for matching section headers
      const cleanLine = line.replace(/^[#\s\-\*\_\u2022]+/, "").replace(/:$/, "").trim();
      const upper = cleanLine.toUpperCase();

      if (upper === "PROFESSIONAL SUMMARY" || upper === "SUMMARY" || upper === "ABOUT" || upper === "ABOUT ME") {
        currentSection = "summary";
        resume.summary = "";
        continue;
      } else if (upper === "EXPERIENCE" || upper === "WORK EXPERIENCE" || upper === "PROFESSIONAL EXPERIENCE" || upper === "EMPLOYMENT HISTORY" || upper === "WORK HISTORY") {
        currentSection = "experience";
        continue;
      } else if (upper === "EDUCATION" || upper === "ACADEMIC BACKGROUND" || upper === "ACADEMICS") {
        currentSection = "education";
        continue;
      } else if (upper === "PROJECTS" || upper === "ACADEMIC PROJECTS" || upper === "PERSONAL PROJECTS") {
        currentSection = "projects";
        continue;
      } else if (upper === "SKILLS" || upper === "TECHNICAL SKILLS" || upper === "CORE COMPETENCIES" || upper === "KEY SKILLS") {
        currentSection = "skills";
        continue;
      } else if (upper === "CERTIFICATIONS" || upper === "COURSES" || upper === "CERTIFICATE" || upper === "CREDENTIALS") {
        currentSection = "certifications";
        continue;
      } else if (upper === "LANGUAGES") {
        currentSection = "languages";
        continue;
      } else if (upper === "ACHIEVEMENTS" || upper === "HONORS" || upper === "AWARDS" || upper === "HONORS & AWARDS") {
        currentSection = "achievements";
        continue;
      }

      if (currentSection === "summary") {
        resume.summary = (resume.summary ? resume.summary + "\n" : "") + line;
      } else if (currentSection === "experience") {
        if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") && !line.endsWith("*")) {
          if (currentExp) {
            const bullet = line.replace(/^[•\-*\u2022\s]+/, "");
            currentExp.bullets.push(bullet);
          }
        } else if ((line.startsWith("*") && line.endsWith("*") || line.startsWith("_") && line.endsWith("_")) && currentExp) {
          currentExp.date = line.replace(/^[\*\_]+|[\*\_]+$/g, "").trim();
        } else {
          const parts = line.split(/\s{3,}| \| /);
          const headerParts = (parts[0] || "").replace(/^\*\*|\*\*$/g, "").split(" - ");
          currentExp = {
            id: Math.random().toString(36).substr(2, 9),
            company: (headerParts[0] || "").replace(/^\*\*|\*\*$/g, "").trim(),
            title: (headerParts[1] || "").replace(/^\*\*|\*\*$/g, "").trim(),
            date: (parts[1] || "").replace(/^[\*\_]+|[\*\_]+$/g, "").trim(),
            bullets: []
          };
          resume.experience.push(currentExp);
        }
      } else if (currentSection === "education") {
        if ((line.startsWith("*") && line.endsWith("*") || line.startsWith("_") && line.endsWith("_")) && currentEdu) {
          currentEdu.date = line.replace(/^[\*\_]+|[\*\_]+$/g, "").trim();
        } else if (line.toLowerCase().startsWith("cgpa:") || line.toLowerCase().startsWith("gpa:")) {
          if (currentEdu) {
            currentEdu.gpa = line.replace(/^(cgpa|gpa):\s*/i, "").trim();
          }
        } else {
          const parts = line.split(/\s{3,}| \| /);
          let school = "";
          let degree = "";
          let field = "";
          let date = "";

          if (parts.length >= 4) {
            school = (parts[0] || "").replace(/^\*\*|\*\*$/g, "").trim();
            degree = (parts[1] || "").replace(/^\*\*|\*\*$/g, "").trim();
            field = (parts[2] || "").replace(/^\*\*|\*\*$/g, "").trim();
            date = (parts[3] || "").replace(/^[\*\_]+|[\*\_]+$/g, "").trim();
          } else {
            const headerParts = (parts[0] || "").replace(/^\*\*|\*\*$/g, "").split(" - ");
            school = (headerParts[0] || "").replace(/^\*\*|\*\*$/g, "").trim();
            const degreeAndField = parts[1] || headerParts[1] || "";
            const fieldParts = degreeAndField.split(" in ");
            degree = (fieldParts[0] || "").replace(/^\*\*|\*\*$/g, "").trim();
            field = (fieldParts[1] || "").replace(/^\*\*|\*\*$/g, "").trim();
            date = (parts[2] || "").replace(/^[\*\_]+|[\*\_]+$/g, "").trim();
          }

          currentEdu = {
            id: Math.random().toString(36).substr(2, 9),
            school,
            degree,
            field,
            date,
            gpa: "",
            description: ""
          };
          resume.education.push(currentEdu);
        }
      } else if (currentSection === "projects") {
        if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") && !line.endsWith("*")) {
          if (currentProj) {
            const bullet = line.replace(/^[•\-*\u2022\s]+/, "");
            currentProj.bullets.push(bullet);
          }
        } else {
          const parts = line.split(/\s{3,}| \| /);
          
          // Project name and optionally tech stack/link
          const namePart = (parts[0] || "").replace(/^\*\*|\*\*$/g, "").trim();
          let name = namePart;
          let link = "";
          
          // Try to extract link inside parentheses from project name or whole line
          const linkMatch = line.match(/\((https?:\/\/[^\s\)]+|github\.com[^\s\)]+|www\.[^\s\)]+)\)/);
          if (linkMatch) {
            link = linkMatch[1];
            name = name.replace(/\s*\(.*?\)/, "").trim();
          }

          let tech = "";
          if (parts[1]) {
            tech = parts[1].replace(/^[\*\_]+|[\*\_]+$/g, "").trim();
            // clean up parenthesized link from tech stack if it leaked
            tech = tech.replace(/\s*\(.*?\)/, "").trim();
          }

          currentProj = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            techStack: tech,
            link,
            date: (parts[2] || "").replace(/^[\*\_]+|[\*\_]+$/g, "").trim(),
            bullets: []
          };
          resume.projects.push(currentProj);
        }
      } else if (currentSection === "skills") {
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          const category = line.substring(0, colonIndex).replace(/^\*\*|\*\*$/g, "").trim();
          const list = line.substring(colonIndex + 1).split(",").map(s => s.trim()).filter(Boolean);
          resume.skills.push({
            id: Math.random().toString(36).substr(2, 9),
            category,
            list
          });
        } else {
          const list = line.split(",").map(s => s.trim()).filter(Boolean);
          if (list.length > 0) {
            resume.skills.push({
              id: Math.random().toString(36).substr(2, 9),
              category: "General",
              list
            });
          }
        }
      } else if (currentSection === "certifications") {
        const cleanLine = line.replace(/^[•\-*\u2022\s]+/, "").trim();
        if (cleanLine) {
          resume.certifications = [...resume.certifications, cleanLine];
        }
      } else if (currentSection === "languages") {
        const cleanLine = line.replace(/^[•\-*\u2022\s]+/, "").trim();
        if (cleanLine) {
          const langs = cleanLine.split(",").map(l => l.trim()).filter(Boolean);
          resume.languages = [...resume.languages, ...langs];
        }
      } else if (currentSection === "achievements") {
        const cleanLine = line.replace(/^[•\-*\u2022\s]+/, "").trim();
        if (cleanLine) {
          resume.achievements = [...resume.achievements, cleanLine];
        }
      }
    }

    return resume;
  };

  // Compile structured format back to flat text string
  const compileStructuredResume = (data: StructuredResume): string => {
    let text = `${data.name || "Jane Smith"}\n`;
    const contactParts = [data.email, data.phone, data.location, data.linkedin, data.website].filter(Boolean);
    text += `${contactParts.join(" | ")}\n\n`;
    
    if (data.summary) {
      text += `PROFESSIONAL SUMMARY\n${data.summary}\n\n`;
    }
    
    if (data.experience.length > 0) {
      text += `EXPERIENCE\n`;
      data.experience.forEach(exp => {
        if (exp.title) {
          text += `**${exp.title}**   ${exp.date}\n`;
          if (exp.company) text += `${exp.company}\n`;
        } else {
          text += `**${exp.company}**   ${exp.date}\n`;
        }
        exp.bullets.forEach(bullet => {
          if (bullet.trim()) {
            text += `• ${bullet.trim()}\n`;
          }
        });
      });
      text += `\n`;
    }
    
    if (data.education.length > 0) {
      text += `EDUCATION\n`;
      data.education.forEach(edu => {
        let title = "";
        if (edu.degree || edu.field) {
          title = `${edu.degree || ''}${edu.degree && edu.field ? ' in ' : ''}${edu.field || ''}`.trim();
        }
        
        if (title) {
          text += `**${title}**\n`;
          if (edu.school) {
            text += `**${edu.school}**   ${edu.date}\n`;
          } else {
            text += `**Unknown School**   ${edu.date}\n`;
          }
        } else {
          text += `**${edu.school}**   ${edu.date}\n`;
        }
        
        if (edu.gpa) {
          text += `**CGPA: ${edu.gpa}**\n`;
        }
        if (edu.description) {
          text += `${edu.description}\n`;
        }
      });
      text += `\n`;
    }
    
    if (data.projects.length > 0) {
      text += `PROJECTS\n`;
      data.projects.forEach(proj => {
        let leftPart = `**${proj.name}**`;
        if (proj.techStack) {
          leftPart += `   **| ${proj.techStack}**`;
        }
        if (proj.link) {
          leftPart += ` (${proj.link})`;
        }
        text += `${leftPart}\n`;
        proj.bullets.forEach(bullet => {
          if (bullet.trim()) {
            text += `• ${bullet.trim()}\n`;
          }
        });
      });
      text += `\n`;
    }
    
    if (data.skills.length > 0) {
      text += `SKILLS\n`;
      data.skills.forEach(group => {
        text += `**${group.category}:** ${group.list.join(", ")}\n`;
      });
      text += `\n`;
    }

    if (data.certifications && data.certifications.length > 0) {
      text += `CERTIFICATIONS\n`;
      data.certifications.forEach(cert => {
        text += `• ${cert}\n`;
      });
      text += `\n`;
    }

    if (data.languages && data.languages.length > 0) {
      text += `LANGUAGES\n`;
      text += `${data.languages.join(", ")}\n\n`;
    }

    if (data.achievements && data.achievements.length > 0) {
      text += `ACHIEVEMENTS\n`;
      data.achievements.forEach(ach => {
        text += `• ${ach}\n`;
      });
      text += `\n`;
    }
    
    return text.trim();
  };

  // Open Resume Editor
  const handleOpenEditor = (record: ResumeRecord) => {
    setEditingResume(record);
    setTempTitle(record.jobTitle || "Untitled Resume");
    
    // Check if optimizedText is present and different from originalText (i.e. it is optimized/compiled)
    const hasOptimized = record.optimizedText && record.optimizedText.trim() !== "" && record.optimizedText !== record.originalText;
    
    const parsed = hasOptimized 
      ? parseResumeText(record.optimizedText!) 
      : {
          name: "",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          website: "",
          summary: "",
          experience: [],
          education: [],
          projects: [],
          skills: [],
          certifications: [],
          languages: [],
          achievements: []
        };
    setEditorData(parsed);
  };

  // Create New Resume Card Trigger
  const handleCreateNewResume = async () => {
    if (!userId) return;
    setActionLoading("create");

    const defaultText = ``;

    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: generateUUID(),
          originalText: defaultText,
          optimizedText: defaultText,
          jobDescription: "",
          jobTitle: "Untitled Resume",
          company: "General Application",
          scoreBefore: 45,
          scoreAfter: 45,
          keywordsBefore: 0,
          keywordsAfter: 0,
          impactBefore: 0,
          impactAfter: 0,
          keywordsAdded: []
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to create resume on the server.");
      }

      const data = await res.json();
      if (data) {
        const newRecord = data as ResumeRecord;
        setResumes(prev => [newRecord, ...prev]);
        handleOpenEditor(newRecord);
        toast.success("New resume card created successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create new resume.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Resume Card
  const handleDeleteResume = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this resume card?")) {
      return;
    }

    setActionLoading(`delete-${recordId}`);
    try {
      const res = await fetch(`/api/resumes?id=${recordId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to delete resume card on the server.");
      }
      setResumes(prev => prev.filter(r => r.id !== recordId));
      toast.success("Resume record deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete resume record.");
    } finally {
      setActionLoading(null);
    }
  };

  // Download PDF file
  const handleDownloadPDF = async (record: ResumeRecord) => {
    setActionLoading(`pdf-${record.id}`);
    try {
      const text = editorData ? compileStructuredResume(editorData) : (record.optimizedText || record.originalText);
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: record.id, text })
      });

      if (!response.ok) {
        throw new Error("Failed to export PDF.");
      }

      const blob = await response.blob();
      saveAs(blob, `${record.jobTitle?.replace(/\s+/g, "-") || "resume"}-optimized.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download PDF.");
    } finally {
      setActionLoading(null);
    }
  };

  // Download DOCX file
  const handleDownloadDOCX = async (record: ResumeRecord) => {
    setActionLoading(`docx-${record.id}`);
    try {
      const text = editorData ? compileStructuredResume(editorData) : (record.optimizedText || record.originalText);
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: record.id, text })
      });

      if (!response.ok) {
        throw new Error("Failed to export DOCX.");
      }

      const blob = await response.blob();
      saveAs(blob, `${record.jobTitle?.replace(/\s+/g, "-") || "resume"}-optimized.docx`);
      toast.success("DOCX exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download DOCX.");
    } finally {
      setActionLoading(null);
    }
  };

  // Sync state changes back to database
  const saveEditorData = async (updatedData: StructuredResume, updateRecordFields: Partial<ResumeRecord> = {}) => {
    if (!editingResume || !userId) return;
    
    const compiledText = compileStructuredResume(updatedData);
    const updatedRecord: ResumeRecord = {
      ...editingResume,
      optimizedText: compiledText,
      ...updateRecordFields
    };

    setEditingResume(updatedRecord);
    setResumes(prev => prev.map(r => r.id === editingResume.id ? updatedRecord : r));

    try {
      await fetch("/api/resumes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingResume.id,
          optimizedText: compiledText,
          ...updateRecordFields
        })
      });
    } catch (err) {
      console.error("Failed to sync resume updates with db:", err);
    }
  };

  // Field change triggers
  const handlePersonalInfoChange = (field: keyof StructuredResume, value: string) => {
    if (!editorData) return;
    const updated = { ...editorData, [field]: value };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const handleSummaryChange = (value: string) => {
    if (!editorData) return;
    const updated = { ...editorData, summary: value };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Auto-Improve Professional Summary
  const handleImproveSummary = async () => {
    if (!editorData) return;

    // Check if free user is attempting to use the Pro feature
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const credRes = await fetch("/api/credits");
        let isFree = true;
        if (credRes.ok) {
          const creds = await credRes.json();
          const storedPlan = localStorage.getItem(`fastHire_plan_${user.id}`) || "free";
          if (creds.isOwner || creds.isFirst50 || storedPlan === "premium" || storedPlan === "promax" || creds.paidCredits > 0) {
            isFree = false;
          }
        }
        
        if (isFree) {
          toast.error("Auto-Improve is a Premium Pro/Pro Max feature. Redirecting to upgrades...");
          setTimeout(() => {
            window.location.href = "/dashboard/pricing";
          }, 1500);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed checking user plan:", e);
    }

    setActionLoading("improve-summary");

    try {
      const response = await fetch("/api/improve-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bullet: editorData.summary,
          jobDescription: "General Professional Alignment" 
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updated = { ...editorData, summary: data.improvedBullet || editorData.summary };
        setEditorData(updated);
        saveEditorData(updated);
        toast.success("Summary enhanced with AI optimization!");
      } else {
        throw new Error("AI engine failed.");
      }
    } catch (err) {
      toast.error("Could not optimize summary at this time.");
    } finally {
      setActionLoading(null);
    }
  };

  // Experience changes handlers
  const handleExpChange = (id: string, field: string, value: string) => {
    if (!editorData) return;
    const updatedExp = editorData.experience.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    const updated = { ...editorData, experience: updatedExp };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const handleExpBulletChange = (expId: string, idx: number, value: string) => {
    if (!editorData) return;
    const updatedExp = editorData.experience.map(exp => {
      if (exp.id === expId) {
        const newBullets = [...exp.bullets];
        newBullets[idx] = value;
        return { ...exp, bullets: newBullets };
      }
      return exp;
    });
    const updated = { ...editorData, experience: updatedExp };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addExpBullet = (expId: string) => {
    if (!editorData) return;
    const updatedExp = editorData.experience.map(exp => {
      if (exp.id === expId) {
        return { ...exp, bullets: [...exp.bullets, ""] };
      }
      return exp;
    });
    const updated = { ...editorData, experience: updatedExp };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const removeExpBullet = (expId: string, idx: number) => {
    if (!editorData) return;
    const updatedExp = editorData.experience.map(exp => {
      if (exp.id === expId) {
        return { ...exp, bullets: exp.bullets.filter((_, i) => i !== idx) };
      }
      return exp;
    });
    const updated = { ...editorData, experience: updatedExp };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addExperienceItem = () => {
    if (!editorData) return;
    const newExp = {
      id: Math.random().toString(36).substr(2, 9),
      company: "",
      title: "",
      date: "",
      bullets: [""]
    };
    const updated = { ...editorData, experience: [...editorData.experience, newExp] };
    setEditorData(updated);
    saveEditorData(updated);
    toast.success("Experience section added!");
  };

  const removeExperienceItem = (id: string) => {
    if (!editorData) return;
    const updated = { ...editorData, experience: editorData.experience.filter(exp => exp.id !== id) };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Education changes handlers
  const handleEduChange = (id: string, field: string, value: string) => {
    if (!editorData) return;
    const updatedEdu = editorData.education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    );
    const updated = { ...editorData, education: updatedEdu };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addEducationItem = () => {
    if (!editorData) return;
    const newEdu = {
      id: Math.random().toString(36).substr(2, 9),
      school: "",
      degree: "",
      field: "",
      date: "",
      gpa: "",
      description: ""
    };
    const updated = { ...editorData, education: [...editorData.education, newEdu] };
    setEditorData(updated);
    saveEditorData(updated);
    toast.success("Education section added!");
  };

  const removeEducationItem = (id: string) => {
    if (!editorData) return;
    const updated = { ...editorData, education: editorData.education.filter(edu => edu.id !== id) };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Projects change handlers
  const handleProjChange = (id: string, field: string, value: string) => {
    if (!editorData) return;
    const updatedProj = editorData.projects.map(proj => 
      proj.id === id ? { ...proj, [field]: value } : proj
    );
    const updated = { ...editorData, projects: updatedProj };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addProjectItem = () => {
    if (!editorData) return;
    const newProj = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      techStack: "",
      link: "",
      date: "",
      bullets: [""]
    };
    const updated = { ...editorData, projects: [...editorData.projects, newProj] };
    setEditorData(updated);
    saveEditorData(updated);
    toast.success("Project section added!");
  };

  const removeProjectItem = (id: string) => {
    if (!editorData) return;
    const updated = { ...editorData, projects: editorData.projects.filter(proj => proj.id !== id) };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const handleProjBulletChange = (projId: string, idx: number, value: string) => {
    if (!editorData) return;
    const updatedProj = editorData.projects.map(proj => {
      if (proj.id === projId) {
        const newBullets = [...proj.bullets];
        newBullets[idx] = value;
        return { ...proj, bullets: newBullets };
      }
      return proj;
    });
    const updated = { ...editorData, projects: updatedProj };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addProjBullet = (projId: string) => {
    if (!editorData) return;
    const updatedProj = editorData.projects.map(proj => {
      if (proj.id === projId) {
        return { ...proj, bullets: [...proj.bullets, ""] };
      }
      return proj;
    });
    const updated = { ...editorData, projects: updatedProj };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const removeProjBullet = (projId: string, idx: number) => {
    if (!editorData) return;
    const updatedProj = editorData.projects.map(proj => {
      if (proj.id === projId) {
        return { ...proj, bullets: proj.bullets.filter((_, i) => i !== idx) };
      }
      return proj;
    });
    const updated = { ...editorData, projects: updatedProj };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Skills handlers
  const handleSkillGroupChange = (id: string, field: string, value: string) => {
    if (!editorData) return;
    const updatedSkills = editorData.skills.map(group => {
      if (group.id === id) {
        if (field === "list") {
          return { ...group, list: value.split(",").map(s => s.trim()) };
        }
        return { ...group, [field]: value };
      }
      return group;
    });
    const updated = { ...editorData, skills: updatedSkills };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addSkillGroup = () => {
    if (!editorData) return;
    const newGroup = {
      id: Math.random().toString(36).substr(2, 9),
      category: "Skill Group",
      list: []
    };
    const updated = { ...editorData, skills: [...editorData.skills, newGroup] };
    setEditorData(updated);
    saveEditorData(updated);
    toast.success("Skill group added!");
  };

  const removeSkillGroup = (id: string) => {
    if (!editorData) return;
    const updated = { ...editorData, skills: editorData.skills.filter(g => g.id !== id) };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Certifications
  const handleCertificationItemChange = (idx: number, value: string) => {
    if (!editorData) return;
    const newList = [...editorData.certifications];
    newList[idx] = value;
    const updated = { ...editorData, certifications: newList };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addCertificationItem = () => {
    if (!editorData) return;
    const updated = { ...editorData, certifications: [...editorData.certifications, ""] };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const removeCertificationItem = (idx: number) => {
    if (!editorData) return;
    const updated = { ...editorData, certifications: editorData.certifications.filter((_, i) => i !== idx) };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Languages
  const handleLanguageItemChange = (idx: number, value: string) => {
    if (!editorData) return;
    const newList = [...editorData.languages];
    newList[idx] = value;
    const updated = { ...editorData, languages: newList };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addLanguageItem = () => {
    if (!editorData) return;
    const updated = { ...editorData, languages: [...editorData.languages, ""] };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const removeLanguageItem = (idx: number) => {
    if (!editorData) return;
    const updated = { ...editorData, languages: editorData.languages.filter((_, i) => i !== idx) };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Achievements
  const handleAchievementItemChange = (idx: number, value: string) => {
    if (!editorData) return;
    const newList = [...editorData.achievements];
    newList[idx] = value;
    const updated = { ...editorData, achievements: newList };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const addAchievementItem = () => {
    if (!editorData) return;
    const updated = { ...editorData, achievements: [...editorData.achievements, ""] };
    setEditorData(updated);
    saveEditorData(updated);
  };

  const removeAchievementItem = (idx: number) => {
    if (!editorData) return;
    const updated = { ...editorData, achievements: editorData.achievements.filter((_, i) => i !== idx) };
    setEditorData(updated);
    saveEditorData(updated);
  };

  // Calculate circular progress indicator based on completed sections
  const calculateCompleteness = (data: StructuredResume): number => {
    let score = 0;
    if (data.name) score += 15;
    if (data.email && data.phone) score += 15;
    if (data.summary) score += 20;
    if (data.experience.length > 0 && data.experience[0].company) score += 25;
    if (data.education.length > 0 && data.education[0].school) score += 15;
    if (data.skills.length > 0 && data.skills[0]) score += 10;
    return score;
  };

  // Save Title Changes
  const handleSaveTitle = () => {
    if (editingResume && tempTitle.trim()) {
      saveEditorData(editorData!, { jobTitle: tempTitle.trim() });
    }
    setIsTitleEditing(false);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading Resumes...</p>
        </div>
      </div>
    );
  }

  // Max Quota limit calculation based on tier
  const maxLimit = activePlan === "free" ? 2 : activePlan === "premium" ? 15 : (activePlan === "team" || activePlan === "promax") ? 999999 : 999999;

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans select-text">
      
      {/* Dynamic View: LIST VIEW OR EDITOR VIEW */}
      {!editingResume ? (
        
        /* MY RESUMES LIST PAGE (Image 1) */
        <>
          <Navbar />

          <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6">
            
            {/* Header Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 select-none">
                  My Resumes
                </h1>
                <p className="text-xs text-slate-400 font-semibold">
                  {resumes.length} / {maxLimit} resumes
                </p>
              </div>

              <Button
                onClick={handleCreateNewResume}
                disabled={actionLoading === "create" || resumes.length >= maxLimit}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold h-9 text-xs rounded-full px-5 flex items-center gap-1.5 shadow-lg shadow-violet-600/10"
              >
                {actionLoading === "create" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                New Resume
              </Button>
            </div>

            {/* Grid display options */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
              </div>
            ) : resumes.length === 0 ? (
              
              /* Empty state listing card options */
              <div className="flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl p-12 text-center bg-[#0e0f21]/40 min-h-[380px]">
                <FileText className="h-10 w-10 text-violet-500 mb-4 animate-pulse" />
                <h3 className="font-extrabold text-white text-lg">No Resumes Found</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed font-medium">
                  Create your first resume structure to build customized applications.
                </p>
                <div className="mt-6">
                  <Button 
                    onClick={handleCreateNewResume}
                    className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-full"
                  >
                    Get Started
                  </Button>
                </div>
              </div>

            ) : (

              /* Cards listing dashboard grid (Image 1) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                
                {resumes.map((resume) => {
                  const parsedData = parseResumeText(resume.optimizedText || resume.originalText);
                  const completionScore = calculateCompleteness(parsedData);
                  const isDeleting = actionLoading === `delete-${resume.id}`;

                  return (
                    <Card
                      key={resume.id}
                      className="group relative border-white/5 bg-[#0e0f21]/50 hover:bg-[#12132d]/40 hover:border-violet-500/40 cursor-pointer overflow-hidden transition-all duration-300 rounded-2xl shadow-xl flex flex-col justify-between"
                    >
                      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[160px] space-y-4">
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h3 className="font-bold text-base text-white truncate max-w-[150px]">
                              {resume.jobTitle || "Untitled Resume"}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-semibold select-none">
                              Edited {formatDate(resume.createdAt)}
                            </p>
                          </div>
                          
                          {/* Circular completeness badge */}
                          <div className="relative h-9 w-9 rounded-full bg-slate-950 flex items-center justify-center border border-white/10 text-[9px] font-black text-violet-400 select-none">
                            {completionScore}%
                          </div>
                        </div>

                        {/* Card controls footer (Image 1) */}
                        <div className="flex gap-2 items-center pt-2 border-t border-white/5">
                          <Button
                            onClick={() => handleOpenEditor(resume)}
                            variant="ghost"
                            className="flex-1 bg-[#161730]/40 border border-slate-700/50 hover:border-slate-500 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full h-8 text-[11px] font-bold gap-1.5"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            onClick={(e) => handleDeleteResume(e, resume.id)}
                            disabled={isDeleting}
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-400 border border-white/5"
                            title="Remove resume"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>

                      </CardContent>
                    </Card>
                  );
                })}

                {/* Dashed placeholder template card */}
                {resumes.length < maxLimit && (
                  <div
                    onClick={handleCreateNewResume}
                    className="border border-dashed border-white/10 bg-[#0e0f21]/20 hover:bg-[#12132d]/20 hover:border-violet-500/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[160px] select-none"
                  >
                    <Plus className="h-7 w-7 text-slate-500 group-hover:text-white mb-2" />
                    <span className="font-bold text-xs text-slate-400">New Resume</span>
                  </div>
                )}

              </div>
            )}

          </main>
        </>

      ) : (

        /* RESUME BUILDER SPLIT-SCREEN EDITOR PAGE (Image 2) */
        <div className="flex flex-col h-screen overflow-hidden bg-[#060713]">
          
          {/* Header Row */}
          <header className="border-b border-white/5 bg-[#060713]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => {
                  setEditingResume(null);
                  setEditorData(null);
                }}
                variant="ghost"
                className="text-slate-400 hover:text-white flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-white/5 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                Resumes
              </Button>

              <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                {isTitleEditing ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                      autoFocus
                      className="h-7 w-48 text-xs border-white/10 bg-[#070814] text-white rounded px-2"
                    />
                    <Button onClick={handleSaveTitle} size="sm" className="h-7 bg-violet-600 text-white text-[10px] rounded px-2.5">Save</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 select-text">
                    <span className="font-extrabold text-sm text-white">{editingResume.jobTitle || "Untitled Resume"}</span>
                    <button 
                      onClick={() => setIsTitleEditing(true)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleDownloadPDF(editingResume)}
                disabled={actionLoading === `pdf-${editingResume.id}`}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold h-8 text-[11px] rounded-full px-4 flex items-center gap-1.5 shadow-lg shadow-violet-600/10"
              >
                {actionLoading === `pdf-${editingResume.id}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                PDF
              </Button>
              <Button
                onClick={() => handleDownloadDOCX(editingResume)}
                disabled={actionLoading === `docx-${editingResume.id}`}
                variant="outline"
                className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white font-bold h-8 text-[11px] rounded-full px-4 flex items-center gap-1.5"
              >
                {actionLoading === `docx-${editingResume.id}` ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Word (DOCX)
              </Button>
            </div>
          </header>

          {/* Split Columns Layout */}
          <div className="flex-1 flex overflow-hidden w-full items-stretch">
            
            {/* Left Column: Editor fields scrollable inputs */}
            <div className="w-1/2 overflow-y-auto border-r border-white/5 px-6 py-6 space-y-4">
              
              {editorData && (
                <>
                  {/* Accordion 1: Personal info */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("personal")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-violet-500" />
                        Personal Info
                      </span>
                      {collapsibles.personal ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.personal && (
                      <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold select-none">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Full Name</label>
                          <Input
                            placeholder="e.g. Alexis Carter"
                            value={editorData.name}
                            onChange={(e) => handlePersonalInfoChange("name", e.target.value)}
                            className="h-9 border-white/5 bg-[#070814] text-white focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Email</label>
                          <Input
                            placeholder="e.g. alexis@mail.com"
                            value={editorData.email}
                            onChange={(e) => handlePersonalInfoChange("email", e.target.value)}
                            className="h-9 border-white/5 bg-[#070814] text-white focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Phone Number</label>
                          <Input
                            placeholder="e.g. +1 (555) 000-0000"
                            value={editorData.phone}
                            onChange={(e) => handlePersonalInfoChange("phone", e.target.value)}
                            className="h-9 border-white/5 bg-[#070814] text-white focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Location</label>
                          <Input
                            placeholder="e.g. Seattle, WA"
                            value={editorData.location}
                            onChange={(e) => handlePersonalInfoChange("location", e.target.value)}
                            className="h-9 border-white/5 bg-[#070814] text-white focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">LinkedIn Profile</label>
                          <Input
                            placeholder="e.g. linkedin.com/in/alexis"
                            value={editorData.linkedin}
                            onChange={(e) => handlePersonalInfoChange("linkedin", e.target.value)}
                            className="h-9 border-white/5 bg-[#070814] text-white focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Portfolio / Website</label>
                          <Input
                            placeholder="e.g. alexisdev.io"
                            value={editorData.website}
                            onChange={(e) => handlePersonalInfoChange("website", e.target.value)}
                            className="h-9 border-white/5 bg-[#070814] text-white focus:border-violet-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Professional Summary */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("summary")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-500" />
                        Professional Summary
                      </span>
                      {collapsibles.summary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.summary && (
                      <div className="p-4 space-y-3 select-none">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Summary Text</label>
                          <Button
                            type="button"
                            onClick={handleImproveSummary}
                            disabled={actionLoading === "improve-summary"}
                            className="bg-violet-950/40 border border-violet-500/20 text-violet-400 hover:text-white hover:bg-violet-900 h-7 text-[10px] font-bold px-3 gap-1 rounded-full"
                          >
                            {actionLoading === "improve-summary" ? (
                              <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Improve
                          </Button>
                        </div>
                        <textarea
                          placeholder="Write a concise overview of your skills and career targets..."
                          value={editorData.summary}
                          onChange={(e) => handleSummaryChange(e.target.value)}
                          rows={4}
                          className="w-full p-2.5 border border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500 outline-none focus:ring-1 focus:ring-violet-500 font-sans text-xs resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Accordion 3: Experience Cards */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("experience")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-violet-500" />
                        Experience
                      </span>
                      {collapsibles.experience ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.experience && (
                      <div className="p-4 space-y-4 select-none">
                        {editorData.experience.map((exp) => (
                          <div key={exp.id} className="border border-white/5 bg-[#070814]/30 rounded-lg p-3 space-y-3 relative">
                            <button
                              onClick={() => removeExperienceItem(exp.id)}
                              className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Company</label>
                                <Input
                                  value={exp.company}
                                  onChange={(e) => handleExpChange(exp.id, "company", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Title</label>
                                <Input
                                  value={exp.title}
                                  onChange={(e) => handleExpChange(exp.id, "title", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                            </div>

                            <div className="space-y-1 text-xs">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Dates Active</label>
                              <Input
                                value={exp.date}
                                onChange={(e) => handleExpChange(exp.id, "date", e.target.value)}
                                className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                              />
                            </div>

                            {/* Bullet points mapping */}
                            <div className="space-y-2">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Description Bullets</label>
                              {exp.bullets.map((bullet, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                  <span className="text-slate-500 text-xs select-none mt-2">•</span>
                                  <textarea
                                    value={bullet}
                                    onChange={(e) => handleExpBulletChange(exp.id, idx, e.target.value)}
                                    className="w-full min-h-[38px] py-2 px-3 rounded-lg border border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs resize-none overflow-hidden"
                                    placeholder="Add detail bullet..."
                                    rows={1}
                                    onInput={(e) => {
                                      const target = e.target as HTMLTextAreaElement;
                                      target.style.height = "auto";
                                      target.style.height = `${target.scrollHeight}px`;
                                    }}
                                  />
                                  <button
                                    onClick={() => removeExpBullet(exp.id, idx)}
                                    className="text-slate-600 hover:text-red-400 p-1 mt-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                onClick={() => addExpBullet(exp.id)}
                                className="bg-transparent border border-white/5 text-slate-400 hover:text-white h-7 text-[10px] rounded-lg px-3"
                              >
                                + Add Bullet
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button
                          onClick={addExperienceItem}
                          className="w-full bg-[#12132d]/40 border border-white/5 text-slate-300 hover:text-white h-8 text-[11px] font-bold rounded-lg"
                        >
                          + Add Experience
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Accordion 4: Education Details */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("education")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-violet-500" />
                        Education
                      </span>
                      {collapsibles.education ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.education && (
                      <div className="p-4 space-y-4 select-none">
                        {editorData.education.map((edu) => (
                          <div key={edu.id} className="border border-white/5 bg-[#070814]/30 rounded-lg p-3 space-y-3 relative">
                            <button
                              onClick={() => removeEducationItem(edu.id)}
                              className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Institution</label>
                                <Input
                                  value={edu.school}
                                  onChange={(e) => handleEduChange(edu.id, "school", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Degree</label>
                                <Input
                                  value={edu.degree}
                                  onChange={(e) => handleEduChange(edu.id, "degree", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Field of Study</label>
                                <Input
                                  value={edu.field}
                                  onChange={(e) => handleEduChange(edu.id, "field", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Dates/Years</label>
                                <Input
                                  value={edu.date}
                                  onChange={(e) => handleEduChange(edu.id, "date", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">CGPA / GPA (Optional)</label>
                                <Input
                                  value={edu.gpa || ""}
                                  onChange={(e) => handleEduChange(edu.id, "gpa", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                  placeholder="e.g. 9.8/10 or 3.9/4.0"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          onClick={addEducationItem}
                          className="w-full bg-[#12132d]/40 border border-white/5 text-slate-300 hover:text-white h-8 text-[11px] font-bold rounded-lg"
                        >
                          + Add Education
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Accordion 5: Projects Info */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("projects")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <FolderGit className="h-4 w-4 text-violet-500" />
                        Projects
                      </span>
                      {collapsibles.projects ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.projects && (
                      <div className="p-4 space-y-4 select-none">
                        {editorData.projects.map((proj) => (
                          <div key={proj.id} className="border border-white/5 bg-[#070814]/30 rounded-lg p-3 space-y-3 relative">
                            <button
                              onClick={() => removeProjectItem(proj.id)}
                              className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Project Name</label>
                                <Input
                                  value={proj.name}
                                  onChange={(e) => handleProjChange(proj.id, "name", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tech Stack</label>
                                <Input
                                  value={proj.techStack}
                                  onChange={(e) => handleProjChange(proj.id, "techStack", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                  placeholder="e.g. React, Node.js, PostgreSQL"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Link (Optional)</label>
                                <Input
                                  value={proj.link}
                                  onChange={(e) => handleProjChange(proj.id, "link", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                  placeholder="e.g. github.com/username/project"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Date/Duration</label>
                                <Input
                                  value={proj.date}
                                  onChange={(e) => handleProjChange(proj.id, "date", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                  placeholder="e.g. Jan 2024"
                                />
                              </div>
                            </div>

                            {/* Bullets mapping */}
                            <div className="space-y-2">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Description Bullets</label>
                              {proj.bullets.map((bullet, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                  <span className="text-slate-500 text-xs select-none mt-2">•</span>
                                  <textarea
                                    value={bullet}
                                    onChange={(e) => handleProjBulletChange(proj.id, idx, e.target.value)}
                                    className="w-full min-h-[38px] py-2 px-3 rounded-lg border border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs resize-none overflow-hidden"
                                    placeholder="Add project bullet..."
                                    rows={1}
                                    onInput={(e) => {
                                      const target = e.target as HTMLTextAreaElement;
                                      target.style.height = "auto";
                                      target.style.height = `${target.scrollHeight}px`;
                                    }}
                                  />
                                  <button
                                    onClick={() => removeProjBullet(proj.id, idx)}
                                    className="text-slate-600 hover:text-red-400 p-1 mt-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                onClick={() => addProjBullet(proj.id)}
                                className="bg-[#12132d]/40 border border-white/5 text-slate-400 hover:text-white h-7 text-[10px] rounded-lg px-3"
                              >
                                + Add Bullet
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button
                          onClick={addProjectItem}
                          className="w-full bg-[#12132d]/40 border border-white/5 text-slate-300 hover:text-white h-8 text-[11px] font-bold rounded-lg"
                        >
                          + Add Project
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Accordion 6: Skills Details */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("skills")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-violet-500" />
                        Skills
                      </span>
                      {collapsibles.skills ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.skills && (
                      <div className="p-4 space-y-4 select-none">
                        {editorData.skills.map((group) => (
                          <div key={group.id} className="border border-white/5 bg-[#070814]/30 rounded-lg p-3 space-y-3 relative">
                            <button
                              onClick={() => removeSkillGroup(group.id)}
                              className="absolute top-2 right-2 text-slate-500 hover:text-red-400"
                              title="Delete Group"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Category</label>
                                <Input
                                  placeholder="e.g. Languages"
                                  value={group.category}
                                  onChange={(e) => handleSkillGroupChange(group.id, "category", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Skills (Comma-separated)</label>
                                <Input
                                  placeholder="e.g. React, Node.js"
                                  value={group.list.join(", ")}
                                  onChange={(e) => handleSkillGroupChange(group.id, "list", e.target.value)}
                                  className="h-8 border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          onClick={addSkillGroup}
                          className="w-full bg-[#12132d]/40 border border-white/5 text-slate-300 hover:text-white h-8 text-[11px] font-bold rounded-lg"
                        >
                          + Add Skill Group
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Accordion 7: Certifications */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("certifications")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-violet-500" />
                        Certifications
                      </span>
                      {collapsibles.certifications ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.certifications && (
                      <div className="p-4 space-y-3 select-none">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Certifications Bullets</label>
                        {editorData.certifications.map((cert, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <span className="text-slate-500 text-xs select-none mt-2">•</span>
                            <textarea
                              value={cert}
                              onChange={(e) => handleCertificationItemChange(idx, e.target.value)}
                              className="w-full min-h-[38px] py-2 px-3 rounded-lg border border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs resize-none overflow-hidden"
                              placeholder="e.g. AWS Certified Solutions Architect"
                              rows={1}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                            />
                            <button
                              onClick={() => removeCertificationItem(idx)}
                              className="text-slate-600 hover:text-red-400 p-1 mt-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          onClick={addCertificationItem}
                          className="bg-[#12132d]/40 border border-white/5 text-slate-400 hover:text-white h-7 text-[10px] rounded-lg px-3 animate-none"
                        >
                          + Add Certification
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Accordion 8: Languages */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("languages")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-violet-500" />
                        Languages
                      </span>
                      {collapsibles.languages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.languages && (
                      <div className="p-4 space-y-3 select-none">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Languages Bullets</label>
                        {editorData.languages.map((lang, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <span className="text-slate-500 text-xs select-none mt-2">•</span>
                            <textarea
                              value={lang}
                              onChange={(e) => handleLanguageItemChange(idx, e.target.value)}
                              className="w-full min-h-[38px] py-2 px-3 rounded-lg border border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs resize-none overflow-hidden"
                              placeholder="e.g. English"
                              rows={1}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                            />
                            <button
                              onClick={() => removeLanguageItem(idx)}
                              className="text-slate-600 hover:text-red-400 p-1 mt-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          onClick={addLanguageItem}
                          className="bg-[#12132d]/40 border border-white/5 text-slate-400 hover:text-white h-7 text-[10px] rounded-lg px-3"
                        >
                          + Add Language
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Accordion 9: Achievements */}
                  <div className="border border-white/5 bg-[#0e0f21]/30 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCollapsible("achievements")}
                      className="w-full flex items-center justify-between p-4 bg-[#0e0f21]/40 border-b border-white/5 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-violet-500" />
                        Achievements
                      </span>
                      {collapsibles.achievements ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {collapsibles.achievements && (
                      <div className="p-4 space-y-3 select-none">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Achievements Bullets</label>
                        {editorData.achievements.map((ach, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <span className="text-slate-500 text-xs select-none mt-2">•</span>
                            <textarea
                              value={ach}
                              onChange={(e) => handleAchievementItemChange(idx, e.target.value)}
                              className="w-full min-h-[38px] py-2 px-3 rounded-lg border border-white/5 bg-[#070814] text-white focus:border-violet-500 text-xs resize-none overflow-hidden"
                              placeholder="e.g. Won 1st place in Smart India Hackathon"
                              rows={1}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                            />
                            <button
                              onClick={() => removeAchievementItem(idx)}
                              className="text-slate-600 hover:text-red-400 p-1 mt-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          onClick={addAchievementItem}
                          className="bg-[#12132d]/40 border border-white/5 text-slate-400 hover:text-white h-7 text-[10px] rounded-lg px-3"
                        >
                          + Add Achievement
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Bottom promo promotion banner (Image 2) */}
              {activePlan !== "team" && activePlan !== "promax" && (
                <div className="p-4 border border-white/5 bg-[#0c0d1b] rounded-xl flex items-center justify-center gap-2 text-center text-slate-400 font-bold text-[10px] tracking-wide select-none">
                  <Sparkles className="h-4.5 w-4.5 text-violet-500 animate-pulse" />
                  <span>Upgrade to Premium to unlock AI enhancements and bulk export templates.</span>
                </div>
              )}

            </div>

            {/* Right Column: Live Professional Preview sheet matching HTML design (Image 2) */}
            <div className="w-1/2 bg-[#0a0b16] overflow-y-auto px-10 py-10 flex justify-center">
              
              {editorData && (
                <div 
                  className="w-full max-w-[800px] min-h-[1056px] bg-white text-black p-[25mm] shadow-2xl flex flex-col font-serif select-text border border-slate-300"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  
                  {/* Name center header */}
                  <h1 className="text-2xl font-bold uppercase text-center tracking-wide leading-tight">
                    {editorData.name || "Jane Smith"}
                  </h1>

                  {/* Contact parts centered */}
                  <div className="text-[10px] text-slate-700 text-center mt-1 mb-4 font-normal flex flex-wrap justify-center gap-1.5 leading-normal">
                    {[editorData.email, editorData.phone, editorData.location, editorData.linkedin, editorData.website]
                      .filter(Boolean)
                      .map((val, idx, arr) => (
                        <React.Fragment key={idx}>
                          <span>{val}</span>
                          {idx < arr.length - 1 && <span className="text-slate-400 select-none">|</span>}
                        </React.Fragment>
                      ))
                    }
                  </div>

                  {/* Sections list mapping */}
                  <div className="space-y-4 text-xs font-normal">
                    
                    {/* Summary Section */}
                    {editorData.summary && (
                      <div className="space-y-1.5">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Professional Summary
                        </h2>
                        <p className="text-justify leading-relaxed">
                          {renderRichText(editorData.summary)}
                        </p>
                      </div>
                    )}

                    {/* Experience Section */}
                    {editorData.experience.length > 0 && (
                      <div className="space-y-3">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Experience
                        </h2>
                        <div className="space-y-2.5">
                          {editorData.experience.map(exp => (
                            <div key={exp.id} className="space-y-1">
                              <div className="flex justify-between items-baseline font-bold">
                                <span>{renderRichText(exp.company)} {exp.title ? `— ${exp.title}` : ""}</span>
                                <span className="font-normal italic text-[10px]">{exp.date}</span>
                              </div>
                              {exp.bullets.length > 0 && (
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {exp.bullets.filter(Boolean).map((bullet, idx) => (
                                    <li key={idx} className="text-justify leading-relaxed">
                                      {renderRichText(bullet)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education Section */}
                    {editorData.education.length > 0 && (
                      <div className="space-y-2">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Education
                        </h2>
                        <div className="space-y-1.5">
                          {editorData.education.map(edu => (
                            <div key={edu.id} className="space-y-0.5">
                              <div className="flex justify-between items-baseline">
                                <div>
                                  <span className="font-bold">{edu.school}</span>
                                  {edu.degree && <span className="italic"> — {edu.degree}</span>}
                                  {edu.field && <span> in {edu.field}</span>}
                                </div>
                                <span className="font-normal italic text-[10px]">{edu.date}</span>
                              </div>
                              {edu.gpa && (
                                <div className="flex justify-end text-[10px] text-slate-700 italic font-bold">
                                  <span>CGPA: {edu.gpa}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects Section */}
                    {editorData.projects.length > 0 && (
                      <div className="space-y-3">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Projects
                        </h2>
                        <div className="space-y-2">
                          {editorData.projects.map(proj => (
                            <div key={proj.id} className="space-y-0.5">
                              <div className="flex justify-between items-baseline font-bold">
                                <span>
                                  {proj.name}
                                  {proj.techStack ? " | " : ""}
                                  {proj.techStack && <span className="font-normal italic">{proj.techStack}</span>}
                                  {proj.link && <span className="font-normal text-[10px] text-slate-500 ml-1">({proj.link})</span>}
                                </span>
                                <span className="font-normal italic text-[10px]">{proj.date}</span>
                              </div>
                              {proj.bullets && proj.bullets.length > 0 && (
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {proj.bullets.filter(Boolean).map((bullet, idx) => (
                                    <li key={idx} className="text-justify leading-relaxed">
                                      {renderRichText(bullet)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills Section */}
                    {editorData.skills.length > 0 && (
                      <div className="space-y-1">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Skills
                        </h2>
                        <div className="space-y-0.5">
                          {editorData.skills.map(group => (
                            <p key={group.id} className="leading-relaxed">
                              <span className="font-bold">{group.category}:</span> {group.list.join(", ")}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications Section */}
                    {editorData.certifications && editorData.certifications.length > 0 && editorData.certifications[0] && (
                      <div className="space-y-1">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Certifications
                        </h2>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {editorData.certifications.filter(Boolean).map((cert, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {renderRichText(cert)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Languages Section */}
                    {editorData.languages && editorData.languages.length > 0 && editorData.languages[0] && (
                      <div className="space-y-1">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Languages
                        </h2>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {editorData.languages.filter(Boolean).map((lang, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {renderRichText(lang)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Achievements Section */}
                    {editorData.achievements && editorData.achievements.length > 0 && editorData.achievements[0] && (
                      <div className="space-y-1">
                        <h2 className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-0.5">
                          Achievements
                        </h2>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {editorData.achievements.filter(Boolean).map((ach, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {renderRichText(ach)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
