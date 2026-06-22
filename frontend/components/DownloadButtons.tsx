"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveAs } from "file-saver";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "react-hot-toast";

interface DownloadButtonsProps {
  resumeId: string;
  text?: string;
  disabled?: boolean;
}

export default function DownloadButtons({ resumeId, text, disabled = false }: DownloadButtonsProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);

  const downloadFile = async (format: "pdf" | "docx") => {
    if (!resumeId) {
      toast.error("Invalid resume reference ID.");
      return;
    }

    if (format === "pdf") setPdfLoading(true);
    else setDocxLoading(true);

    try {
      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeId, text })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate ${format.toUpperCase()} file.`);
      }

      const blob = await response.blob();
      saveAs(blob, `resume-optimized.${format}`);
      toast.success(`${format.toUpperCase()} export downloaded successfully!`);
    } catch (error: any) {
      toast.error(error.message || `An error occurred during ${format.toUpperCase()} download.`);
    } finally {
      if (format === "pdf") setPdfLoading(false);
      else setDocxLoading(false);
    }
  };

  return (
    <div className="flex gap-4 w-full sm:w-auto">
      {/* Download PDF Button */}
      <Button
        onClick={() => downloadFile("pdf")}
        disabled={disabled || !resumeId || pdfLoading}
        className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10"
      >
        {pdfLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Download PDF
          </>
        )}
      </Button>

      {/* Download DOCX Button */}
      <Button
        onClick={() => downloadFile("docx")}
        disabled={disabled || !resumeId || docxLoading}
        variant="outline"
        className="flex-1 sm:flex-initial border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white font-medium"
      >
        {docxLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating DOCX...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Download DOCX
          </>
        )}
      </Button>
    </div>
  );
}
