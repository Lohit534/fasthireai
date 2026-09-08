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
    <div className="flex-1 flex flex-col justify-between space-y-3 h-full">
      {/* URL Fetch Row */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
          <Link2 className="h-3 w-3 text-[#0d6e5a]" />
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
            className="h-9 text-xs border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#0d6e5a] focus:bg-white rounded-xl flex-1 font-sans shadow-sm"
          />
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={disabled || fetching || !url.trim()}
            className="h-9 px-3.5 text-xs font-semibold rounded-xl shrink-0 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm transition-colors cursor-pointer"
          >
            {fetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0d6e5a]" />
            ) : fetchSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              "Fetch"
            )}
          </button>
        </div>
        {fetchError && (
          <p className="text-[10px] font-mono text-rose-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {fetchError}
          </p>
        )}
        {fetchSuccess && (
          <p className="text-[10px] font-mono text-emerald-600 flex items-center gap-1">
            <Check className="h-3 w-3 shrink-0" />
            Job description fetched successfully!
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-[9px] font-mono font-semibold uppercase text-slate-400 tracking-widest">or paste below</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* Textarea */}
      <div className="relative flex-1 flex flex-col min-h-[280px]">
        <Textarea
          placeholder="Paste the full job description here..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`flex-1 min-h-[280px] h-full overflow-y-auto font-sans text-sm leading-relaxed bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl resize-y p-3.5 pr-4 transition-colors ${
            isOverLimit
              ? "border-rose-400 focus:border-rose-500"
              : "border border-slate-200 focus:border-[#0d6e5a] focus:bg-white focus:ring-1 focus:ring-[#0d6e5a]"
          }`}
        />
        <div className="absolute bottom-3 right-3 bg-white border border-slate-200 font-mono text-[10px] text-slate-600 px-2 py-0.5 rounded-full select-none shadow-sm">
          {wordCount} words
        </div>
      </div>

      {isOverLimit && (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Warning: {charCount} characters — exceeds 5000 char limit and may be truncated.
          </span>
        </div>
      )}
    </div>
  );
}
