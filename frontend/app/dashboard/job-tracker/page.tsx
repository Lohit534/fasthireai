"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  Calendar, 
  DollarSign, 
  Link2, 
  Edit, 
  Loader2, 
  ArrowRight,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Job {
  id: string;
  company: string;
  title: string;
  salary?: string;
  url?: string;
  date: string;
  notes?: string;
  resumeId?: string;
  status: "wishlist" | "applied" | "interviewing" | "offered" | "rejected";
}

interface MiniResume {
  id: string;
  jobTitle?: string | null;
  company?: string | null;
  createdAt: string;
}

const COLUMNS: { id: Job["status"]; label: string; color: string; border: string }[] = [
  { id: "wishlist", label: "Wishlist", color: "bg-indigo-500/10 text-indigo-400", border: "border-indigo-500/30" },
  { id: "applied", label: "Applied", color: "bg-blue-500/10 text-blue-400", border: "border-blue-500/30" },
  { id: "interviewing", label: "Interviewing", color: "bg-amber-500/10 text-amber-400", border: "border-amber-500/30" },
  { id: "offered", label: "Offered", color: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/30" },
  { id: "rejected", label: "Rejected", color: "bg-rose-500/10 text-rose-400", border: "border-rose-500/30" }
];

export default function JobTrackerPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<MiniResume[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals / Editors
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  
  // Form Inputs
  const [formCompany, setFormCompany] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formSalary, setFormSalary] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formResumeId, setFormResumeId] = useState("");
  const [formStatus, setFormStatus] = useState<Job["status"]>("wishlist");

  // Dragging reference
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

  // 1. Session check & resumes load
  useEffect(() => {
    async function initPage() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          toast.error("Please sign in to view your Job Tracker.");
          router.push("/auth/login");
          return;
        }
        
        const user = data.user;
        setUserId(user.id);
        setAuthLoading(false);

        // Fetch user's saved resumes via history API to ensure correct activeUserId resolution
        let dbData: any[] = [];
        let dbError: any = null;
        try {
          const historyRes = await fetch("/api/history");
          if (historyRes.ok) {
            dbData = await historyRes.json();
          } else {
            dbError = new Error("Failed to load resumes");
          }
        } catch (e) {
          dbError = e;
        }

        if (!dbError && dbData) {
          setResumes(dbData as MiniResume[]);
        }

        // Load jobs from localStorage
        const storedJobs = localStorage.getItem(`fastHire_jobs_${user.id}`);
        if (storedJobs) {
          try {
            setJobs(JSON.parse(storedJobs));
          } catch (e) {
            console.error("Failed to parse local jobs database.", e);
          }
        }
      } catch (err) {
        toast.error("Could not load user details.");
        router.push("/auth/login");
      }
    }
    initPage();
  }, [router]);

  // Persist jobs state
  const saveJobsToLocalStorage = (newJobs: Job[]) => {
    if (!userId) return;
    localStorage.setItem(`fastHire_jobs_${userId}`, JSON.stringify(newJobs));
    setJobs(newJobs);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedJobId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Job["status"]) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedJobId;
    if (!id) return;

    const updatedJobs = jobs.map((job) => {
      if (job.id === id) {
        if (job.status !== status) {
          toast.success(`Job moved to ${COLUMNS.find(c => c.id === status)?.label}`);
        }
        return { ...job, status };
      }
      return job;
    });

    saveJobsToLocalStorage(updatedJobs);
    setDraggedJobId(null);
  };

  // Form open for new or edit
  const openForm = (job: Job | null = null) => {
    if (job) {
      setEditingJob(job);
      setFormCompany(job.company);
      setFormTitle(job.title);
      setFormSalary(job.salary || "");
      setFormUrl(job.url || "");
      setFormDate(job.date);
      setFormNotes(job.notes || "");
      setFormResumeId(job.resumeId || "none");
      setFormStatus(job.status);
    } else {
      setEditingJob(null);
      setFormCompany("");
      setFormTitle("");
      setFormSalary("");
      setFormUrl("");
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormNotes("");
      setFormResumeId("none");
      setFormStatus("wishlist");
    }
    setIsFormOpen(true);
  };

  // Delete Job Card
  const handleDeleteJob = (id: string) => {
    if (confirm("Are you sure you want to delete this job record?")) {
      const updated = jobs.filter((j) => j.id !== id);
      saveJobsToLocalStorage(updated);
      toast.success("Job record deleted.");
    }
  };

  // Submit Job
  const handleSubmitJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formTitle.trim()) {
      toast.error("Company and Title fields are required.");
      return;
    }

    if (editingJob) {
      // Edit
      const updated = jobs.map((j) => {
        if (j.id === editingJob.id) {
          return {
            ...j,
            company: formCompany.trim(),
            title: formTitle.trim(),
            salary: formSalary.trim() || undefined,
            url: formUrl.trim() || undefined,
            date: formDate,
            notes: formNotes.trim() || undefined,
            resumeId: formResumeId === "none" ? undefined : formResumeId,
            status: formStatus
          };
        }
        return j;
      });
      saveJobsToLocalStorage(updated);
      toast.success("Job details updated!");
    } else {
      // Add New
      const newJob: Job = {
        id: Math.random().toString(36).substr(2, 9),
        company: formCompany.trim(),
        title: formTitle.trim(),
        salary: formSalary.trim() || undefined,
        url: formUrl.trim() || undefined,
        date: formDate,
        notes: formNotes.trim() || undefined,
        resumeId: formResumeId === "none" ? undefined : formResumeId,
        status: formStatus
      };
      saveJobsToLocalStorage([newJob, ...jobs]);
      toast.success("Job application tracked!");
    }

    setIsFormOpen(false);
  };

  const moveCardStep = (id: string, currentStatus: Job["status"], direction: "next" | "prev") => {
    const statusSequence: Job["status"][] = ["wishlist", "applied", "interviewing", "offered", "rejected"];
    const currentIndex = statusSequence.indexOf(currentStatus);
    let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < statusSequence.length) {
      const targetStatus = statusSequence[nextIndex];
      const updated = jobs.map((j) => (j.id === id ? { ...j, status: targetStatus } : j));
      saveJobsToLocalStorage(updated);
      toast.success(`Job moved to ${COLUMNS.find(c => c.id === targetStatus)?.label}`);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading tracker...</p>
        </div>
      </div>
    );
  }

  // Filter jobs by search query
  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    return (
      job.company.toLowerCase().includes(q) ||
      job.title.toLowerCase().includes(q) ||
      (job.notes && job.notes.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const stats = {
    total: jobs.length,
    applied: jobs.filter((j) => j.status !== "wishlist").length,
    interviews: jobs.filter((j) => j.status === "interviewing").length,
    offers: jobs.filter((j) => j.status === "offered").length,
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        
        {/* Title and Controls Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-violet-500" />
              Job Application Tracker
            </h1>
            <p className="text-xs text-slate-400">
              Manage your job pipeline and map customized resume versions to target applications.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="relative w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search jobs or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs border-white/5 bg-[#0e0f21]/60 focus:border-violet-500 focus:ring-violet-500 rounded-full"
              />
            </div>
            <Button
              onClick={() => openForm(null)}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold h-9 text-xs rounded-full px-4 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Job
            </Button>
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-white/5 bg-[#0e0f21]/40 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Tracked</p>
                <h3 className="text-xl font-black text-white mt-1">{stats.total}</h3>
              </div>
              <Briefcase className="h-6 w-6 text-indigo-400 opacity-60" />
            </CardContent>
          </Card>
          <Card className="border-white/5 bg-[#0e0f21]/40 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Applications</p>
                <h3 className="text-xl font-black text-white mt-1">{stats.applied}</h3>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-400 opacity-60" />
            </CardContent>
          </Card>
          <Card className="border-white/5 bg-[#0e0f21]/40 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Interviews</p>
                <h3 className="text-xl font-black text-white mt-1">{stats.interviews}</h3>
              </div>
              <Clock className="h-6 w-6 text-amber-400 opacity-60" />
            </CardContent>
          </Card>
          <Card className="border-white/5 bg-[#0e0f21]/40 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Offers Recieved</p>
                <h3 className="text-xl font-black text-white mt-1 text-emerald-400">{stats.offers}</h3>
              </div>
              <CheckCircle className="h-6 w-6 text-emerald-400 opacity-60" />
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board Container */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch min-h-[500px] overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colJobs = filteredJobs.filter((j) => j.status === col.id);
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col bg-[#0b0c1a]/30 border border-white/5 rounded-2xl p-3 min-w-[210px] transition-colors ${
                  draggedJobId ? "hover:bg-[#12132d]/20" : ""
                }`}
              >
                
                {/* Column header title */}
                <div className="flex items-center justify-between mb-3.5 px-1 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${col.id === 'wishlist' ? 'bg-indigo-500' : col.id === 'applied' ? 'bg-blue-500' : col.id === 'interviewing' ? 'bg-amber-500' : col.id === 'offered' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="font-bold text-xs text-white">{col.label}</span>
                  </div>
                  <Badge className={`text-[9px] font-black border ${col.color} ${col.border}`}>
                    {colJobs.length}
                  </Badge>
                </div>

                {/* Cards listing */}
                <div className="flex-1 flex flex-col gap-3 min-h-[350px]">
                  {colJobs.length === 0 ? (
                    <div className="flex-1 border border-dashed border-white/5 rounded-xl flex items-center justify-center p-4 text-center select-none bg-slate-950/10">
                      <span className="text-[10px] text-slate-600 font-semibold italic">Drop cards here</span>
                    </div>
                  ) : (
                    colJobs.map((job) => {
                      const associatedResume = resumes.find(r => r.id === job.resumeId);
                      return (
                        <div
                          key={job.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, job.id)}
                          className="group relative bg-[#0e0f21]/60 hover:bg-[#14152e]/60 border border-white/5 hover:border-violet-500/30 rounded-xl p-3.5 transition-all shadow-md cursor-grab active:cursor-grabbing space-y-2.5"
                        >
                          {/* Card header */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-xs text-white truncate max-w-[80%]">
                                {job.title}
                              </h4>
                              {job.url && (
                                <a 
                                  href={job.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()} 
                                  className="text-slate-500 hover:text-white transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold truncate">
                              {job.company}
                            </p>
                          </div>

                          {/* Details Row */}
                          <div className="space-y-1.5 pt-1 border-t border-white/5">
                            {job.salary && (
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold">
                                <DollarSign className="h-3 w-3 text-emerald-500/80" />
                                <span>{job.salary}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              <span>{job.date}</span>
                            </div>
                            {associatedResume && (
                              <div className="flex items-center gap-1 text-[9px] text-violet-400 font-bold bg-violet-500/5 border border-violet-500/10 px-1.5 py-0.5 rounded max-w-full truncate">
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{associatedResume.jobTitle || "Custom Resume"}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick change actions & triggers */}
                          <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-1.5">
                            
                            {/* Card control arrows */}
                            <div className="flex items-center gap-0.5">
                              {col.id !== "wishlist" && (
                                <button
                                  onClick={() => moveCardStep(job.id, job.status, "prev")}
                                  className="h-5 w-5 rounded hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors text-[9px]"
                                  title="Move Left"
                                >
                                  ←
                                </button>
                              )}
                              {col.id !== "rejected" && (
                                <button
                                  onClick={() => moveCardStep(job.id, job.status, "next")}
                                  className="h-5 w-5 rounded hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors text-[9px]"
                                  title="Move Right"
                                >
                                  →
                                </button>
                              )}
                            </div>

                            {/* Editing / Removing buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openForm(job)}
                                className="h-5.5 w-5.5 rounded hover:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors"
                                title="Edit Job Details"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="h-5.5 w-5.5 rounded hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                                title="Remove Job"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </main>

      {/* JOB CREATION / EDITING FORM DRAWER MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-[#060713]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d0e1f] border border-white/10 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="font-extrabold text-white text-base">
                {editingJob ? "Edit Tracked Job" : "Add Job to Pipeline"}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmitJob} className="space-y-3 text-xs select-none">
              
              {/* Company input */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Company Name *</label>
                <Input
                  required
                  placeholder="e.g. Google, Stripe"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                />
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Role Title *</label>
                <Input
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Salary */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Salary / Comp</label>
                  <Input
                    placeholder="e.g. $140k - $160k"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                  />
                </div>
                {/* Application Date */}
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Date Tracked</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500 text-slate-300"
                  />
                </div>
              </div>

              {/* Job URL */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Job Listing URL</label>
                <Input
                  type="url"
                  placeholder="https://jobs.lever.co/company/role"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="h-9 border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500"
                />
              </div>

              {/* Associate Resume select option */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Linked Resume version</label>
                <select
                  value={formResumeId}
                  onChange={(e) => setFormResumeId(e.target.value)}
                  className="w-full h-9 border border-white/5 bg-[#070814] text-white rounded-lg px-2.5 focus:border-violet-500 outline-none focus:ring-1 focus:ring-violet-500 text-xs font-semibold"
                >
                  <option value="none">-- None (Not Linked) --</option>
                  {resumes.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.jobTitle || "Untitled"} ({res.company || "No Company"}) - {new Date(res.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Select dropdown */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Pipeline Stage</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as Job["status"])}
                  className="w-full h-9 border border-white/5 bg-[#070814] text-white rounded-lg px-2.5 focus:border-violet-500 outline-none focus:ring-1 focus:ring-violet-500 text-xs font-semibold"
                >
                  <option value="wishlist">Wishlist</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Notes textarea input */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Notes &amp; Reminders</label>
                <textarea
                  placeholder="Key contacts, interview prep notes, referral names..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border border-white/5 bg-[#070814] text-white rounded-lg focus:border-violet-500 outline-none focus:ring-1 focus:ring-violet-500 font-sans text-xs resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="border-white/5 text-slate-300 hover:bg-white/5 h-8 text-xs font-bold rounded-lg px-3"
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold h-8 text-xs rounded-lg px-4"
                >
                  {editingJob ? "Save Changes" : "Create Card"}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
