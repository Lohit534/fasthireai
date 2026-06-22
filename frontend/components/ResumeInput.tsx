"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { countWords } from "@/lib/utils";
import { FileText, Loader2, UploadCloud, X, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface ResumeInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function ResumeInput({ value, onChange, disabled }: ResumeInputProps) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      // Handle drop errors
      if (rejectedFiles.length > 0) {
        const rejections = rejectedFiles[0];
        const errorType = rejections.errors[0]?.code;
        if (errorType === "file-too-large") {
          setError("File too large. Maximum size is 5MB.");
          toast.error("File is too large (Max 5MB).");
        } else {
          setError("Invalid file type. Only PDF and DOCX formats are supported.");
          toast.error("Only PDF and DOCX files allowed.");
        }
        return;
      }

      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      setFileName(file.name);
      setLoading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to process document parsing.");
        }

        const data = await res.json();
        onChange(data.text);
        toast.success(`Parsed successfully: ${file.name}`);
      } catch (err: any) {
        setError(err.message || "Failed to extract text from resume.");
        toast.error(err.message || "Failed to extract text.");
        setFileName(null);
      } finally {
        setLoading(false);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || loading,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    multiple: false,
  });

  const handleClearFile = () => {
    setFileName(null);
    onChange("");
    setError(null);
  };

  const wordCount = countWords(value);

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      {!fileName && !loading && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 backdrop-blur-md bg-slate-950/20 ${
            isDragActive
              ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
              : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-200">
            {isDragActive ? "Drop the resume here..." : "Drag & drop your resume file"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Supports PDF or DOCX (Max 5MB)</p>
        </div>
      )}

      {/* Upload Loading Spinner */}
      {loading && (
        <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/20 animate-pulse">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-200">Extracting resume text...</p>
          <p className="text-xs text-slate-400 mt-1">This will take a few seconds</p>
        </div>
      )}

      {/* File Details Tag */}
      {fileName && !loading && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-200 min-w-0">
            <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="truncate font-medium">{fileName}</span>
          </div>
          <button
            onClick={handleClearFile}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Clear file and text"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Output */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fallback Text Editor */}
      <div className="relative">
        <Textarea
          placeholder="Or paste your resume text here..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="min-h-[220px] max-h-[380px] overflow-y-auto font-sans border-slate-800 bg-slate-950/40 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl resize-y pr-4"
        />
        <div className="absolute bottom-3 right-3 bg-slate-900 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded-full select-none">
          {wordCount} words
        </div>
      </div>
    </div>
  );
}
