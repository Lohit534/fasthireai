"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useResumeStore } from "@/store/useResumeStore";
import { generateUUID } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Wrench,
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
  BookOpen
} from "lucide-react";
import { toast } from "react-hot-toast";

// Definitions of Form Data interfaces
interface Experience {
  company: string;
  title: string;
  location: string;
  dates: string;
  bullets: string;
}

interface Education {
  school: string;
  degree: string;
  fieldOfStudy: string;
  dates: string;
}

interface Project {
  name: string;
  role: string;
  techStack: string;
  bullets: string;
}

const POPULAR_SKILLS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js", 
  "Python", "Java", "C++", "SQL", "PostgreSQL", "MongoDB", 
  "Tailwind CSS", "Git", "Docker", "AWS", "Google Cloud", 
  "Machine Learning", "System Design", "Agile", "Project Management"
];

const SAMPLE_DATA = {
  contact: {
    fullName: "Alex Rivera",
    title: "Full Stack Engineer",
    email: "alex.rivera@fasthire.ai",
    phone: "(555) 019-2834",
    linkedin: "linkedin.com/in/alex-rivera",
    portfolio: "alexrivera.dev"
  },
  experience: [
    {
      company: "InnovateTech Solutions",
      title: "Senior Software Engineer",
      location: "San Francisco, CA",
      dates: "2023 - Present",
      bullets: "Led a team of 4 engineers to migrate legacy monolith architecture to microservices using Next.js and Go, reducing cloud costs by 32%.\nOptimized backend REST API responses, yielding a 40% reduction in page load latency for over 250k daily active users.\nIntegrated custom LLM prompt workflows to automate report generation, boosting department efficiency by 15%."
    },
    {
      company: "CloudFlow Inc.",
      title: "Software Engineer II",
      location: "Seattle, WA",
      dates: "2021 - 2023",
      bullets: "Developed responsive interactive analytics dashboards utilizing React, TypeScript, and Tailwind CSS.\nBuilt and maintained secure CI/CD pipelines deploying containerized Docker applications on AWS ECS."
    }
  ],
  education: [
    {
      school: "University of Washington",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      dates: "2017 - 2021"
    }
  ],
  projects: [
    {
      name: "FastHire AI Resume Scoring Engine",
      role: "Lead Creator",
      techStack: "Next.js, Python, FastAPI, Gemini AI",
      bullets: "Created a semantic ATS matching system using BERT embeddings that maps job description keywords directly to resume bullets.\nImplemented real-time visual metrics scoring with responsive UI component overlays."
    }
  ],
  skills: ["React", "Next.js", "TypeScript", "Node.js", "Python", "SQL", "Docker", "AWS", "Git", "Agile"]
};

