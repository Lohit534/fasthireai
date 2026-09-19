"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, SkipForward, AlertCircle, ArrowRight } from "lucide-react";

export interface ResumePlaceholder {
  line: string;
  placeholder: string;
  hint: string;
  section: string;
}

interface PlaceholderFillerProps {
  placeholders: ResumePlaceholder[];
  optimizedText: string;
  resumeId: string;
  onComplete: (finalText: string) => void;
  onSkip: () => void;
}

export default function PlaceholderFiller({
  placeholders,
  optimizedText,
  resumeId,
  onComplete,
  onSkip,
}: PlaceholderFillerProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const grouped: Record<string, Array<ResumePlaceholder & { idx: number }>> = {};
  placeholders.forEach((p, idx) => {
    const sec = p.section || "GENERAL";
    if (!grouped[sec]) grouped[sec] = [];
    grouped[sec].push({ ...p, idx });
  });

  const filledCount = Object.values(answers).filter((v) => v.trim().length > 0).length;
  const totalCount = placeholders.length;

  function buildFinalText(skipMode = false): string {
    let text = optimizedText;
    for (const { placeholder, idx } of placeholders.map((p, i) => ({ ...p, idx: i }))) {
      const answer = answers[idx]?.trim();
      if (answer) {
        text = text.split(placeholder).join(answer);
      } else if (skipMode) {
        text = text.split(placeholder).join("_______________");
      }
    }
    return text;
  }

  const handleApplyAndContinue = () => {
    const finalText = buildFinalText(false);
    onComplete(finalText);
  };

  const handleSkipAndContinue = () => {
    const finalText = buildFinalText(true);
    onSkip();
    // Pass skipped text up so preview shows blanks not [ADD: ...]
    onComplete(finalText);
  };



  const sectionColors: Record<string, string> = {
    "PROFESSIONAL EXPERIENCE": "bg-blue-50 text-blue-700 border-blue-200",
    "EDUCATION": "bg-purple-50 text-purple-700 border-purple-200",
    "PROJECTS": "bg-orange-50 text-orange-700 border-orange-200",
    "PROFESSIONAL SUMMARY": "bg-teal-50 text-teal-700 border-teal-200",
    "TECHNICAL SKILLS": "bg-green-50 text-green-700 border-green-200",
    "GENERAL": "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
        <CardContent className="pt-5 pb-4 px-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-slate-900 text-base tracking-tight">
                Complete Your Resume
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                The AI detected <strong>{totalCount}</strong> missing detail{totalCount !== 1 ? "s" : ""}. Fill them in for the best possible PDF.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-amber-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-amber-700 shrink-0">
                  {filledCount} / {totalCount} filled
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([section, items]) => (
        <div key={section} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 ${
                sectionColors[section] || sectionColors["GENERAL"]
              }`}
            >
              {section}
            </Badge>
            <span className="text-[10px] text-slate-400 font-semibold">
              {items.length} item{items.length !== 1 ? "s" : ""} to fill
            </span>
          </div>

          {items.map(({ idx, line, placeholder, hint }) => {
            const isFilled = (answers[idx] || "").trim().length > 0;
            return (
              <Card
                key={idx}
                className={`border transition-colors ${
                  isFilled ? "border-green-200 bg-green-50/40" : "border-slate-200 bg-white"
                }`}
              >
                <CardContent className="pt-3.5 pb-3.5 px-4 space-y-2.5">
                  <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 font-mono border border-slate-100 leading-relaxed">
                    {line.split(placeholder).map((part, pIdx, arr) => (
                      <React.Fragment key={pIdx}>
                        {part}
                        {pIdx < arr.length - 1 && (
                          <span className="bg-amber-200 text-amber-900 font-bold rounded px-1 mx-0.5">
                            {answers[idx] || placeholder}
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-start gap-2">
                    {isFilled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-2 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-300 mt-2 shrink-0" />
                    )}
                    <div className="flex-1 space-y-1.5">
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{hint}</p>
                      <Input
                        value={answers[idx] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        placeholder="Your answer..."
                        className="h-8 text-xs bg-white border-slate-200 focus:border-[#0d6e5a] rounded-lg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      <div className="flex gap-3 pt-1 pb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkipAndContinue}
          className="flex-1 h-10 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
        >
          <SkipForward className="h-3.5 w-3.5 mr-1.5" />
          Skip & See Results
        </Button>
        <Button
          size="sm"
          onClick={handleApplyAndContinue}
          disabled={filledCount === 0}
          className="flex-1 h-10 text-xs font-bold bg-[#0d6e5a] hover:bg-[#094d3f] text-white rounded-xl shadow-sm"
        >
          <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
          Apply & See Results
          {filledCount > 0 && (
            <Badge className="ml-2 bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {filledCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
