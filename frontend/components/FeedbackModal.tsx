"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Lightbulb, MessageSquare, Bug } from "lucide-react";
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (userEmail) {
      setName(userEmail.split("@")[0]);
      setEmail(userEmail);
    }
  }, [userEmail]);

  if (!isOpen) return null;

  const typeLabels = {
    bug: "Bug / Problem 🐛",
    feature: "Feature Request ✨",
    improvement: "Improvement 💡",
    general: "General Feedback 💬",
  };

  const placeholders: Record<FeedbackType, string> = {
    bug: "Describe the bug or issue you encountered (e.g. error message, page bug, expected behavior)...",
    feature: "Describe the new feature or capability you would like us to build...",
    improvement: "Tell us what could be improved or made smoother in this feature or experience...",
    general: "Share your general feedback, thoughts, or questions with the team...",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#0c0d1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100 font-sans select-none">
        
        {/* Header */}
        <div className="p-4 px-5 border-b border-white/5 flex justify-between items-center relative">
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Share your feedback</h2>
            <p className="text-[10px] text-slate-400">Goes directly to our team — not the AI</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="h-7 w-7 rounded-full border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form 
          action="https://formsubmit.co/lohithpeyyala@gmail.com" 
          method="POST" 
          target="_blank"
          onSubmit={() => {
            setTimeout(() => {
              setFeedbackText("");
              onClose();
            }, 200);
          }}
          className="p-4 sm:p-5 space-y-4"
        >
          {/* FormSubmit Configuration Fields */}
          <input type="hidden" name="_subject" value={`FastHire-AI Feedback - ${typeLabels[selectedType]}`} />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="Feedback Type" value={typeLabels[selectedType]} />
          {typeof window !== "undefined" && (
            <input type="hidden" name="_next" value={window.location.origin + "/dashboard"} />
          )}

          {/* User Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Name</label>
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full h-9 bg-[#070814] border border-white/10 text-white text-xs focus:border-violet-500 focus:ring-violet-500 rounded-xl px-3 focus:outline-none"
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Email</label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex@example.com"
                className="w-full h-9 bg-[#070814] border border-white/10 text-white text-xs focus:border-violet-500 focus:ring-violet-500 rounded-xl px-3 focus:outline-none"
              />
            </div>
          </div>

          {/* Categories Grid (Compact 2x2) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedback Category</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "bug" as FeedbackType,
                  title: "Bug / Problem",
                  icon: <Bug className="h-4 w-4 text-red-400" />,
                },
                {
                  id: "feature" as FeedbackType,
                  title: "Feature Request",
                  icon: <Sparkles className="h-4 w-4 text-amber-400" />,
                },
                {
                  id: "improvement" as FeedbackType,
                  title: "Improvement",
                  icon: <Lightbulb className="h-4 w-4 text-yellow-400" />,
                },
                {
                  id: "general" as FeedbackType,
                  title: "General",
                  icon: <MessageSquare className="h-4 w-4 text-blue-400" />,
                },
              ].map((t) => {
                const isSelected = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-violet-600/20 border-violet-500 text-white font-bold shadow-md shadow-violet-500/10"
                        : "bg-[#070814] border-white/5 hover:border-white/20 text-slate-300 font-medium"
                    }`}
                  >
                    {t.icon}
                    <span className="text-xs truncate">{t.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Details</label>
            <Textarea
              name="message"
              placeholder={placeholders[selectedType]}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
              required
              className="bg-[#070814] border-white/10 text-white text-xs focus:border-violet-500 focus:ring-violet-500 rounded-xl leading-relaxed resize-none p-3"
            />
          </div>

          {/* Actions & Footer Subtext */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-8 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!feedbackText.trim() || !name.trim() || !email.trim()}
                className="h-8 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/10"
              >
                Send feedback
              </Button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
