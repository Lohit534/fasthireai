"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Edit3, CheckSquare } from "lucide-react";
import { toast } from "react-hot-toast";

interface OptimizedResumeProps {
  text: string;
  resumeId: string;
}

export default function OptimizedResume({ text: initialText, resumeId }: OptimizedResumeProps) {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Keep state sync'd when initialText changes
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Resume text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy text.");
    }
  };

  // Render text lines with syntax highlighting for section titles (all-caps lines)
  const renderFormattedText = () => {
    const lines = text.split(/\r?\n/);
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      const isHeader =
        trimmed.toUpperCase() === trimmed &&
        trimmed.length > 3 &&
        !/^[•\-*\u2022]/.test(trimmed);

      if (isHeader) {
        return (
          <div
            key={idx}
            className="font-bold text-slate-100 mt-5 mb-2 tracking-wide uppercase border-b border-slate-800 pb-1"
          >
            {line}
          </div>
        );
      }
      return (
        <div key={idx} className="text-slate-300 text-sm leading-relaxed mb-1.5 min-h-[1.25rem]">
          {line}
        </div>
      );
    });
  };

  return (
    <Card className="border-slate-800 bg-slate-950/40 backdrop-blur-md relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-slate-200">
            Optimized Resume Content
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">{text.length} characters</p>
        </div>
        <div className="flex gap-2">
          {/* Edit Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            {isEditing ? (
              <>
                <CheckSquare className="h-4 w-4 mr-2 text-emerald-400" />
                Done
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>

          {/* Copy Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 max-h-[500px] overflow-y-auto">
        {isEditing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[380px] font-mono text-sm border-slate-800 bg-slate-950/20 text-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg resize-y p-4"
          />
        ) : (
          <div className="font-mono whitespace-pre-wrap select-text selection:bg-indigo-500/30">
            {renderFormattedText()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
