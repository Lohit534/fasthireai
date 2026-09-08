"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle } from "lucide-react";

interface KeywordBadgesProps {
  added: string[];
  missing: string[];
}

export default function KeywordBadges({ added, missing }: KeywordBadgesProps) {
  const MAX_DISPLAY = 15;

  const renderBadgeList = (
    keywords: string[],
    type: "added" | "missing",
    title: string,
    icon: React.ReactNode,
    badgeClass: string,
    badgeHeaderIcon: React.ReactNode,
    countClass: string
  ) => {
    if (keywords.length === 0) {
      return (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 select-none">
            {badgeHeaderIcon}
            <span>{title}</span>
          </h4>
          <p className="text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2 select-none">
            None detected
          </p>
        </div>
      );
    }

    const displayKeywords = keywords.slice(0, MAX_DISPLAY);
    const hiddenCount = Math.max(0, keywords.length - MAX_DISPLAY);

    return (
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 select-none">
          {badgeHeaderIcon}
          <span>{title}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${countClass}`}>
            ({keywords.length})
          </span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {displayKeywords.map((kw, idx) => (
            <Badge
              key={`${type}-${kw}-${idx}`}
              variant="outline"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border shadow-xs transition-colors select-text ${badgeClass}`}
            >
              {icon}
              <span>{kw}</span>
            </Badge>
          ))}
          {hiddenCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold shadow-xs select-none"
            >
              +{hiddenCount} more
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Keywords Added */}
      {renderBadgeList(
        added,
        "added",
        "Keywords Injected from JD",
        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />,
        "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100/80",
        <Check className="h-4 w-4 text-emerald-600 shrink-0" />,
        "text-emerald-700 bg-emerald-50 border border-emerald-200"
      )}

      {/* Still Missing */}
      {renderBadgeList(
        missing,
        "missing",
        "Missing Keywords",
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />,
        "border-amber-200 bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100/80",
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
        "text-amber-800 bg-amber-50 border border-amber-200"
      )}
    </div>
  );
}
