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
    badgeClass: string
  ) => {
    if (keywords.length === 0) {
      return (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-300">{title}</h4>
          <p className="text-xs text-slate-500">None detected</p>
        </div>
      );
    }

    const displayKeywords = keywords.slice(0, MAX_DISPLAY);
    const hiddenCount = Math.max(0, keywords.length - MAX_DISPLAY);

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">
          {title} <span className="text-xs font-normal text-slate-500">({keywords.length})</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {displayKeywords.map((kw, idx) => (
            <Badge
              key={`${type}-${kw}-${idx}`}
              variant="outline"
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${badgeClass}`}
            >
              {icon}
              <span>{kw}</span>
            </Badge>
          ))}
          {hiddenCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/40 text-slate-400 font-bold"
            >
              +{hiddenCount} more
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl border border-slate-800 bg-slate-950/20">
      {/* Keywords Added */}
      {renderBadgeList(
        added,
        "added",
        "Keywords Added",
        <Check className="h-3 w-3 text-emerald-400" />,
        "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
      )}

      {/* Still Missing */}
      {renderBadgeList(
        missing,
        "missing",
        "Still Missing",
        <AlertTriangle className="h-3 w-3 text-amber-400" />,
        "border-amber-500/20 bg-amber-500/5 text-amber-400"
      )}
    </div>
  );
}
