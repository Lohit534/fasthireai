"use client";

import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export default function LoadingOverlay() {
  const messages = [
    "🔍 Analyzing your resume...",
    "📊 Scanning job description keywords...",
    "✨ Rewriting bullets with stronger verbs...",
    "🎯 Injecting missing keywords naturally...",
    "📈 Calculating your new ATS score..."
  ];

  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm select-none p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Spinner & Glow */}
        <div className="relative flex items-center justify-center mx-auto">
          <div className="relative h-12 w-12 rounded-full border border-teal-200 bg-teal-50 flex items-center justify-center text-[#0d6e5a] shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-2">
          <h3 className="text-sm font-black text-slate-900 tracking-wider uppercase">Optimizing Resume</h3>
          <p className="text-xs font-semibold text-[#0d6e5a] h-5 transition-all duration-300">
            {messages[msgIndex]}
          </p>
        </div>

        {/* Indeterminate Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="h-2 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden relative">
            {/* Animated bar simulating loading */}
            <div className="h-full bg-[#0d6e5a] rounded-full w-1/3 animate-loading-pulse absolute left-0 top-0" />
          </div>
          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-widest">Please do not refresh or close this tab</span>
        </div>

      </div>

      {/* Tailwind animation injector */}
      <style jsx global>{`
        @keyframes loadingPulse {
          0% {
            left: -33%;
            width: 33%;
          }
          50% {
            width: 50%;
          }
          100% {
            left: 100%;
            width: 33%;
          }
        }
        .animate-loading-pulse {
          animation: loadingPulse 1.8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
