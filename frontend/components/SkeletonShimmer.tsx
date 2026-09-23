"use client";

import React, { CSSProperties, ReactNode, startTransition, useEffect, useState } from "react";
import { AnimateView } from "motion/react-animate-view";
import { motion } from "motion/react";
import { Sparkles, RefreshCw } from "lucide-react";

/**
 * FastHire AI - Modern Motion Skeleton Shimmer & Page Reload
 * Adapted from user reference with FastHire brand styles (Teal #0d6e5a, Slate, White).
 */

const PROFILE_NAME = "FastHire Career Member";
const PROFILE_HANDLE = "@fasthire_pro";
const PROFILE_BIO = "Optimizing resumes with AI, increasing keyword matching to 95%+, and accelerating interview callbacks.";

const STATS = [
  { label: "ATS Score", value: "94%" },
  { label: "Optimizations", value: "20/mo" },
  { label: "Resumes", value: "5 Active" },
];

const COVER_HEIGHT = 110;
const AVATAR_SIZE = 56;
const AVATAR_OVERLAP = 28;

// Shimmer gradient matching FastHire brand colors (Slate + subtle Teal highlight)
const BONE_BASE = "rgba(226, 232, 240, 0.7)";
const BONE_HIGHLIGHT = "rgba(13, 110, 90, 0.15)";
const SHIMMER_GRADIENT = `linear-gradient(90deg, ${BONE_BASE} 25%, ${BONE_HIGHLIGHT} 50%, ${BONE_BASE} 75%)`;
const shimmerAnimate = { backgroundPosition: ["-200% 0", "200% 0"] };

export const Bone = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  duration = 1.5,
  className = "",
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  duration?: number;
  className?: string;
}) => (
  <motion.div
    animate={shimmerAnimate}
    transition={{ duration, ease: "easeInOut", repeat: Infinity }}
    className={className}
    style={{
      width,
      height,
      borderRadius,
      background: SHIMMER_GRADIENT,
      backgroundSize: "200% 100%",
      flexShrink: 0,
    }}
  />
);

export const Shimmer = ({
  duration = 1.5,
  borderRadius = "8px",
  style,
  className = "",
  children,
}: {
  duration?: number;
  borderRadius?: string;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) => (
  <motion.div
    animate={shimmerAnimate}
    transition={{ duration, ease: "easeInOut", repeat: Infinity }}
    className={className}
    style={{
      borderRadius,
      background: SHIMMER_GRADIENT,
      backgroundSize: "200% 100%",
      overflow: "hidden",
      ...style,
    }}
  >
    <div style={{ visibility: "hidden" }}>{children}</div>
  </motion.div>
);

const wipeTransition = {
  "--wipe": ["100%", "-100%"],
  transition: { duration: 0.6, ease: "easeInOut" as const },
};

export default function SkeletonShimmer({
  shimmerDuration = 1.5,
  loadDelay = 2200,
}: {
  shimmerDuration?: number;
  loadDelay?: number;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      const timer = setTimeout(
        () => startTransition(() => setLoaded(true)),
        loadDelay
      );
      return () => clearTimeout(timer);
    }
  }, [loaded, loadDelay]);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-4 p-5 min-h-[420px]">
      <style>{`
        @property --wipe {
          syntax: '<percentage>';
          inherits: true;
          initial-value: -100%;
        }
        ::view-transition-group(skeleton-card) {
          border-radius: 20px;
          overflow: hidden;
        }
        ::view-transition-image-pair(skeleton-card) {
          mix-blend-mode: normal;
        }
        ::view-transition-old(skeleton-card) {
          z-index: 2;
          mask-image: linear-gradient(to right, black var(--wipe), transparent calc(var(--wipe) + 100%));
        }
      `}</style>
      
      <AnimateView name="skeleton-card" update={wipeTransition}>
        {loaded ? (
          <ProfileCard />
        ) : (
          <SkeletonCard shimmerDuration={shimmerDuration} />
        )}
      </AnimateView>

      <button
        onClick={() => startTransition(() => setLoaded(false))}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#0d6e5a]/40 text-slate-700 hover:text-[#0d6e5a] text-xs font-bold shadow-xs transition-all cursor-pointer select-none active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5 text-[#0d6e5a]" />
        <span>Reload Preview</span>
      </button>
    </div>
  );
}

/** ============== FastHire Views ================ */

function FastHireLogo() {
  return (
    <div className="h-9 w-9 rounded-xl bg-[#0d6e5a] flex items-center justify-center text-white shadow-sm">
      <Sparkles className="h-5 w-5" />
    </div>
  );
}

