"use client";

import React from "react";
import { ATSScore } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getScoreColor, getScoreLabel } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";

interface ScoreCardProps {
  before: ATSScore | null;
  after: ATSScore | null;
  loading?: boolean;
}

export default function ScoreCard({ before, after, loading = false }: ScoreCardProps) {
  // 1. Loading State Placeholder
  if (loading) {
    return (
      <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md">
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Column Skeleton */}
            <div className="space-y-4 flex flex-col items-center">
              <Skeleton className="h-3 w-20 bg-slate-800" />
              <Skeleton className="h-28 w-28 rounded-full bg-slate-800" />
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <div className="w-full space-y-3 pt-2">
                <Skeleton className="h-5 w-full bg-slate-800" />
                <Skeleton className="h-5 w-full bg-slate-800" />
                <Skeleton className="h-5 w-full bg-slate-800" />
              </div>
            </div>
            {/* Right Column Skeleton */}
            <div className="space-y-4 flex flex-col items-center">
              <Skeleton className="h-3 w-20 bg-slate-800" />
              <Skeleton className="h-28 w-28 rounded-full bg-slate-800" />
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <div className="w-full space-y-3 pt-2">
                <Skeleton className="h-5 w-full bg-slate-800" />
                <Skeleton className="h-5 w-full bg-slate-800" />
                <Skeleton className="h-5 w-full bg-slate-800" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!before) return null;

  // Calculate Delta
  const scoreBefore = before.overall;
  const scoreAfter = after ? after.overall : scoreBefore;
  const delta = scoreAfter - scoreBefore;

  // Render a Single Column Score Dashboard
  const renderScoreColumn = (scoreData: ATSScore, title: string) => {
    const score = scoreData.overall;
    const label = getScoreLabel(score);
    const colorType = getScoreColor(score);
    
    let ringColor = "";
    let textColor = "";
    let bgColor = "";

    if (colorType === "red") {
      ringColor = "border-red-500/30 ring-red-500/20";
      textColor = "text-red-500";
      bgColor = "bg-red-500/5";
    } else if (colorType === "amber") {
      ringColor = "border-amber-500/30 ring-amber-500/20";
      textColor = "text-amber-500";
      bgColor = "bg-amber-500/5";
    } else {
      ringColor = "border-emerald-500/30 ring-emerald-500/20";
      textColor = "text-emerald-400";
      bgColor = "bg-emerald-500/5";
    }

    return (
      <div className="flex flex-col items-center p-4 rounded-xl border border-slate-900 bg-slate-950/20">
        <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">{title}</h4>
        
        {/* Circular Gauge */}
        <div className={`relative flex items-center justify-center h-28 w-28 rounded-full border-4 ring-8 ${ringColor} ${bgColor} transition-all duration-500`}>
          <div className="text-center">
            <span className={`text-4xl font-extrabold tracking-tight ${textColor}`}>{score}</span>
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider mt-0.5">ATS Score</span>
          </div>
        </div>

        {/* Level Indicator Label */}
        <span className={`text-sm font-semibold tracking-wide uppercase mt-4 ${textColor}`}>
          {label} Rating
        </span>

        {/* Sub-score Progress Rows */}
        <div className="w-full space-y-4 mt-6">
          {/* Keyword Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Keyword Match</span>
              <span className="text-slate-200 font-bold">{scoreData.keywordMatch}%</span>
            </div>
            <Progress value={scoreData.keywordMatch} className="h-1.5 bg-slate-900 [&>div]:bg-indigo-500" />
          </div>

          {/* Impact Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Impact Bullets</span>
              <span className="text-slate-200 font-bold">{scoreData.impactBullets}%</span>
            </div>
            <Progress value={scoreData.impactBullets} className="h-1.5 bg-slate-900 [&>div]:bg-indigo-500" />
          </div>

          {/* Formatting Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">ATS Formatting</span>
              <span className="text-slate-200 font-bold">{scoreData.formatting}%</span>
            </div>
            <Progress value={scoreData.formatting} className="h-1.5 bg-slate-900 [&>div]:bg-indigo-500" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md overflow-hidden relative">
      <CardContent className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
          
          {/* Left: Score Before */}
          {renderScoreColumn(before, "Initial Resume")}

          {/* Right: Score After */}
          {after ? (
            renderScoreColumn(after, "AI Optimized Resume")
          ) : (
            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-800 rounded-xl min-h-[340px]">
              <Sparkles className="h-8 w-8 text-indigo-400/80 animate-pulse mb-3" />
              <p className="text-sm font-semibold text-slate-300">Run optimization to view scores</p>
              <p className="text-xs text-slate-500 text-center max-w-[220px] mt-1">
                Your optimized resume will show dynamic ATS rating deltas right here
              </p>
            </div>
          )}

          {/* Middle Connector: Improvement Delta */}
          {after && delta > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/5 select-none z-10 animate-bounce">
              <span className="text-xs font-black text-emerald-400">+{delta} pts</span>
              <ArrowRight className="h-3 w-3 text-emerald-400" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
