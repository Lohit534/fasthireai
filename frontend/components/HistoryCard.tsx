"use client";

import React, { useState } from "react";
import { ResumeRecord } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileDown, Calendar, Building, ArrowUpRight, Loader2 } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "react-hot-toast";

interface HistoryCardProps {
  resume: ResumeRecord;
  onSelect?: (resume: ResumeRecord) => void;
}

export default function HistoryCard({ resume, onSelect }: HistoryCardProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card select click
    setDownloading(true);

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeId: resume.id })
      });

      if (!response.ok) {
        throw new Error("Failed to export PDF file.");
      }

      const blob = await response.blob();
      saveAs(blob, `${resume.jobTitle?.replace(/\s+/g, "-") || "resume"}-optimized.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const delta = resume.scoreAfter - resume.scoreBefore;
  const formattedDate = formatDate(resume.createdAt);

  return (
    <Card
      onClick={() => onSelect && onSelect(resume)}
      className="group relative border-slate-800 bg-slate-950/40 backdrop-blur-sm hover:border-indigo-500/50 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[160px]">
        {/* Top Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-4">
            <h3 className="font-bold text-base text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
              {resume.jobTitle || "Optimized Resume"}
            </h3>
            {/* Score Delta Badge */}
            {delta > 0 && (
              <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 select-none font-bold shrink-0">
                +{delta} pts
              </Badge>
            )}
          </div>

          {/* Company Name */}
          {resume.company && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{resume.company}</span>
            </div>
          )}

          {/* Date Created */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Bottom Details & Download Button */}
        <div className="flex items-center justify-between border-t border-slate-900 pt-4 mt-4">
          <div className="flex gap-4 text-xs font-semibold">
            <div>
              <span className="text-slate-500">Before:</span>{" "}
              <span className="text-slate-300">{resume.scoreBefore}</span>
            </div>
            <div>
              <span className="text-slate-500">After:</span>{" "}
              <span className="text-indigo-400 font-black">{resume.scoreAfter}</span>
            </div>
          </div>

          <Button
            onClick={handleDownload}
            disabled={downloading}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-slate-900 text-slate-400 hover:text-white"
            title="Download PDF"
            type="button"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            ) : (
              <FileDown className="h-4.5 w-4.5" />
            )}
          </Button>
        </div>

        {/* Hover Details Overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <span>View Details</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
