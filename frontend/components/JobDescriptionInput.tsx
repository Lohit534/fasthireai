"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { countWords } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface JobDescriptionInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function JobDescriptionInput({ value, onChange, disabled }: JobDescriptionInputProps) {
  const wordCount = countWords(value);
  const charCount = value.length;
  const isOverLimit = charCount > 5000;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          placeholder="Paste the full job description here..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`min-h-[220px] font-sans bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:ring-indigo-500 rounded-xl resize-y pr-4 ${
            isOverLimit 
              ? "border-red-500 focus:border-red-500" 
              : "border-slate-800 focus:border-indigo-500"
          }`}
        />
        <div className="absolute bottom-3 right-3 bg-slate-900 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded-full select-none">
          {wordCount} words
        </div>
      </div>

      {isOverLimit && (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Warning: The text is {charCount} characters, which exceeds the recommended 5000 character limit. It may be truncated.
          </span>
        </div>
      )}
    </div>
  );
}
