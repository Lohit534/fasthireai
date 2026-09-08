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

  // Reset state whenever modal opens
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
        // Dismiss the top banner prompt across pages
        sessionStorage.setItem("fastHire_feedbackBannerDismissed", "true");
        window.dispatchEvent(new CustomEvent("fastHire_feedbackSubmitted"));

        toast.custom(
          (t) => (
            <div
              className={`flex items-start gap-3 bg-white border border-slate-200 shadow-xl rounded-2xl px-5 py-4 max-w-sm transition-all ${
                t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              <CheckCircle2 className="h-5 w-5 text-[#0d6e5a] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-900">Feedback received!</p>
                <p className="text-xs text-slate-500 mt-0.5">
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
      {/* Light backdrop blur centered */}
      <div
        className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Middle-centered modal wrapper */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 select-none pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-200/60 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-[#0d6e5a]" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 leading-none">Share Feedback</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Goes directly to our product team</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close feedback"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="p-5 space-y-4">
            {/* Category chips */}
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    type === opt.id
                      ? "bg-[#0d6e5a] border-[#0d6e5a] text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
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
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#0d6e5a] focus:bg-white resize-none placeholder:text-slate-400 leading-relaxed transition-colors"
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending || sent}
              className="w-full h-10 flex items-center justify-center gap-2 bg-[#0d6e5a] hover:bg-[#094d3f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              {sending ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : sent ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Sent!
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="h-4 w-4" />
                  Send Feedback
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
