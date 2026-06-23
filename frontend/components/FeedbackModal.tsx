"use client";

import React, { useState } from "react";
import { X, Sparkles, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

type FeedbackType = "bug" | "feature" | "improvement" | "general";

export default function FeedbackModal({ isOpen, onClose, userEmail }: FeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType>("general");
  const [feedbackText, setFeedbackText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    const typeLabels = {
      bug: "Bug / Problem 🐛",
      feature: "Feature Request ✨",
      improvement: "Improvement 💡",
      general: "General Feedback 💬",
    };

    const subject = encodeURIComponent(`FastHire-AI Feedback - ${typeLabels[selectedType]}`);
    const body = encodeURIComponent(
      `Feedback Type: ${typeLabels[selectedType]}\n` +
      `User Email: ${userEmail || "Anonymous/Not logged in"}\n\n` +
      `Message:\n${feedbackText.trim()}\n\n` +
      `Sent from FastHire-AI Dashboard`
    );

    // Open native email client
    window.location.href = `mailto:lohithpeyyala@gmail.com?subject=${subject}&body=${body}`;
    
    // Reset and close
    setFeedbackText("");
    onClose();
  };

  const types = [
    {
      id: "bug" as FeedbackType,
      title: "Bug / Problem",
      desc: "A specific bug or something broken",
      icon: <span className="text-xl">🐛</span>,
    },
    {
      id: "feature" as FeedbackType,
      title: "Feature request",
      desc: "Something new you wish existed",
      icon: <Sparkles className="h-5 w-5 text-amber-400" />,
    },
    {
      id: "improvement" as FeedbackType,
      title: "Improvement",
      desc: "Something that works but could be better",
      icon: <Lightbulb className="h-5 w-5 text-yellow-400" />,
    },
    {
      id: "general" as FeedbackType,
      title: "General",
      desc: "Anything else on your mind",
      icon: <MessageSquare className="h-5 w-5 text-blue-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0c0d1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100 font-sans select-none">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/5 flex justify-between items-start relative">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Share your feedback</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Goes directly to the team — not the AI</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Categories Grid */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">What kind of feedback?</h3>
            <div className="grid grid-cols-2 gap-3.5">
              {types.map((t) => {
                const isSelected = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t.id)}
                    className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? "bg-violet-950/20 border-violet-500 text-white shadow-lg shadow-violet-500/5"
                        : "bg-[#12132a]/30 border-white/5 hover:border-white/10 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {t.icon}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-white">{t.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight font-medium">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tell us more</h3>
            <Textarea
              placeholder="Found a bug? Want a new feature? Something could be better? Tell us — we read every message."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              required
              className="bg-[#070814] border-white/5 text-white text-xs focus:border-violet-500 focus:ring-violet-500 rounded-xl leading-relaxed resize-none p-3.5"
            />
          </div>

          {/* Actions & Footer Subtext */}
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-10 px-6 rounded-full text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!feedbackText.trim()}
                className="h-10 px-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/10"
              >
                Send feedback
              </Button>
            </div>
            <p className="text-center text-[10px] text-slate-500 font-semibold leading-relaxed">
              We read every message and prioritize based on what you share.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
