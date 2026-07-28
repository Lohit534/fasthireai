"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { countWords } from "@/lib/utils";
import { AlertTriangle, Link2, Loader2, Check } from "lucide-react";

interface JobDescriptionInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function JobDescriptionInput({ value, onChange, disabled }: JobDescriptionInputProps) {
  const wordCount = countWords(value);
  const charCount = value.length;
  const isOverLimit = charCount > 5000;

  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError(null);
    setFetchSuccess(false);

    try {
      // Use a CORS-safe text-extraction proxy via allorigins.win
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url.trim())}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Failed to fetch the page. Check the URL.");

      const json = await res.json();
      const html: string = json.contents || "";

      // Strip HTML tags and decode entities
      const tmp = document.createElement("div");
      tmp.innerHTML = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ");

      const text = (tmp.textContent || tmp.innerText || "")
        .replace(/\s{3,}/g, "\n\n")
        .trim()
        .slice(0, 6000);

      if (!text || text.length < 100) throw new Error("Could not extract enough text from this URL. Try pasting the JD manually.");

      onChange(text);
      setFetchSuccess(true);
      setTimeout(() => setFetchSuccess(false), 3000);
    } catch (err: any) {
      setFetchError(err.message || "Failed to fetch job description.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* URL Fetch Row */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
          <Link2 className="h-3 w-3" />
          Fetch from Job URL
        </label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://linkedin.com/jobs/view/... or any job posting URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={disabled || fetching}
            onKeyDown={(e) => e.key === "Enter" && handleFetchUrl()}
            className="h-9 text-xs border-white/12 bg-[#0A0C10] text-[#e2e2e8] placeholder:text-slate-500 focus:border-[#5E5CE6] rounded-lg flex-1 font-sans"
          />
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={disabled || fetching || !url.trim()}
            className="btn-secondary-glass h-9 px-3.5 text-xs font-semibold rounded-lg shrink-0"
          >
            {fetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : fetchSuccess ? (
              <Check className="h-3.5 w-3.5 text-[#30D158]" />
            ) : (
              "Fetch"
            )}
          </button>
        </div>
        {fetchError && (
          <p className="text-[10px] font-mono text-[#FF453A] flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {fetchError}
          </p>
        )}
        {fetchSuccess && (
          <p className="text-[10px] font-mono text-[#30D158] flex items-center gap-1">
            <Check className="h-3 w-3 shrink-0" />
            Job description fetched successfully!
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-white/12" />
        <span className="text-[9px] font-mono font-medium uppercase text-slate-500 tracking-widest">or paste below</span>
        <div className="flex-1 border-t border-white/12" />
      </div>

      {/* Textarea */}
      <div className="relative">
        <Textarea
          placeholder="Paste the full job description here..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`min-h-[280px] max-h-[450px] overflow-y-auto font-sans text-sm leading-relaxed bg-[#0A0C10] text-[#e2e2e8] placeholder:text-slate-500 rounded-lg resize-y p-3.5 pr-4 ${
            isOverLimit
              ? "border-[#FF453A] focus:border-[#FF453A]"
              : "border border-white/12 focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
          }`}
        />
        <div className="absolute bottom-3 right-3 bg-[#161B22] border border-white/12 font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded-full select-none">
          {wordCount} words
        </div>
      </div>

      {isOverLimit && (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Warning: {charCount} characters — exceeds 5000 char limit and may be truncated.
          </span>
        </div>
      )}
    </div>
  );
}