function ProfileCard() {
  return (
    <div className="w-full max-w-[360px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xl animate-in fade-in duration-200 select-none">
      <div 
        className="w-full"
        style={{
          height: COVER_HEIGHT,
          background: "linear-gradient(135deg, #0d6e5a 0%, #15803d 100%)",
        }}
      />
      <div className="px-5 pb-5 flex flex-col gap-3.5">
        <div style={{ marginTop: -AVATAR_OVERLAP }}>
          <div className="w-14 h-14 rounded-full bg-white p-1 flex items-center justify-center shadow-md">
            <FastHireLogo />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
            {PROFILE_NAME}
          </h3>
          <p className="text-xs font-semibold text-slate-400 leading-tight">
            {PROFILE_HANDLE}
          </p>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {PROFILE_BIO}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-xs font-black text-[#0d6e5a]">{stat.value}</span>
              <span className="text-[10px] text-slate-500 font-semibold">{stat.label}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-2.5 rounded-xl bg-[#0d6e5a] hover:bg-[#0a5a49] text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer">
          Optimize Resume
        </button>
      </div>
    </div>
  );
}

function SkeletonCard({ shimmerDuration }: { shimmerDuration: number }) {
  return (
    <div className="w-full max-w-[360px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xl">
      <Bone width="100%" height={COVER_HEIGHT} borderRadius={0} duration={shimmerDuration} />
      <div className="px-5 pb-5 flex flex-col gap-3.5">
        <div style={{ marginTop: -AVATAR_OVERLAP }}>
          <div className="w-14 h-14 rounded-full bg-white p-1 flex items-center justify-center shadow-md">
            <Bone width={AVATAR_SIZE - 8} height={AVATAR_SIZE - 8} borderRadius="50%" duration={shimmerDuration} />
          </div>
        </div>
        <Shimmer duration={shimmerDuration} borderRadius="8px" className="self-start">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold">{PROFILE_NAME}</h3>
            <p className="text-xs">{PROFILE_HANDLE}</p>
          </div>
        </Shimmer>
        <Shimmer duration={shimmerDuration} borderRadius="8px">
          <p className="text-xs leading-relaxed">{PROFILE_BIO}</p>
        </Shimmer>
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((stat) => (
            <Shimmer key={stat.label} duration={shimmerDuration} borderRadius="10px">
              <div className="p-2 text-center">
                <span className="text-xs font-bold">{stat.value}</span>
                <span className="text-[10px]">{stat.label}</span>
              </div>
            </Shimmer>
          ))}
        </div>
        <Shimmer duration={shimmerDuration} borderRadius="12px">
          <div className="w-full py-2.5 text-xs text-center">Optimize Resume</div>
        </Shimmer>
      </div>
    </div>
  );
}

/**
 * Full Page Motion Loader - Replaces standard spinners across the entire website
 */
export function PageMotionLoader({
  title = "Loading FastHire Workspace...",
  subtitle = "Preparing ATS scoring engine and optimization models...",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      {/* Top Navbar Placeholder Shimmer */}
      <div className="border-b border-slate-200 bg-white h-16 px-4 sm:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Bone width={32} height={32} borderRadius={10} duration={1.2} />
          <Bone width={110} height={18} borderRadius={6} duration={1.2} />
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Bone width={65} height={14} borderRadius={6} duration={1.2} />
          <Bone width={75} height={14} borderRadius={6} duration={1.2} />
          <Bone width={85} height={14} borderRadius={6} duration={1.2} />
          <Bone width={55} height={14} borderRadius={6} duration={1.2} />
        </div>
        <div className="flex items-center gap-3">
          <Bone width={36} height={36} borderRadius="50%" duration={1.2} />
        </div>
      </div>

      {/* Main Workspace Skeleton */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header Breadcrumb / Title Shimmer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-2">
            <Bone width={240} height={28} borderRadius={8} duration={1.4} />
            <Bone width={380} height={14} borderRadius={6} duration={1.4} />
          </div>
          <div className="flex items-center gap-3">
            <Bone width={120} height={36} borderRadius={10} duration={1.4} />
            <Bone width={100} height={36} borderRadius={10} duration={1.4} />
          </div>
        </div>

        {/* 3 Metric Cards Shimmer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((cardIdx) => (
            <div key={cardIdx} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <Bone width={120} height={16} borderRadius={6} duration={1.4} />
                <Bone width={28} height={28} borderRadius={8} duration={1.4} />
              </div>
              <Bone width={90} height={30} borderRadius={8} duration={1.4} />
              <div className="border-t border-slate-100 pt-2">
                <Bone width="100%" height={12} borderRadius={4} duration={1.4} />
              </div>
            </div>
          ))}
        </div>

        {/* Large Content Card / Table Shimmer */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <Bone width={160} height={20} borderRadius={6} duration={1.5} />
              <Bone width={260} height={12} borderRadius={4} duration={1.5} />
            </div>
            <Bone width={90} height={32} borderRadius={8} duration={1.5} />
          </div>

          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100/80">
                <div className="flex items-center gap-3">
                  <Bone width={36} height={36} borderRadius={10} duration={1.5} />
                  <div className="space-y-1.5">
                    <Bone width={180} height={14} borderRadius={4} duration={1.5} />
                    <Bone width={110} height={10} borderRadius={4} duration={1.5} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Bone width={60} height={20} borderRadius={12} duration={1.5} />
                  <Bone width={70} height={30} borderRadius={8} duration={1.5} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating status note */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 pt-2">
          <Sparkles className="h-4 w-4 text-[#0d6e5a] animate-pulse" />
          <span>{title}</span>
          <span className="hidden sm:inline text-slate-400">&bull; {subtitle}</span>
        </div>
      </main>
    </div>
  );
}
