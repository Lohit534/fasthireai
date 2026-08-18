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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(4, 5, 18, 0.85)", backdropFilter: "blur(6px)" }}
    >
      {/* Modal Card */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #0d0f25 0%, #0a0c1e 100%)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          boxShadow: "0 0 60px rgba(139, 92, 246, 0.15), 0 25px 50px rgba(0,0,0,0.6)",
        }}
      >
        {/* Top Glow Bar */}
        <div
          className="h-[2px] w-full"
          style={{
            background: "linear-gradient(90deg, transparent, #8b5cf6, #6366f1, transparent)",
          }}
        />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5"
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}
            >
              <AlertCircle className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">
                Resume Details Needed
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                We found{" "}
                <span className="text-amber-400 font-bold">
                  {fields.length} missing field{fields.length !== 1 ? "s" : ""}
                </span>{" "}
                that affect optimization accuracy. Fill in what you can — the AI
                will use these to produce a more complete result.
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            title="Cancel"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px mx-6" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Scrollable Fields Area */}
        <div className="px-6 py-4 space-y-5 max-h-[55vh] overflow-y-auto">
          {sections.map((section) => {
            const sectionFields = fields.filter((f) => f.section === section);
            return (
              <div key={section} className="space-y-3">
                {/* Section Label */}
                <div className="flex items-center gap-2">
                  <div
                    className="h-px flex-1"
                    style={{ background: "rgba(139,92,246,0.15)" }}
                  />
                  <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest px-2">
                    {section}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: "rgba(139,92,246,0.15)" }}
                  />
                </div>

                {sectionFields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white">
                        {field.label}
                      </span>
                      {field.required ? (
                        <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                          Required
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-500 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-full">
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
                        className="w-full text-[11px] text-slate-200 placeholder-slate-600 rounded-xl px-3.5 py-2.5 resize-none outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.border = "1px solid rgba(139,92,246,0.45)";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.08)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={answers[field.id] || ""}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full text-[11px] text-slate-200 placeholder-slate-600 rounded-xl px-3.5 py-2.5 outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.border = "1px solid rgba(139,92,246,0.45)";
                          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.08)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3">
          {/* Required indicator */}
          <p className="text-[10px] text-slate-600 leading-relaxed">
            {requiredFields.length > 0
              ? `${requiredFields.length} required field${requiredFields.length > 1 ? "s" : ""} must be filled`
              : "All fields are optional — fill what you know"}
          </p>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Cancel */}
            <button
              onClick={onCancel}
              disabled={submitting}
              className="h-9 px-3.5 text-xs font-bold rounded-xl transition-all text-slate-400 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
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
              className="h-9 px-3.5 text-xs font-semibold rounded-xl transition-all text-slate-400 hover:text-slate-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Skip & Optimize
            </button>

            {/* Continue */}
            <button
              onClick={handleContinue}
              disabled={!allRequiredFilled || submitting}
              className="h-9 px-5 text-xs font-black rounded-xl flex items-center gap-2 transition-all"
              style={{
                background:
                  !allRequiredFilled || submitting
                    ? "rgba(139,92,246,0.3)"
                    : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                border:
                  !allRequiredFilled || submitting
                    ? "1px solid rgba(139,92,246,0.2)"
                    : "1px solid rgba(139,92,246,0.5)",
                color: !allRequiredFilled ? "rgba(255,255,255,0.4)" : "white",
                boxShadow:
                  allRequiredFilled && !submitting
                    ? "0 4px 20px rgba(139,92,246,0.3)"
                    : "none",
                cursor: !allRequiredFilled ? "not-allowed" : "pointer",
              }}
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

        {/* Bottom Glow Bar */}
        <div
          className="h-[1px] w-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.1), transparent)",
          }}
        />
      </div>
    </div>
  );
}
