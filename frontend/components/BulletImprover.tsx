"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { extractActionVerbs } from "@/lib/ats/keywords";
import {
  Sparkles,
  CheckCircle2,
  Check,
  X,
  Loader2,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

interface BulletImproverProps {
  resumeText: string;
  jobDescription: string;
  userId: string;
  userPlan: string;
  onChange: (updatedText: string, wasImproved?: boolean) => void;
}

interface ImprovementResult {
  improvedBullet: string;
  actionVerbUsed: string;
  metricsAdded: string;
  keywordsInjected: string[];
  explanation: string;
}

function getAutoImproveLimit(plan: string): number {
  if (plan === "promax" || plan === "owner") return Infinity;
  if (plan === "premium") return 10;
  return 2; // free
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export default function BulletImprover({ resumeText, jobDescription, userId, userPlan, onChange }: BulletImproverProps) {
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
  const [improvements, setImprovements] = useState<Record<number, ImprovementResult | null>>({});
  const [usedThisSession, setUsedThisSession] = useState(0);

  const limit = getAutoImproveLimit(userPlan);
  const storageKey = `fastHire_autoImprove_count_${userId}_${getMonthKey()}`;
  const storedCount = parseInt(typeof window !== "undefined" ? localStorage.getItem(storageKey) || "0" : "0", 10);
  const totalUsed = storedCount;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - totalUsed);

  // 1. Parse text to extract bullet lines
  const lines = resumeText.split(/\r?\n/);

  // Find index of lines that look like bullet points
  const bulletItems = lines
    .map((line, index) => {
      const trimmed = line.trim();
      const isBullet = /^\s*([-*•+]|(\d+\.))\s+/.test(line);
      return { line, index, isBullet, trimmed };
    })
    .filter((item) => item.isBullet && item.trimmed.length > 5);

  // 2. Review checks for a single bullet text
  const checkBullet = (text: string) => {
    const cleanText = text.replace(/^\s*([-*•+]|(\d+\.))\s+/, "");
    const verbs = extractActionVerbs(cleanText);
    const hasVerb = verbs.length > 0;
    const hasMetric = /(\d+%|\d+\s*(percent|million|billion|k|m|x|%|\+)|years|months|\$\d+)/i.test(cleanText);
    return { hasVerb, hasMetric, verbsDetected: verbs, cleanText };
  };

  // 3. Request auto-improvement with plan limit check
  const handleAutoImprove = async (bulletIdx: number, rawLine: string) => {
    // Plan-based limit check
    if (remaining <= 0) {
      if (userPlan === "free") {
        toast.error("You've used all 2 free auto-improves this month. Upgrade to Pro for 10/month.");
      } else if (userPlan === "premium") {
        toast.error("You've used all 10 Premium auto-improves this month. Upgrade to Pro Max for unlimited.");
      }
      setTimeout(() => { window.location.href = "/dashboard/pricing"; }, 1800);
      return;
    }

    const { cleanText } = checkBullet(rawLine);
    setLoadingMap((prev) => ({ ...prev, [bulletIdx]: true }));

    try {
      const response = await fetch("/api/improve-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bullet: cleanText, jobDescription }),
      });

      if (!response.ok) throw new Error("Failed to optimize bullet.");

      const data = await response.json();
      setImprovements((prev) => ({ ...prev, [bulletIdx]: data }));

      // Increment usage counter in localStorage
      if (limit !== Infinity && userId) {
        localStorage.setItem(storageKey, (totalUsed + 1).toString());
      }
      setUsedThisSession((n) => n + 1);
      toast.success("Bullet optimized!");
    } catch (err: any) {
      toast.error(err.message || "Could not improve bullet.");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [bulletIdx]: false }));
    }
  };

  // 4. Accept rewrite and apply back to resume text
  const handleAccept = (bulletIdx: number, rawLine: string, improvedText: string) => {
    const markerMatch = rawLine.match(/^(\s*([-*•+]|(\d+\.))\s*)/);
    const marker = markerMatch ? markerMatch[1] : "- ";
    const cleanNewBullet = improvedText.replace(/^\s*([-*•+]|(\d+\.))\s*/, "");
    const nextLines = [...lines];
    nextLines[bulletIdx] = `${marker}${cleanNewBullet}`;
    onChange(nextLines.join("\n"), true);
    setImprovements((prev) => {
      const next = { ...prev };
      delete next[bulletIdx];
      return next;
    });
    toast.success("Applied to resume!");
  };

  // 5. Dismiss improvements card
  const handleReject = (bulletIdx: number) => {
    setImprovements((prev) => {
      const next = { ...prev };
      delete next[bulletIdx];
      return next;
    });
  };

  if (bulletItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 bg-gray-50/50 rounded-2xl min-h-[300px] text-center">
        <AlertCircle className="h-9 w-9 text-slate-400 mb-3" />
        <h4 className="font-bold text-slate-700 text-sm">No Bullet Points Detected</h4>
        <p className="text-sm text-slate-500 max-w-xs mt-1 leading-relaxed">
          Ensure your resume includes list items starting with dashes (-) or bullet points (•) to activate individual line optimizations.
        </p>
      </div>
    );
  }

  const stats = bulletItems.reduce(
    (acc, curr) => {
      const check = checkBullet(curr.line);
      if (check.hasVerb) acc.verbs++;
      if (check.hasMetric) acc.metrics++;
      return acc;
    },
    { verbs: 0, metrics: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Overview stats panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Action Verbs</div>
            <div className="text-base font-black text-white">{stats.verbs} / {bulletItems.length} pass</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Metrics</div>
            <div className="text-base font-black text-white">{stats.metrics} / {bulletItems.length} pass</div>
          </div>
        </div>

        {/* Auto-improve usage counter */}
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${remaining === 0 ? "bg-red-500/10 border-red-500/20" : "bg-violet-500/10 border-violet-500/20"}`}>
            <Sparkles className={`h-5 w-5 ${remaining === 0 ? "text-red-400" : "text-violet-400"}`} />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Auto-Improve</div>
            <div className={`text-base font-black ${remaining === 0 ? "text-red-400" : "text-white"}`}>
              {limit === Infinity ? "Unlimited" : `${remaining} left / ${limit}`}
            </div>
          </div>
        </div>
      </div>

      {/* List of bullets */}
      <div className="space-y-4">
        {bulletItems.map(({ line, index, trimmed }) => {
          const { hasVerb, hasMetric } = checkBullet(line);
          const isImproving = loadingMap[index];
          const suggestion = improvements[index];
          const canImprove = limit === Infinity || remaining > 0;

          return (
            <Card key={index} className="border-gray-200 bg-white hover:shadow-md transition-all rounded-2xl overflow-hidden">
              <CardContent className="p-5 space-y-4">
                {/* Bullet Display */}
                <div className="flex items-start gap-3">
                  <div className="mt-1 font-bold text-indigo-500 shrink-0 select-none">•</div>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium flex-1">
                    {trimmed.replace(/^[-*•+\s]+/, "")}
                  </p>
                </div>

                {/* Score indicators & Action items */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {hasVerb ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold rounded-md py-0.5">
                        <Check className="h-3 w-3 mr-1 shrink-0 text-emerald-600" />
                        Action Verb: Pass
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs font-semibold rounded-md py-0.5">
                        <X className="h-3 w-3 mr-1 shrink-0 text-red-500" />
                        Action Verb: Missing
                      </Badge>
                    )}
                    {hasMetric ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold rounded-md py-0.5">
                        <Check className="h-3 w-3 mr-1 shrink-0 text-emerald-600" />
                        Metric: Pass
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold rounded-md py-0.5">
                        <AlertCircle className="h-3 w-3 mr-1 shrink-0 text-amber-500" />
                        Metric: Missing
                      </Badge>
                    )}
                  </div>

                  {!suggestion && (
                    <Button
                      size="sm"
                      onClick={() => canImprove
                        ? handleAutoImprove(index, line)
                        : toast.error(userPlan === "free" ? "Upgrade to Pro for more auto-improves." : "Upgrade to Pro Max for unlimited.")
                      }
                      disabled={isImproving}
                      className={`font-bold rounded-lg text-sm ${canImprove ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-slate-200 text-slate-500 cursor-not-allowed"}`}
                    >
                      {isImproving ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Improving...</>
                      ) : (
                        <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{canImprove ? "Auto-Improve" : "Limit Reached"}</>
                      )}
                    </Button>
                  )}
                </div>

                {/* AI suggestion card */}
                {suggestion && (
                  <div className="mt-4 bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-700">
                      <Sparkles className="h-4 w-4" />
                      Suggested Optimization Rewrite
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Before</div>
                      <p className="text-sm text-slate-500 line-through">{trimmed.replace(/^[-*•+\s]+/, "")}</p>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider pt-1">After</div>
                      <p className="text-sm font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-indigo-100 shadow-sm leading-relaxed">
                        {suggestion.improvedBullet}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-sm">
                      <div>
                        <span className="font-bold text-slate-600 block">Explanation:</span>
                        <span className="text-slate-500">{suggestion.explanation}</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap items-start">
                        <Badge className="bg-slate-900 text-slate-100 text-xs hover:bg-slate-900">Verb: {suggestion.actionVerbUsed}</Badge>
                        {suggestion.metricsAdded && (
                          <Badge className="bg-emerald-600 text-emerald-50 text-xs hover:bg-emerald-600">Metric: {suggestion.metricsAdded}</Badge>
                        )}
                        {suggestion.keywordsInjected.map((kw, i) => (
                          <Badge key={i} className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs hover:bg-indigo-100">+{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="ghost" onClick={() => handleReject(index)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm">Cancel</Button>
                      <Button size="sm" onClick={() => handleAccept(index, line, suggestion.improvedBullet)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm">Accept & Apply</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
