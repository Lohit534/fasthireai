"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

interface KeywordBadgesProps {
  added: string[];
  found: string[];
}

export default function KeywordBadges({ added, found }: KeywordBadgesProps) {
  const MAX_DISPLAY = 20;

  const renderBadgeList = (
    rawKeywords: string[] | undefined | null,
    type: "added" | "found",
    title: string,
    icon: React.ReactNode,
    badgeClass: string,
    badgeHeaderIcon: React.ReactNode,
    countClass: string
  ) => {
    const keywords = rawKeywords || [];
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
      {/* Keywords Added from JD */}
      {renderBadgeList(
        added,
        "added",
        "Keywords Added from JD",
        <Check className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />,
        "border-[#0d6e5a]/30 bg-[#0d6e5a]/8 text-[#0d6e5a] font-semibold hover:bg-[#0d6e5a]/15",
        <Check className="h-4 w-4 text-[#0d6e5a] shrink-0" />,
        "text-[#0d6e5a] bg-[#0d6e5a]/10 border border-[#0d6e5a]/20"
      )}

      {/* Already in Resume */}
      {renderBadgeList(
        found,
        "found",
        "Already in Resume",
        <Star className="h-3.5 w-3.5 text-slate-500 shrink-0" />,
        "border-slate-200 bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100",
        <Star className="h-4 w-4 text-slate-500 shrink-0" />,
        "text-slate-600 bg-slate-100 border border-slate-200"
      )}
    </div>
  );
}
