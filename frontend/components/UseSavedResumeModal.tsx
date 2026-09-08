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
    const textToInsert = resume.originalText || resume.optimizedText || "";
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
      <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-2xl rounded-2xl p-6 select-none">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0d6e5a]">
            <FolderOpen className="h-4 w-4" />
            <span>Saved Resumes Library</span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
            Use Saved Resume
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            Select a saved resume from your library to auto-fill the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2 max-h-[340px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#0d6e5a]" />
              <span>Fetching your saved resumes...</span>
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-xl space-y-2 p-4">
              <FileText className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No saved resumes found</p>
              <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                Create a resume from scratch or run an optimization to save it to your account.
              </p>
            </div>
          ) : (
            resumes.map((r) => (
              <div
                key={r.id}
                onClick={() => handleSelect(r)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#0d6e5a] hover:bg-[#0d6e5a]/5 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-[#0d6e5a]/10 border border-[#0d6e5a]/20 flex items-center justify-center shrink-0 text-[#0d6e5a] group-hover:scale-105 transition-transform">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
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
                  className="h-7 text-[10px] font-bold border-slate-200 text-slate-700 group-hover:bg-[#0d6e5a] group-hover:text-white group-hover:border-[#0d6e5a] transition-all px-3 rounded-lg bg-white"
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
