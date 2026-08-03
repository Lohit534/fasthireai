"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Film, Loader2, Play } from "lucide-react";

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchVideoStatus = async () => {
    setLoading(true);
    setVideoError(false);
    try {
      const res = await fetch("/api/upload-demo");
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.videoUrl) {
          setVideoUrl(data.videoUrl);
        } else {
          setVideoUrl(null);
        }
      }
    } catch (err) {
      console.error("Failed to load demo video state:", err);
      setVideoUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVideoStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl bg-[#0a0c14] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#121420]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                FastHire AI Product Demo 🎬
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body - Strictly 16:9 Aspect Ratio Container */}
        <div className="w-full bg-black flex items-center justify-center relative aspect-[16/9] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-xs font-medium">Loading video...</p>
            </div>
          ) : videoUrl && !videoError ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              playsInline
              onError={() => setVideoError(true)}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="p-8 text-center max-w-md mx-auto space-y-3 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
                <Play className="h-6 w-6 fill-violet-400" />
              </div>
              <h4 className="text-base font-bold text-white">Demo Video Coming Soon</h4>
              <p className="text-xs text-slate-400">
                Place your demo video file in <code className="text-violet-300 bg-violet-950/60 px-1.5 py-0.5 rounded font-mono text-[11px]">public/uploads/demo.mp4</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
