"use client";

import React, { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";

/**
 * FastHire AI - Pure Dynamic Motion Skeleton Shimmer Components
 * Connected to FastHire brand palette: Clean white, subtle slate borders, brand teal (#0d6e5a).
 * No hardcoded static fake values — pure animated shimmer bones reflecting dynamic layout.
 */

const BONE_BASE = "rgba(226, 232, 240, 0.75)";
const BONE_HIGHLIGHT = "rgba(13, 110, 90, 0.16)";
const SHIMMER_GRADIENT = `linear-gradient(90deg, ${BONE_BASE} 25%, ${BONE_HIGHLIGHT} 50%, ${BONE_BASE} 75%)`;
const shimmerAnimate = { backgroundPosition: ["-200% 0", "200% 0"] };

export const Bone = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  duration = 1.5,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  duration?: number;
  className?: string;
  style?: CSSProperties;
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
      ...style,
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

/**
 * Top Navbar Skeleton shared across page loaders
 */
export function NavbarSkeleton() {
  return (
    <div className="border-b border-slate-200 bg-white h-16 px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-40 select-none">
      <div className="flex items-center gap-7">
        <div className="flex items-center gap-2.5">
          <Bone width={32} height={32} borderRadius={10} duration={1.2} />
          <Bone width={110} height={20} borderRadius={6} duration={1.2} />
        </div>
        <div className="hidden md:flex items-center gap-5">
          <Bone width={65} height={14} borderRadius={6} duration={1.2} />
          <Bone width={65} height={14} borderRadius={6} duration={1.2} />
          <Bone width={80} height={14} borderRadius={6} duration={1.2} />
          <Bone width={55} height={14} borderRadius={6} duration={1.2} />
          <Bone width={55} height={14} borderRadius={6} duration={1.2} />
          <Bone width={50} height={14} borderRadius={6} duration={1.2} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Bone width={36} height={36} borderRadius="50%" duration={1.2} />
      </div>
    </div>
  );
}

/**
 * 1. DASHBOARD OPTIMIZER SKELETON
 * Dynamic skeleton for /dashboard (2-column layout)
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1280px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        {/* Header Title & Quota Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Bone width={230} height={28} borderRadius={8} duration={1.3} />
              <Bone width={75} height={22} borderRadius={12} duration={1.3} />
            </div>
            <Bone width={380} height={14} borderRadius={6} duration={1.3} />
          </div>
          <div className="flex items-center gap-3">
            <Bone width={130} height={36} borderRadius={12} duration={1.3} />
          </div>
        </div>

        {/* 2-Column Optimizer Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Resume Input */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Bone width={24} height={24} borderRadius={6} duration={1.4} />
                <Bone width={170} height={18} borderRadius={6} duration={1.4} />
              </div>
              <Bone width={90} height={28} borderRadius={8} duration={1.4} />
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-slate-50/50">
              <Bone width={44} height={44} borderRadius="50%" duration={1.4} />
              <Bone width={200} height={16} borderRadius={6} duration={1.4} />
              <Bone width={140} height={12} borderRadius={4} duration={1.4} />
            </div>

            <div className="space-y-2.5 pt-2">
              <Bone width="100%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="92%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="96%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="85%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="70%" height={14} borderRadius={4} duration={1.4} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
              <Bone width={90} height={12} borderRadius={4} duration={1.4} />
              <Bone width={110} height={28} borderRadius={8} duration={1.4} />
            </div>
          </div>

          {/* Right Column: Job Description Input */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Bone width={24} height={24} borderRadius={6} duration={1.4} />
                <Bone width={180} height={18} borderRadius={6} duration={1.4} />
              </div>
              <Bone width={110} height={28} borderRadius={8} duration={1.4} />
            </div>

            <div className="space-y-3 py-2 flex-1">
              <Bone width="100%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="95%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="88%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="98%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="76%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="90%" height={14} borderRadius={4} duration={1.4} />
              <Bone width="60%" height={14} borderRadius={4} duration={1.4} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
              <Bone width={100} height={12} borderRadius={4} duration={1.4} />
              <Bone width={100} height={28} borderRadius={8} duration={1.4} />
            </div>
          </div>
        </div>

        {/* Bottom CTA Action Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 text-center sm:text-left">
            <Bone width={220} height={18} borderRadius={6} duration={1.5} />
            <Bone width={320} height={12} borderRadius={4} duration={1.5} />
          </div>
          <Bone width={210} height={46} borderRadius={14} duration={1.5} />
        </div>
      </main>
    </div>
  );
}

/**
 * 2. RESUMES GRID SKELETON
 * Pure dynamic shimmer placeholder cards matching the Resume library grid
 */
export function ResumesGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch select-none">
      {Array.from({ length: Math.max(1, count) }).map((_, idx) => (
        <div key={idx} className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[160px] space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1">
              <Bone width={idx % 2 === 0 ? "70%" : "55%"} height={18} borderRadius={6} duration={1.3} />
              <Bone width="40%" height={11} borderRadius={4} duration={1.3} />
            </div>
            <Bone width={44} height={22} borderRadius={12} duration={1.3} />
          </div>
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <Bone width="100%" height={36} borderRadius={20} duration={1.3} />
            <Bone width={36} height={36} borderRadius={12} duration={1.3} />
          </div>
        </div>
      ))}

      {/* Dashed "+ New Resume" Placeholder Card */}
      <div className="border-2 border-dashed border-slate-200/90 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[160px] gap-2.5 bg-slate-50/40">
        <Bone width={24} height={24} borderRadius={6} duration={1.4} />
        <Bone width={95} height={14} borderRadius={4} duration={1.4} />
      </div>
    </div>
  );
}

/**
 * 2b. FULL RESUMES PAGE SKELETON
 */
export function ResumesSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-28 sm:pb-10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1.5">
            <Bone width={160} height={28} borderRadius={8} duration={1.3} />
            <Bone width={90} height={13} borderRadius={4} duration={1.3} />
          </div>
          <Bone width={130} height={36} borderRadius={20} duration={1.3} />
        </div>

        <ResumesGridSkeleton />
      </main>
    </div>
  );
}

