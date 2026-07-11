"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Sparkles, Edit2 } from "lucide-react";

interface ImprovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: "ai" | "manual") => void;
}

export default function ImprovementModal({
  isOpen,
  onClose,
  onSelectOption
}: ImprovementModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-[#0b0c1e] border border-white/10 text-white p-6 shadow-2xl">
        <DialogHeader className="space-y-2 text-center">
          <DialogTitle className="text-lg font-black text-white tracking-tight leading-snug">
            How would you like to improve your resume?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Choose between automated AI-powered upgrades or detailed manual guidelines based on your target role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Auto-Improve option */}
          <button
            onClick={() => onSelectOption("ai")}
            className="w-full text-left p-4 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-[#0e0f2b] to-[#12133a] hover:border-violet-500/50 hover:from-violet-900/30 hover:to-[#17184a] transition-all group flex gap-4 items-start duration-300 shadow-md hover:shadow-violet-500/10 cursor-pointer"
          >
            <div className="p-2.5 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-400 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white group-hover:text-violet-400 transition-colors">
                  ⚡ AI Auto-Improve (Recommended)
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Let AI rewrite bullets, inject keywords and boost your ATS score automatically in 30 seconds.
              </p>
            </div>
          </button>

          {/* Manual Improve option */}
          <button
            onClick={() => onSelectOption("manual")}
            className="w-full text-left p-4 rounded-xl border border-white/5 bg-[#080918] hover:border-cyan-500/30 hover:from-cyan-950/10 hover:to-[#0d0f2b] transition-all group flex gap-4 items-start duration-300 shadow-sm cursor-pointer"
          >
            <div className="p-2.5 rounded-lg bg-slate-800 border border-white/5 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all duration-300">
              <Edit2 className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors">
                ✏️ Manual Improve
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                We show you exactly which bullets to improve and which keywords to add — you make the edits yourself.
              </p>
            </div>
          </button>
        </div>

        {/* Footer cancel option */}
        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
