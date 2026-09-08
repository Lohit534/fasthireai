"use client";

import React, { useState } from "react";
import { X, AlertCircle, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import type { MissingField } from "@/lib/resume-inspector";

interface MissingDetailsModalProps {
  fields: MissingField[];
  onContinue: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

export default function MissingDetailsModal({
  fields,
  onContinue,
  onCancel,
}: MissingDetailsModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const requiredFields = fields.filter((f) => f.required);
  const optionalFields = fields.filter((f) => !f.required);

  const allRequiredFilled = requiredFields.every(
    (f) => (answers[f.id] || "").trim().length > 0
  );

  const handleChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleContinue = () => {
    setSubmitting(true);
    // Small delay to show the loading state
    setTimeout(() => {
      onContinue(answers);
    }, 300);
  };

  // Group fields by section
  const sections = Array.from(new Set(fields.map((f) => f.section)));

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
    >
      {/* Modal Card */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200"
      >
        {/* Top Accent Bar */}
        <div className="h-[3px] w-full bg-[#0d6e5a]" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5 bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Resume Details Needed
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                We found{" "}
                <span className="text-amber-700 font-semibold">
                  {fields.length} missing field{fields.length !== 1 ? "s" : ""}
                </span>{" "}
                that affect optimization accuracy. Fill in what you can — the AI
                will use these to produce a more complete result.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px mx-6 bg-slate-100" />

        {/* Scrollable Fields Area */}
        <div className="px-6 py-4 space-y-5 max-h-[55vh] overflow-y-auto">
          {sections.map((section) => {
            const sectionFields = fields.filter((f) => f.section === section);
            return (
              <div key={section} className="space-y-3">
                {/* Section Label */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[9px] font-bold text-[#0d6e5a] uppercase tracking-widest px-2">
                    {section}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                {sectionFields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-800">
                        {field.label}
                      </span>
                      {field.required ? (
                        <span className="text-[9px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                          Required
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                          Optional
                        </span>
                      )}
                    </label>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {field.description}
                    </p>
                    {field.type === "textarea" ? (
                      <textarea
                        rows={3}
                        value={answers[field.id] || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 resize-none outline-none focus:border-[#0d6e5a] focus:bg-white focus:ring-1 focus:ring-[#0d6e5a] transition-all"
                      />
                    ) : (
                      <input
                        type="text"
                        value={answers[field.id] || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0d6e5a] focus:bg-white focus:ring-1 focus:ring-[#0d6e5a] transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50">
          {/* Required indicator */}
          <p className="text-[10px] text-slate-500 leading-relaxed">
            {requiredFields.length > 0
              ? `${requiredFields.length} required field${requiredFields.length > 1 ? "s" : ""} must be filled`
              : "All fields are optional — fill what you know"}
          </p>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Cancel */}
            <button
              onClick={onCancel}
              disabled={submitting}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl transition-all text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200"
            >
              Cancel
            </button>

            {/* Skip & Optimize Anyway */}
            <button
              onClick={() => {
                setSubmitting(true);
                setTimeout(() => onContinue({}), 300);
              }}
              disabled={submitting}
              className="h-9 px-3.5 text-xs font-semibold rounded-xl transition-all text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200"
            >
              Skip & Optimize
            </button>

            {/* Continue */}
            <button
              onClick={handleContinue}
              disabled={!allRequiredFilled || submitting}
              className={`h-9 px-5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all ${
                !allRequiredFilled || submitting
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-[#0d6e5a] hover:bg-[#094d3f] text-white shadow-sm cursor-pointer"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Apply & Optimize
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
