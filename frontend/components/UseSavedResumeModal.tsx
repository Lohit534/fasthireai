"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Check, ArrowRight, FolderOpen, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { serializeResumeJSONToText } from "@/lib/ai/router";

interface SavedResume {
  id: string;
  jobTitle?: string;
  originalText?: string;
  optimizedText?: string;
  createdAt: string;
}

interface UseSavedResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResume: (text: string, title?: string) => void;
}

export function UseSavedResumeModal({
  isOpen,
  onClose,
  onSelectResume,
}: UseSavedResumeModalProps) {
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<SavedResume[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchSavedResumes();
    }
  }, [isOpen]);

  const fetchSavedResumes = async () => {
    setLoading(true);
    try {
      const resumesRes = await fetch("/api/resumes");
      if (resumesRes.ok) {
        const builderData = await resumesRes.json();
        if (Array.isArray(builderData)) {
          setResumes(builderData);
        }
      }
    } catch (e) {
      // silent — failed to load saved resumes
      toast.error("Failed to load saved resumes.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (resume: SavedResume) => {
    let textToInsert = resume.originalText || resume.optimizedText || "";

    if (!textToInsert.trim() && (resume as any).optimizedJson) {
      try {
        const parsed = typeof (resume as any).optimizedJson === "string"
          ? JSON.parse((resume as any).optimizedJson)
          : (resume as any).optimizedJson;
        if (parsed) {
          textToInsert = serializeResumeJSONToText(parsed);
        }
      } catch (_e) {}
    }

    if (!textToInsert.trim()) {
      toast.error("Selected resume has no text content.");
      return;
    }
    onSelectResume(textToInsert, resume.jobTitle);
    toast.success(`Loaded saved resume: ${resume.jobTitle || "Untitled Resume"}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-white/10 bg-[#0b0c1b]/95 backdrop-blur-2xl text-white shadow-2xl rounded-3xl p-6 select-none">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-violet-400">
            <FolderOpen className="h-4 w-4" />
            <span>Saved Resumes Library</span>
          </div>
          <DialogTitle className="text-lg font-black text-white tracking-tight">
            Use Saved Resume
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 font-medium">
            Select a saved resume from your library to auto-fill the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2 max-h-[340px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              <span>Fetching your saved resumes...</span>
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-10 bg-[#050614] border border-white/5 rounded-2xl space-y-2 p-4">
              <FileText className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-300">No saved resumes found</p>
              <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                Create a resume from scratch or run an optimization to save it to your account.
              </p>
            </div>
          ) : (
            resumes.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelect(r)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#060714] border border-white/5 hover:border-violet-500/40 hover:bg-white/3 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-violet-400 group-hover:scale-105 transition-transform">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {r.jobTitle || "Saved Resume"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] font-bold border-white/10 text-slate-300 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-500 transition-all px-3 rounded-lg"
                >
                  Use This <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
