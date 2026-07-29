"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Lightbulb, MessageSquare, Bug, Send, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface FeedbackToastProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

type FeedbackType = "bug" | "feature" | "improvement" | "general";

const PLACEHOLDERS: Record<FeedbackType, string> = {
  bug: "Describe the bug you encountered — steps to reproduce, what happened, expected behaviour...",
  feature: "Describe the feature you'd like us to build...",
  improvement: "Tell us what could be smoother or better...",
  general: "Share your thoughts, ideas, or questions with the team...",
};

const TYPE_OPTIONS: { id: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { id: "bug", label: "Bug", icon: <Bug className="h-3.5 w-3.5 text-red-400" /> },
  { id: "feature", label: "Feature", icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" /> },
  { id: "improvement", label: "Improve", icon: <Lightbulb className="h-3.5 w-3.5 text-yellow-400" /> },
  { id: "general", label: "General", icon: <MessageSquare className="h-3.5 w-3.5 text-blue-400" /> },
];

export default function FeedbackToast({ isOpen, onClose, userEmail }: FeedbackToastProps) {
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset state whenever panel opens
  useEffect(() => {
    if (isOpen) {
      setSent(false);
      setMessage("");
      setType("general");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, email: userEmail || "" }),
      });

      if (res.ok) {
        setSent(true);
        toast.custom(
          (t) => (
            <div
              className={`flex items-start gap-3 bg-[#0d1117] border border-emerald-500/30 shadow-2xl shadow-emerald-900/20 rounded-2xl px-5 py-4 max-w-sm transition-all ${
                t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">Feedback received!</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thanks — we read every message and prioritise based on what you share.
                </p>
              </div>
            </div>
          ),
          { duration: 4000, position: "top-center" }
        );
        setTimeout(onClose, 1200);
      } else {
        toast.error("Failed to send. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Lightweight backdrop — dims but doesn't black-out the page */}
      <div
        className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Floating toast panel — bottom-right, slides up */}
      <div
        className="fixed bottom-6 right-6 z-[100] w-[340px] bg-[#0c0d1e] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-4 fade-in duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
              <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-black text-white leading-none">Share Feedback</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Goes directly to our team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
            aria-label="Close feedback"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-4 space-y-3">
          {/* Category chips */}
          <div className="flex gap-1.5 flex-wrap">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setType(opt.id)}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                  type === opt.id
                    ? "bg-violet-600/25 border-violet-500/60 text-white"
                    : "bg-[#070814] border-white/8 text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Message textarea */}
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={PLACEHOLDERS[type]}
            className="w-full bg-[#070814] border border-white/8 text-white text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-violet-500/60 resize-none placeholder:text-slate-600 leading-relaxed"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending || sent}
            className="w-full h-9 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
          >
            {sending ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : sent ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sent!
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Send Feedback
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