/**
 * 3. JOB TRACKER SKELETON
 * Pure dynamic shimmer matching Job Tracker: 4 Metric Cards + 5 Kanban Columns
 */
export function JobTrackerSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-28 sm:pb-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Bone width={24} height={24} borderRadius={6} duration={1.3} />
              <Bone width={250} height={28} borderRadius={8} duration={1.3} />
            </div>
            <Bone width={420} height={13} borderRadius={4} duration={1.3} />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <Bone width={220} height={36} borderRadius={20} duration={1.3} />
            <Bone width={100} height={36} borderRadius={20} duration={1.3} />
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div className="space-y-2">
                <Bone width={90} height={10} borderRadius={4} duration={1.4} />
                <Bone width={36} height={28} borderRadius={6} duration={1.4} />
              </div>
              <Bone width={32} height={32} borderRadius={10} duration={1.4} />
            </div>
          ))}
        </div>

        {/* 5 Kanban Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {[1, 2, 3, 4, 5].map((colIdx) => (
            <div key={colIdx} className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 flex flex-col gap-3 min-h-[440px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 px-1">
                <div className="flex items-center gap-2">
                  <Bone width={8} height={8} borderRadius="50%" duration={1.4} />
                  <Bone width={75} height={14} borderRadius={4} duration={1.4} />
                </div>
                <Bone width={20} height={20} borderRadius="50%" duration={1.4} />
              </div>

              {colIdx < 4 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
                  <div className="space-y-1">
                    <Bone width="80%" height={14} borderRadius={4} duration={1.4} />
                    <Bone width="60%" height={11} borderRadius={4} duration={1.4} />
                  </div>
                  <Bone width="90%" height={18} borderRadius={6} duration={1.4} />
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Bone width={40} height={10} borderRadius={3} duration={1.4} />
                    <Bone width={24} height={14} borderRadius={3} duration={1.4} />
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-xl p-8 flex items-center justify-center text-center bg-white/40 min-h-[160px]">
                  <Bone width={85} height={12} borderRadius={4} duration={1.4} />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * 4. HISTORY LIST SKELETON
 * Pure dynamic shimmer matching Resume History list rows (No fake static text)
 */
export function HistoryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 select-none">
      {Array.from({ length: Math.max(1, count) }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3.5 sm:p-4 px-5 sm:px-6 rounded-full border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all"
        >
          {/* Left: Score Pill & Title Details */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Score pill shimmer */}
            <div className="h-8 px-3.5 rounded-full bg-slate-50 border border-slate-200/90 flex items-center gap-1.5 shrink-0">
              <Bone width={18} height={12} borderRadius={3} duration={1.3} />
              <span className="text-slate-300 text-xs font-bold select-none">&rarr;</span>
              <Bone width={18} height={12} borderRadius={3} duration={1.3} />
            </div>

            {/* Title & Date shimmer */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <Bone width={idx % 2 === 0 ? "55%" : "40%"} height={16} borderRadius={4} duration={1.3} />
              <div className="flex items-center gap-2">
                <Bone width={12} height={12} borderRadius={2} duration={1.3} />
                <Bone width={100} height={10} borderRadius={3} duration={1.3} />
              </div>
            </div>
          </div>

          {/* Right: Improvement Badge & Chevron shimmer */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 pl-2">
            <div className="h-6 px-3 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <Bone width={24} height={12} borderRadius={3} duration={1.3} />
            </div>
            <div className="w-4 h-4 flex items-center justify-center text-slate-300 font-bold text-base select-none">
              &rsaquo;
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 4b. FULL HISTORY PAGE SKELETON
 */
export function HistorySkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-28 sm:pb-10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-teal-50 flex items-center justify-center text-[#0d6e5a] shadow-2xs">
              <Bone width={18} height={18} borderRadius={4} duration={1.2} />
            </div>
            <div className="space-y-1">
              <Bone width={160} height={24} borderRadius={6} duration={1.2} />
              <Bone width={240} height={12} borderRadius={4} duration={1.2} />
            </div>
          </div>

          <Bone width={130} height={36} borderRadius={20} duration={1.2} />
        </div>

        <HistoryListSkeleton />
      </main>
    </div>
  );
}

/**
 * 5. PRICING SKELETON
 */
export function PricingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1180px] w-full px-4 sm:px-6 lg:px-8 py-9 flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-3">
          <Bone width={260} height={32} borderRadius={8} duration={1.3} />
          <Bone width={420} height={16} borderRadius={6} duration={1.3} />
          <div className="pt-3">
            <Bone width={210} height={40} borderRadius={20} duration={1.3} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {[
            { title: "Free Career Tier", isPopular: false },
            { title: "Premium Pro", isPopular: true },
            { title: "Pro Max", isPopular: false }
          ].map((plan, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-5 border border-slate-200"
            >
              {plan.isPopular && (
                <div className="self-start -mt-3">
                  <Bone width={90} height={20} borderRadius={10} duration={1.4} />
                </div>
              )}
              <div className="space-y-1.5">
                <Bone width={130} height={20} borderRadius={6} duration={1.4} />
                <Bone width={200} height={12} borderRadius={4} duration={1.4} />
              </div>

              <div className="flex items-baseline gap-1 py-1">
                <Bone width={70} height={36} borderRadius={8} duration={1.4} />
                <Bone width={50} height={14} borderRadius={4} duration={1.4} />
              </div>

              <Bone width="100%" height={40} borderRadius={12} duration={1.4} />

              <div className="space-y-3 pt-3 border-t border-slate-100 flex-1">
                {[1, 2, 3, 4, 5].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <Bone width={16} height={16} borderRadius="50%" duration={1.4} />
                    <Bone width={f % 2 === 0 ? "75%" : "88%"} height={12} borderRadius={4} duration={1.4} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * 6. BILLING SKELETON
 */
export function BillingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1100px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        <div className="border-b border-slate-200/80 pb-5 space-y-2">
          <Bone width={230} height={28} borderRadius={8} duration={1.3} />
          <Bone width={360} height={14} borderRadius={6} duration={1.3} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <Bone width={120} height={18} borderRadius={6} duration={1.4} />
              <Bone width={80} height={24} borderRadius={12} duration={1.4} />
            </div>
            <Bone width={160} height={26} borderRadius={8} duration={1.4} />
            <Bone width={220} height={12} borderRadius={4} duration={1.4} />
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <Bone width={110} height={34} borderRadius={8} duration={1.4} />
              <Bone width={120} height={34} borderRadius={8} duration={1.4} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <Bone width={130} height={18} borderRadius={6} duration={1.4} />
              <Bone width={90} height={14} borderRadius={4} duration={1.4} />
            </div>
            <div className="flex items-center gap-3">
              <Bone width={40} height={30} borderRadius={8} duration={1.4} />
              <Bone width="100%" height={12} borderRadius={6} duration={1.4} />
            </div>
            <Bone width={240} height={12} borderRadius={4} duration={1.4} />
            <div className="pt-2 border-t border-slate-100">
              <Bone width={130} height={34} borderRadius={8} duration={1.4} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Bone width={140} height={18} borderRadius={6} duration={1.5} />
            <Bone width={80} height={14} borderRadius={4} duration={1.5} />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <Bone width={32} height={32} borderRadius={8} duration={1.5} />
                  <div className="space-y-1">
                    <Bone width={130} height={14} borderRadius={4} duration={1.5} />
                    <Bone width={90} height={10} borderRadius={4} duration={1.5} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Bone width={60} height={18} borderRadius={10} duration={1.5} />
                  <Bone width={80} height={28} borderRadius={8} duration={1.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * 7. ADMIN SKELETON
 */
export function AdminUsersSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Bone width={36} height={36} borderRadius={12} duration={1.3} />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Bone width="65%" height={14} borderRadius={4} duration={1.3} />
                <Bone width="80%" height={10} borderRadius={3} duration={1.3} />
              </div>
            </div>
            <Bone width={55} height={20} borderRadius={8} duration={1.3} />
          </div>

          <div className="border-t border-slate-200/80 pt-3 space-y-2">
            <div className="flex justify-between items-center">
              <Bone width={70} height={10} borderRadius={3} duration={1.3} />
              <Bone width={85} height={10} borderRadius={3} duration={1.3} />
            </div>
            <div className="flex justify-between items-center">
              <Bone width={90} height={10} borderRadius={3} duration={1.3} />
              <Bone width={50} height={10} borderRadius={3} duration={1.3} />
            </div>
            <div className="flex justify-between items-center">
              <Bone width={75} height={10} borderRadius={3} duration={1.3} />
              <Bone width={65} height={10} borderRadius={3} duration={1.3} />
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between">
            <Bone width={60} height={12} borderRadius={3} duration={1.3} />
            <Bone width={90} height={26} borderRadius={8} duration={1.3} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminTicketsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 select-none">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3 flex-1">
            <Bone width={36} height={36} borderRadius={10} duration={1.3} />
            <div className="space-y-1.5 flex-1">
              <Bone width="45%" height={14} borderRadius={4} duration={1.3} />
              <Bone width="65%" height={10} borderRadius={3} duration={1.3} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bone width={60} height={22} borderRadius={10} duration={1.3} />
            <Bone width={70} height={30} borderRadius={8} duration={1.3} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1280px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        <div className="border-b border-slate-200/80 pb-5 space-y-2">
          <Bone width={210} height={28} borderRadius={8} duration={1.3} />
          <Bone width={340} height={14} borderRadius={6} duration={1.3} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <Bone width={100} height={14} borderRadius={4} duration={1.4} />
              <Bone width={70} height={26} borderRadius={6} duration={1.4} />
            </div>
          ))}
        </div>

        <AdminUsersSkeleton count={6} />
      </main>
    </div>
  );
}

/**
 * Fallback & default exports
 */
export function PageMotionLoader({
  title = "Loading FastHire Workspace...",
  subtitle = "Preparing ATS scoring engine and optimization models...",
}: {
  title?: string;
  subtitle?: string;
}) {
  return <DashboardSkeleton />;
}

export default function SkeletonShimmer({
  shimmerDuration = 1.5,
  loadDelay = 2200,
}: {
  shimmerDuration?: number;
  loadDelay?: number;
}) {
  return <DashboardSkeleton />;
}
