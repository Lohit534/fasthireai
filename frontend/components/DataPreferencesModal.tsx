"use client";

import React, { useState, useEffect } from "react";

interface DataPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataPreferencesModal({ isOpen, onClose }: DataPreferencesModalProps) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fastHire_ai_data_training");
      if (stored !== null) {
        setEnabled(stored === "true");
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("fastHire_ai_data_training", String(value));
      window.dispatchEvent(new CustomEvent("fastHire-data-preferences-changed", { detail: { enabled: value } }));
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in-0"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[480px] bg-white rounded-3xl p-7 shadow-2xl border border-slate-100 flex flex-col gap-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-1 select-none">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Data preferences
          </h2>
          <p className="text-sm text-slate-500 font-normal">
            Control how your data is used to improve FastHire.
          </p>
        </div>

        {/* Inner Card */}
        <div className="border border-slate-200/90 rounded-2xl p-5 flex items-center justify-between gap-4 bg-white hover:border-slate-300 transition-colors">
          <div className="space-y-1 select-none">
            <h3 className="text-sm font-bold text-slate-900">
              Help improve FastHire’s AI
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[270px]">
              Share anonymized resume &amp; job data for model training. Never sold, never attached to your name.
            </p>
          </div>

          {/* Teal Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => handleToggle(!enabled)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden ${
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 select-none">
          <span className="text-xs font-mono text-slate-400">
            saved automatically
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold px-6 py-2 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataPreferencesModal;
