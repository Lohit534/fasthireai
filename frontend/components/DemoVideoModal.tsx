"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Film, Loader2, Play } from "lucide-react";

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_DEMO_URL = "https://drive.google.com/file/d/1IPCP1rurvnhKIjNKErkb3Kn1GWTmZz-q/preview";

function parseVideoSource(rawUrl: string | null): { isEmbed: boolean; url: string } {
  if (!rawUrl) return { isEmbed: false, url: "" };

  const trimmed = rawUrl.trim();

  // Google Drive link (view, share, or preview)
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return {
      isEmbed: true,
      url: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  // YouTube link
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) {
    return {
      isEmbed: true,
      url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
    };
  }

  // Generic embed URL
  if (trimmed.includes("/preview") || trimmed.includes("/embed/")) {
    return { isEmbed: true, url: trimmed };
  }

  return { isEmbed: false, url: trimmed };
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
          setVideoUrl(DEFAULT_DEMO_URL);
        }
      } else {
        setVideoUrl(DEFAULT_DEMO_URL);
      }
    } catch (err) {
      console.error("Failed to load demo video state:", err);
      setVideoUrl(DEFAULT_DEMO_URL);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVideoStatus();
    }
  }, [isOpen]);

  const videoSource = useMemo(() => parseVideoSource(videoUrl), [videoUrl]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl max-h-[94vh] my-auto bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-teal-50 border border-teal-200 text-[#0d6e5a] shrink-0">
              <Film className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                FastHire AI Product Demo 🎬
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors touch-manipulation shrink-0"
            title="Close modal"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content Body - Responsive 16:9 Aspect Ratio Container */}
        <div className="w-full bg-slate-950 flex items-center justify-center relative aspect-video flex-1 min-h-[210px] xs:min-h-[240px] sm:min-h-[360px] max-h-[75vh] overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 text-slate-400">
              <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-[#0d6e5a]" />
              <p className="text-xs font-medium">Loading demo video...</p>
            </div>
          ) : videoSource.isEmbed && videoSource.url ? (
            <iframe
              src={videoSource.url}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              title="FastHire AI Product Demo"
            />
          ) : videoSource.url && !videoError ? (
            <video
              ref={videoRef}
              src={videoSource.url}
              controls
              autoPlay
              playsInline
              onError={() => setVideoError(true)}
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="p-6 sm:p-8 text-center max-w-md mx-auto space-y-2 sm:space-y-3 text-slate-400">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-900/30 border border-teal-700/30 text-teal-400 flex items-center justify-center mx-auto">
                <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-teal-400" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white">Demo Video Coming Soon</h4>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Place your demo video file in <code className="text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded font-mono text-[10px] sm:text-[11px]">public/uploads/demo.mp4</code> or configure a video link.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
