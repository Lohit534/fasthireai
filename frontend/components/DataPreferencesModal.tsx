"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ShieldCheck, X } from "lucide-react";

interface DataPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataPreferencesModal({ isOpen, onClose }: DataPreferencesModalProps) {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const prevEnabled = useRef(enabled);

  // Load from server on open
  useEffect(() => {
    if (!isOpen) return;
    setSaved(false);

    // Optimistic: read localStorage immediately for snappy UI
    const localVal = typeof window !== "undefined" && localStorage.getItem("fastHire_ai_data_training");
    if (localVal !== null) {
      setEnabled(localVal === "true");
    }

    // Then sync from server (source of truth)
    fetch("/api/data-preferences")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.dataTrainingEnabled === "boolean") {
          setEnabled(data.dataTrainingEnabled);
          localStorage.setItem("fastHire_ai_data_training", String(data.dataTrainingEnabled));
        }
      })
      .catch(() => {/* silent — use localStorage value */});
  }, [isOpen]);

  // Persist to server whenever toggle changes (debounced 300ms)
  useEffect(() => {
    if (prevEnabled.current === enabled) return;
    prevEnabled.current = enabled;

    setSaving(true);
    setSaved(false);

    // Write localStorage immediately
    if (typeof window !== "undefined") {
      localStorage.setItem("fastHire_ai_data_training", String(enabled));
      window.dispatchEvent(new CustomEvent("fastHire-data-preferences-changed", { detail: { enabled } }));
    }

    const timer = setTimeout(async () => {
      try {
        await fetch("/api/data-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataTrainingEnabled: enabled }),
        });
        setSaved(true);
      } catch {
        /* silent */
      } finally {
        setSaving(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [enabled]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-white rounded-3xl p-7 shadow-2xl border border-slate-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors rounded-full p-1 hover:bg-slate-100 cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 select-none">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Data preferences
          </h2>
          <p className="text-sm text-slate-500 font-normal">
            Control how your data is used to improve FastHire.
          </p>
        </div>

        {/* Main preference card */}
        <div className="border border-slate-200/90 rounded-2xl p-5 flex items-start justify-between gap-4 bg-white hover:border-slate-300 transition-colors">
          <div className="space-y-1 select-none flex-1">
            <h3 className="text-sm font-bold text-slate-900">
              Help improve FastHire's AI
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Share anonymized resume &amp; job data for model training. Never sold, never attached to your name.
            </p>

            {/* Bullet guarantees */}
            <ul className="mt-3 space-y-1.5">
              {[
                "All names, emails & phone numbers stripped before storage",
                "Never sold to third parties or recruiters",
                "Used only to improve FastHire's keyword matching accuracy",
                "You can withdraw consent at any time — takes effect immediately",
              ].map((line) => (
                <li key={line} className="flex items-start gap-1.5 text-[11px] text-slate-500 font-medium">
                  <ShieldCheck className="h-3 w-3 text-[#0d6e5a] mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Teal Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none mt-0.5 ${
              enabled ? "bg-[#0d6e5a]" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-1 ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Current status pill */}
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold select-none transition-colors ${
            enabled
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
          />
          {enabled
            ? "Your anonymized data helps train FastHire's AI. Thank you!"
            : "You have opted out. Your data will not be used for training."}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-0 select-none">
          <span className="text-xs font-mono text-slate-400">
            {saving
              ? "saving…"
              : saved
              ? "✓ saved automatically"
              : "saved automatically"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold px-6 py-2 rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataPreferencesModal;
