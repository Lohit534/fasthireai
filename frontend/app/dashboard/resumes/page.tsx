"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResumeRecord } from "@/types";
import { logger } from "@/lib/logger";
import { formatDate } from "@/lib/utils";
import { 
  Loader2, 
  ArrowLeft, 
  FileText, 
  Trash2, 
  Download, 
  ExternalLink, 
  AlertCircle,
  Building,
  Calendar,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { saveAs } from "file-saver";

export default function ResumesPage() {
  const router = useRouter();
  const store = useResumeStore();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
          setAuthLoading(false);
        }

        const { data: dbData, error: dbError } = await supabase
          .from("Resume")
          .select("*")
          .eq("userId", user.id)
          .order("createdAt", { ascending: false });

        if (!active) return;

        if (dbError) {
          logger.error("Failed to query resumes from Supabase", dbError);
          toast.error("Could not load resumes.");
        } else if (dbData) {
          setResumes(dbData as any[]);
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

  const handleOpenWorkspace = (record: ResumeRecord) => {
    store.setResumeText(record.optimizedText);
    store.setJobDescription(record.jobDescription);
    router.push("/dashboard");
    toast.success("Loaded optimized resume into workspace!");
  };

  const handleDownloadPDF = async (e: React.MouseEvent, record: ResumeRecord) => {
    e.stopPropagation();
    setActionLoading(`pdf-${record.id}`);

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: record.id })
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

  const handleDownloadDOCX = async (e: React.MouseEvent, record: ResumeRecord) => {
    e.stopPropagation();
    setActionLoading(`docx-${record.id}`);

    try {
      const response = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: record.id })
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

  const handleDeleteResume = async (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this optimized resume record?")) {
      return;
    }

    setActionLoading(`delete-${recordId}`);
    try {
      const { error } = await supabase.from("Resume").delete().eq("id", recordId);
      if (error) {
        throw error;
      }
      setResumes((prev) => prev.filter((r) => r.id !== recordId));
      toast.success("Resume record deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete resume record.");
    } finally {
      setActionLoading(null);
    }
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
    <div className="flex flex-col min-h-screen bg-[#060713] text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="border-white/5 text-slate-300 hover:bg-white/5 h-9 w-9 p-0 rounded-full bg-transparent">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-violet-500" />
              My Saved Resumes
            </h1>
            <p className="text-xs text-slate-400">
              Manage and download your optimized resume versions.
            </p>
          </div>
        </div>

        {/* Loading resumes list state */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Fetching resumes...</p>
            </div>
          </div>
        ) : resumes.length === 0 ? (
          // Empty State layout
          <div className="flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl p-12 text-center bg-[#0e0f21]/40 min-h-[380px]">
            <AlertCircle className="h-10 w-10 text-violet-500 mb-4 animate-pulse" />
            <h3 className="font-extrabold text-white text-lg">No saved resumes</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed font-medium">
              You haven&apos;t optimized and saved any resumes yet. Head over to the dashboard to build or optimize your first profile!
            </p>
            <div className="mt-6">
              <Link href="/dashboard">
                <Button className="bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Resumes grid layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => {
              const delta = resume.scoreAfter - resume.scoreBefore;
              const formattedDate = formatDate(resume.createdAt);
              const isDeleting = actionLoading === `delete-${resume.id}`;

              return (
                <Card 
                  key={resume.id}
                  onClick={() => handleOpenWorkspace(resume)}
                  className="group relative border-white/5 bg-[#0e0f21]/50 hover:bg-[#12132d]/40 hover:border-violet-500/40 cursor-pointer overflow-hidden transition-all duration-300 rounded-2xl shadow-xl flex flex-col justify-between"
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full min-h-[180px] space-y-4">
                    
                    {/* Top Row details */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="font-bold text-base text-white truncate group-hover:text-violet-400 transition-colors">
                          {resume.jobTitle || "Tailored Resume"}
                        </h3>
                        {delta > 0 && (
                          <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 select-none font-bold shrink-0 text-[10px]">
                            +{delta} pts
                          </Badge>
                        )}
                      </div>

                      {/* Company description */}
                      {resume.company && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{resume.company}</span>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Scores layout block */}
                    <div className="flex justify-between items-center bg-[#070814]/60 p-2.5 rounded-lg border border-white/5 text-[11px] font-semibold">
                      <div>
                        <span className="text-slate-500">Before:</span>{" "}
                        <span className="text-red-400 font-bold">{resume.scoreBefore}</span>
                      </div>
                      <span className="text-slate-600 font-black">→</span>
                      <div>
                        <span className="text-slate-500">After:</span>{" "}
                        <span className="text-emerald-400 font-black">{resume.scoreAfter}</span>
                      </div>
                    </div>

                    {/* Action button triggers bottom bar */}
                    <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-3">
                      
                      {/* PDF / Word downloads */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={(e) => handleDownloadPDF(e, resume)}
                          disabled={actionLoading !== null}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[10px] px-2 bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 gap-1"
                        >
                          {actionLoading === `pdf-${resume.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          PDF
                        </Button>
                        
                        <Button
                          onClick={(e) => handleDownloadDOCX(e, resume)}
                          disabled={actionLoading !== null}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[10px] px-2 bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800 gap-1"
                        >
                          {actionLoading === `docx-${resume.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          Word
                        </Button>
                      </div>

                      {/* Delete item */}
                      <Button
                        onClick={(e) => handleDeleteResume(e, resume.id)}
                        disabled={isDeleting || actionLoading !== null}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-full"
                        title="Delete Record"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>

                    </div>

                  </CardContent>

                  {/* Open details overlay */}
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <span>Open in Editor</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                  </div>

                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
