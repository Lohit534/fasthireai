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
            className="h-9 text-xs border-white/8 bg-[#040d1a] text-white placeholder:text-slate-600 focus:border-cyan-500/50 rounded-xl flex-1"
          />
          <Button
            type="button"
            onClick={handleFetchUrl}
            disabled={disabled || fetching || !url.trim()}
            className="h-9 px-4 text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-xl shrink-0 transition-all"
          >
            {fetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : fetchSuccess ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              "Fetch"
            )}
          </Button>
        </div>
        {fetchError && (
          <p className="text-[10px] text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {fetchError}
          </p>
        )}
        {fetchSuccess && (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Check className="h-3 w-3 shrink-0" />
            Job description fetched successfully!
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative flex items-center gap-2">
        <div className="flex-1 border-t border-white/5" />
        <span className="text-[9px] font-bold uppercase text-slate-600 tracking-widest">or paste below</span>
        <div className="flex-1 border-t border-white/5" />
      </div>

      {/* Textarea */}
      <div className="relative">
        <Textarea
          placeholder="Paste the full job description here..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`min-h-[220px] max-h-[380px] overflow-y-auto font-sans bg-slate-950/40 text-slate-100 placeholder:text-slate-600 focus:ring-cyan-500/20 rounded-xl resize-y pr-4 ${
            isOverLimit
              ? "border-red-500 focus:border-red-500"
              : "border-slate-800 focus:border-cyan-500/50"
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
            Warning: {charCount} characters — exceeds 5000 char limit and may be truncated.
          </span>
        </div>
      )}
    </div>
  );
}