export default function ResumeBuilderPage() {
  const router = useRouter();
  const { setResumeText } = useResumeStore();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  // Form States
  const [contact, setContact] = useState({
    fullName: "",
    title: "",
    email: "",
    phone: "",
    linkedin: "",
    portfolio: ""
  });

  const [experience, setExperience] = useState<Experience[]>([
    { company: "", title: "", location: "", dates: "", bullets: "" }
  ]);

  const [education, setEducation] = useState<Education[]>([
    { school: "", degree: "", fieldOfStudy: "", dates: "" }
  ]);

  const [projects, setProjects] = useState<Project[]>([
    { name: "", role: "", techStack: "", bullets: "" }
  ]);

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // 1. Auth Guard Checks
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to access the resume builder.");
          router.push("/auth/login");
        } else {
          setAuthLoading(false);
        }
      } catch (err) {
        toast.error("Authentication check failed.");
        router.push("/auth/login");
      }
    }
    checkAuth();
  }, [router]);

  // Load sample data helper
  const handleLoadSample = () => {
    setContact(SAMPLE_DATA.contact);
    setExperience(SAMPLE_DATA.experience);
    setEducation(SAMPLE_DATA.education);
    setProjects(SAMPLE_DATA.projects);
    setSkills(SAMPLE_DATA.skills);
    toast.success("Loaded professional template data!");
  };

  // Experience Handlers
  const addExperience = () => {
    setExperience([...experience, { company: "", title: "", location: "", dates: "", bullets: "" }]);
  };

  const removeExperience = (index: number) => {
    const nextExp = [...experience];
    nextExp.splice(index, 1);
    setExperience(nextExp);
  };

  const updateExperience = (index: number, field: keyof Experience, val: string) => {
    const nextExp = [...experience];
    nextExp[index][field] = val;
    setExperience(nextExp);
  };

  // Education Handlers
  const addEducation = () => {
    setEducation([...education, { school: "", degree: "", fieldOfStudy: "", dates: "" }]);
  };

  const removeEducation = (index: number) => {
    const nextEdu = [...education];
    nextEdu.splice(index, 1);
    setEducation(nextEdu);
  };

  const updateEducation = (index: number, field: keyof Education, val: string) => {
    const nextEdu = [...education];
    nextEdu[index][field] = val;
    setEducation(nextEdu);
  };

  // Projects Handlers
  const addProject = () => {
    setProjects([...projects, { name: "", role: "", techStack: "", bullets: "" }]);
  };

  const removeProject = (index: number) => {
    const nextProj = [...projects];
    nextProj.splice(index, 1);
    setProjects(nextProj);
  };

  const updateProject = (index: number, field: keyof Project, val: string) => {
    const nextProj = [...projects];
    nextProj[index][field] = val;
    setProjects(nextProj);
  };

  // Skills Handlers
  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (clean && !skills.includes(clean)) {
      setSkills([...skills, clean]);
    }
    setNewSkill("");
  };

  const removeSkill = (index: number) => {
    const nextSkills = [...skills];
    nextSkills.splice(index, 1);
    setSkills(nextSkills);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill(newSkill);
    }
  };

  // Markdown Generator & Sync
  const handleSyncResume = async () => {
    if (!contact.fullName.trim()) {
      toast.error("Candidate full name is required.");
      setCurrentStep(1);
      return;
    }

    let md = `# ${contact.fullName.trim()}\n`;
    if (contact.title.trim()) md += `${contact.title.trim()}\n`;
    
    const contactLinks = [
      contact.email.trim() ? `Email: ${contact.email.trim()}` : "",
      contact.phone.trim() ? `Phone: ${contact.phone.trim()}` : "",
      contact.linkedin.trim() ? `LinkedIn: ${contact.linkedin.trim()}` : "",
      contact.portfolio.trim() ? `Portfolio: ${contact.portfolio.trim()}` : ""
    ].filter(Boolean);

    if (contactLinks.length > 0) {
      md += `${contactLinks.join(" | ")}\n\n`;
    } else {
      md += `\n`;
    }

    // Experience Section
    const activeExp = experience.filter(exp => exp.company.trim() || exp.title.trim());
    if (activeExp.length > 0) {
      md += `## Professional Experience\n\n`;
      activeExp.forEach((exp) => {
        md += `**${exp.title.trim() || "Job Title"}**   ${exp.dates.trim()}\n`;
        md += `${exp.company.trim() || "Company Name"}${exp.location.trim() ? `, ${exp.location.trim()}` : ""}\n`;
        if (exp.bullets.trim()) {
          const lines = exp.bullets.split("\n").filter(l => l.trim());
          lines.forEach((line) => {
            let clean = line.trim();
            if (clean.startsWith("-") || clean.startsWith("*")) {
               clean = clean.substring(1).trim();
            }
            md += `- ${clean}\n`;
          });
        }
        md += `\n`;
      });
    }

    // Education Section
    const activeEdu = education.filter(edu => edu.school.trim() || edu.degree.trim());
    if (activeEdu.length > 0) {
      md += `## Education\n\n`;
      activeEdu.forEach((edu) => {
        const degreeText = `${edu.degree.trim() || "Degree"}${edu.fieldOfStudy.trim() ? ` in ${edu.fieldOfStudy.trim()}` : ""}`;
        md += `**${degreeText}**   ${edu.dates.trim()}\n`;
        md += `${edu.school.trim() || "University"}\n\n`;
      });
    }

    // Projects Section
    const activeProj = projects.filter(proj => proj.name.trim() || proj.role.trim());
    if (activeProj.length > 0) {
      md += `## Projects\n\n`;
      activeProj.forEach((proj) => {
        md += `**${proj.name.trim() || "Project Name"}** | ${proj.role.trim() || "Role"}\n`;
        if (proj.techStack.trim()) {
          md += `*Tech Stack: ${proj.techStack.trim()}*\n`;
        }
        if (proj.bullets.trim()) {
          const lines = proj.bullets.split("\n").filter(l => l.trim());
          lines.forEach((line) => {
            let clean = line.trim();
            if (clean.startsWith("-") || clean.startsWith("*")) {
              clean = clean.substring(1).trim();
            }
            md += `- ${clean}\n`;
          });
        }
        md += `\n`;
      });
    }

    // Skills Section
    if (skills.length > 0) {
      md += `## Skills\n\n`;
      md += `**Technical Skills:** ${skills.join(", ")}\n`;
    }

    const finalMarkdown = md.trim();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Ensure user row is upserted in the database via the credits endpoint
        await fetch("/api/credits").catch(() => {});

        const res = await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: generateUUID(),
            originalText: finalMarkdown,
            optimizedText: finalMarkdown,
            jobDescription: "",
            jobTitle: `${contact.fullName.trim()}'s Resume`,
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
      }
    } catch (err: any) {
      toast.error("Failed to save resume record: " + err.message);
    }
    
    // Save to Zustand store
    setResumeText(finalMarkdown);
    toast.success("Resume structure synchronized and saved!");
    router.push("/dashboard");
  };

  const steps = [
    { number: 1, label: "Contact", icon: User },
    { number: 2, label: "Experience", icon: Briefcase },
    { number: 3, label: "Education", icon: GraduationCap },
    { number: 4, label: "Projects", icon: FolderGit2 },
    { number: 5, label: "Skills", icon: Wrench },
  ];

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying authorization access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 py-8">
        {/* Back Link */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLoadSample}
            className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 font-bold"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
            Load Sample Template
          </Button>
        </div>

        {/* Header Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-600" />
            Interactive Resume Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build your professional resume step-by-step. All data translates to ATS-optimized markdown.
          </p>
        </div>

        {/* Horizontal Step Progress */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl mb-8">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-center relative">
              {/* Backing Line */}
              <div className="absolute left-[8%] right-[8%] top-[35%] h-[2px] bg-gray-100 z-0">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />
              </div>

              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = step.number === currentStep;
                const isCompleted = step.number < currentStep;

                return (
                  <button
                    key={step.number}
                    onClick={() => setCurrentStep(step.number)}
                    className="flex flex-col items-center relative z-10 focus:outline-none group flex-1"
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                        isActive
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                          : isCompleted
                          ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                          : "border-gray-200 bg-white text-gray-400 group-hover:border-gray-300"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span
                      className={`text-[10px] md:text-xs font-semibold mt-2 transition-colors ${
                        isActive ? "text-slate-950 font-bold" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Wizard Main Card */}
        <Card className="border-gray-200 bg-white shadow-md rounded-2xl min-h-[420px]">
          <CardContent className="p-6 md:p-8">
            
            {/* Step 1: Contact Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Let employers know who you are and how to reach you.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name *</label>
                    <Input
                      placeholder="e.g. Alex Rivera"
                      value={contact.fullName}
                      onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Professional Title</label>
                    <Input
                      placeholder="e.g. Senior Software Engineer"
                      value={contact.title}
                      onChange={(e) => setContact({ ...contact, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email Address</label>
                    <Input
                      type="email"
                      placeholder="e.g. name@example.com"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Phone Number</label>
                    <Input
                      placeholder="e.g. (555) 019-2834"
                      value={contact.phone}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">LinkedIn URL</label>
                    <Input
                      placeholder="e.g. linkedin.com/in/username"
                      value={contact.linkedin}
                      onChange={(e) => setContact({ ...contact, linkedin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Portfolio Website</label>
                    <Input
                      placeholder="e.g. portfolio.com"
                      value={contact.portfolio}
                      onChange={(e) => setContact({ ...contact, portfolio: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Experience */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Work Experience</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Detail your career history. Add one block per role.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addExperience}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Work
                  </Button>
                </div>

                <div className="space-y-6">
                  {experience.map((exp, idx) => (
                    <Card key={idx} className="border-gray-200 relative bg-gray-50/50">
                      {experience.length > 1 && (
                        <button
                          onClick={() => removeExperience(idx)}
                          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Company Name</label>
                            <Input
                              placeholder="e.g. Google"
                              value={exp.company}
                              onChange={(e) => updateExperience(idx, "company", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Job Title</label>
                            <Input
                              placeholder="e.g. Systems Architect"
                              value={exp.title}
                              onChange={(e) => updateExperience(idx, "title", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Location</label>
                            <Input
                              placeholder="e.g. New York, NY"
                              value={exp.location}
                              onChange={(e) => updateExperience(idx, "location", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Dates (Start - End)</label>
                            <Input
                              placeholder="e.g. 2022 - Present"
                              value={exp.dates}
                              onChange={(e) => updateExperience(idx, "dates", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">Description (One bullet per line)</label>
                          <Textarea
                            placeholder="- Managed a cloud infrastructure rewrite using Kubernetes..."
                            rows={3}
                            value={exp.bullets}
                            onChange={(e) => updateExperience(idx, "bullets", e.target.value)}
                            className="bg-white border-gray-200"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Education */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Education History</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Include high schools, universities, or bootcamps.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addEducation}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Education
                  </Button>
                </div>

                <div className="space-y-6">
                  {education.map((edu, idx) => (
                    <Card key={idx} className="border-gray-200 relative bg-gray-50/50">
                      {education.length > 1 && (
                        <button
                          onClick={() => removeEducation(idx)}
                          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">School Name</label>
                            <Input
                              placeholder="e.g. Stanford University"
                              value={edu.school}
                              onChange={(e) => updateEducation(idx, "school", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Degree</label>
                            <Input
                              placeholder="e.g. Bachelor of Science"
                              value={edu.degree}
                              onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Field of Study</label>
                            <Input
                              placeholder="e.g. Computer Engineering"
                              value={edu.fieldOfStudy}
                              onChange={(e) => updateEducation(idx, "fieldOfStudy", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Dates / Graduation Year</label>
                            <Input
                              placeholder="e.g. 2018 - 2022"
                              value={edu.dates}
                              onChange={(e) => updateEducation(idx, "dates", e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Projects */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Projects</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Showcase side projects, open-source work, or case studies.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addProject}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Project
                  </Button>
                </div>

                <div className="space-y-6">
                  {projects.map((proj, idx) => (
                    <Card key={idx} className="border-gray-200 relative bg-gray-50/50">
                      {projects.length > 1 && (
                        <button
                          onClick={() => removeProject(idx)}
                          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Project Name</label>
                            <Input
                              placeholder="e.g. Chat App"
                              value={proj.name}
                              onChange={(e) => updateProject(idx, "name", e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Your Role</label>
                            <Input
                              placeholder="e.g. Creator / Full Stack Developer"
                              value={proj.role}
                              onChange={(e) => updateProject(idx, "role", e.target.value)}
                            />
                          </div>
                          <div className="col-span-1 md:col-span-2 space-y-1">
                            <label className="text-[11px] font-bold text-slate-700">Technologies (Tech Stack)</label>
                            <Input
                              placeholder="e.g. React, socket.io, Node.js"
                              value={proj.techStack}
                              onChange={(e) => updateProject(idx, "techStack", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">Description (One bullet per line)</label>
                          <Textarea
                            placeholder="- Built full duplex client-server messaging pipelines using WebSockets..."
                            rows={3}
                            value={proj.bullets}
                            onChange={(e) => updateProject(idx, "bullets", e.target.value)}
                            className="bg-white border-gray-200"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Skills Tag Inputs */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Skills</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Specify your core technical competencies or soft skills.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill (e.g. Kubernetes, Python) and press Enter"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button onClick={() => addSkill(newSkill)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                      Add
                    </Button>
                  </div>

                  {/* Skills tags list */}
                  <div className="min-h-[60px] p-3 border border-gray-200 rounded-xl flex flex-wrap gap-2 items-center bg-gray-50/50">
                    {skills.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No skills added yet. Use search/add or click suggestions below.</span>
                    ) : (
                      skills.map((skill, idx) => (
                        <Badge
                          key={idx}
                          className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs py-1 px-2.5 flex items-center gap-1.5 rounded-lg shadow-sm"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(idx)}
                            className="hover:bg-indigo-200 rounded-full p-0.5 text-indigo-500 hover:text-indigo-800 shrink-0"
                            title="Remove skill"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Suggested Popular Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SKILLS.map((suggested) => {
                        const hasSkill = skills.includes(suggested);
                        return (
                          <button
                            key={suggested}
                            disabled={hasSkill}
                            onClick={() => addSkill(suggested)}
                            className={`text-[11px] font-medium py-1 px-2 rounded-full border transition-all ${
                              hasSkill
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30"
                            }`}
                          >
                            + {suggested}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Row */}
            <Separator className="my-6 border-gray-100" />
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="border-gray-200 text-slate-700 hover:bg-gray-50 font-bold"
              >
                <ChevronLeft className="h-4.5 w-4.5 mr-1" />
                Previous
              </Button>

              {currentStep < 5 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Next Step
                  <ChevronRight className="h-4.5 w-4.5 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSyncResume}
                  className="bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-indigo-600/10"
                >
                  <Sparkles className="h-4.5 w-4.5 mr-1.5" />
                  Sync & Optimize Resume
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
