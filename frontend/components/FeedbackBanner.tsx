"use client";

import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

interface FeedbackBannerProps {
  onOpenFeedback: () => void;
}

export default function FeedbackBanner({ onOpenFeedback }: FeedbackBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed in current browser session
    const isDismissed = sessionStorage.getItem("fastHire_feedbackBannerDismissed");
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("fastHire_feedbackBannerDismissed", "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="w-full flex justify-center px-3 pt-2 pb-0.5 select-none animate-in slide-in-from-top duration-300">
      <div className="w-full max-w-[600px] bg-white text-slate-900 border border-slate-200/90 rounded-full py-1 px-3 sm:px-4 shadow-lg shadow-slate-900/5 flex items-center justify-between gap-2 sm:gap-3 transition-all">
        
        {/* Left: Icon Badge + Text */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-amber-100/90 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
            <Bell className="h-3.5 w-3.5" />
          </div>
          <p className="text-[11px] sm:text-xs text-slate-700 font-medium truncate sm:whitespace-normal">
            <strong className="font-bold text-slate-900">We'd love your feedback!</strong> Share thoughts or report issues.
          </p>
        </div>

        {/* Right: Action Button + Close Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenFeedback}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            Feedback
          </button>
          <button
            onClick={handleDismiss}
            className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
