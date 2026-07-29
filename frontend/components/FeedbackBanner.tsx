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
    <div className="w-full flex justify-center px-4 pt-3 pb-1 select-none animate-in slide-in-from-top duration-300">
      <div className="w-full max-w-4xl bg-white text-slate-900 border border-slate-200/90 rounded-full py-2 px-4 sm:px-6 shadow-xl shadow-slate-900/10 flex items-center justify-between gap-3 sm:gap-4 transition-all">
        
        {/* Left: Icon Badge + Text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-amber-100/90 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
            <Bell className="h-4 w-4" />
          </div>
          <p className="text-xs sm:text-sm text-slate-700 font-medium truncate sm:whitespace-normal">
            <strong className="font-bold text-slate-900">We'd love your feedback!</strong> Click Feedback to share your thoughts, report a bug, or request features.
          </p>
        </div>

        {/* Right: Action Button + Close Icon */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenFeedback}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-extrabold px-4 sm:px-5 py-1.5 rounded-full shadow-md shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            Feedback
          </button>
          <button
            onClick={handleDismiss}
            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
