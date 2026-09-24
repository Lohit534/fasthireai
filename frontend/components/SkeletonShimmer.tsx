"use client";

import React, { CSSProperties, ReactNode, startTransition, useEffect, useState } from "react";
import { AnimateView } from "motion/react-animate-view";
import { motion } from "motion/react";
import { 
  Sparkles, 
  RefreshCw, 
  FileText, 
  UploadCloud, 
  Briefcase, 
  History, 
  CreditCard, 
  ShieldCheck, 
  Search, 
  Check, 
  Plus,
  Compass,
  DollarSign
} from "lucide-react";

/**
 * FastHire AI - Modern Motion Skeleton Shimmer Components
 * Connected to FastHire brand palette: Clean white, subtle slate borders, brand teal (#0d6e5a).
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
 * Navbar Skeleton shared across page loaders
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
 * Matches the 2-column Resume vs Job Description layout of /dashboard
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
          {/* Left Column: Resume Upload & Text Input */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Bone width={24} height={24} borderRadius={6} duration={1.4} />
                <Bone width={170} height={18} borderRadius={6} duration={1.4} />
              </div>
              <Bone width={90} height={28} borderRadius={8} duration={1.4} />
            </div>

            {/* Upload Dropzone Placeholder */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-slate-50/50">
              <Bone width={44} height={44} borderRadius="50%" duration={1.4} />
              <Bone width={200} height={16} borderRadius={6} duration={1.4} />
              <Bone width={140} height={12} borderRadius={4} duration={1.4} />
            </div>

            {/* Textarea Placeholder lines */}
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

            {/* JD Input Placeholder */}
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
 * 2. RESUMES SKELETON
 * Matches the resume library cards grid layout of /dashboard/resumes
 */
export function ResumesSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1280px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-2">
            <Bone width={220} height={28} borderRadius={8} duration={1.3} />
            <Bone width={340} height={14} borderRadius={6} duration={1.3} />
          </div>
          <div className="flex items-center gap-3">
            <Bone width={120} height={38} borderRadius={10} duration={1.3} />
            <Bone width={140} height={38} borderRadius={10} duration={1.3} />
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Bone width={280} height={38} borderRadius={10} duration={1.4} />
          <div className="flex items-center gap-2">
            <Bone width={80} height={32} borderRadius={8} duration={1.4} />
            <Bone width={90} height={32} borderRadius={8} duration={1.4} />
          </div>
        </div>

        {/* 6 Resumes Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Bone width={38} height={38} borderRadius={10} duration={1.4} />
                  <div className="space-y-1.5">
                    <Bone width={140} height={16} borderRadius={6} duration={1.4} />
                    <Bone width={90} height={11} borderRadius={4} duration={1.4} />
                  </div>
                </div>
                <Bone width={45} height={22} borderRadius={12} duration={1.4} />
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <Bone width="100%" height={10} borderRadius={4} duration={1.4} />
                <Bone width="80%" height={10} borderRadius={4} duration={1.4} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Bone width={65} height={26} borderRadius={8} duration={1.4} />
                  <Bone width={65} height={26} borderRadius={8} duration={1.4} />
                </div>
                <Bone width={28} height={28} borderRadius={8} duration={1.4} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * 3. JOB TRACKER SKELETON
 * Matches the Kanban columns layout of /dashboard/job-tracker
 */
export function JobTrackerSkeleton() {
  const columns = ["Wishlist", "Applied", "Interviewing", "Offers"];
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1280px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        {/* Header Title & Add Job CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-2">
            <Bone width={250} height={28} borderRadius={8} duration={1.3} />
            <Bone width={360} height={14} borderRadius={6} duration={1.3} />
          </div>
          <div className="flex items-center gap-3">
            <Bone width={130} height={38} borderRadius={10} duration={1.3} />
          </div>
        </div>

        {/* 4 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col, cIdx) => (
            <div key={cIdx} className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3 min-h-[460px]">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Bone width={90} height={18} borderRadius={6} duration={1.4} />
                  <Bone width={24} height={20} borderRadius={10} duration={1.4} />
                </div>
                <Bone width={24} height={24} borderRadius={6} duration={1.4} />
              </div>

              {/* Column Cards */}
              {[1, 2].map((cardIdx) => (
                <div key={cardIdx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Bone width={100} height={14} borderRadius={4} duration={1.4} />
                    <Bone width={45} height={18} borderRadius={10} duration={1.4} />
                  </div>
                  <Bone width={130} height={16} borderRadius={6} duration={1.4} />
                  <div className="flex items-center justify-between pt-1 text-slate-400">
                    <Bone width={70} height={11} borderRadius={4} duration={1.4} />
                    <Bone width={60} height={11} borderRadius={4} duration={1.4} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * 4. PRICING SKELETON
 * Matches the 3-Plan Cards layout of /dashboard/pricing
 */
export function PricingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1180px] w-full px-4 sm:px-6 lg:px-8 py-9 flex flex-col gap-8">
        {/* Header & Toggle */}
        <div className="flex flex-col items-center text-center gap-3">
          <Bone width={260} height={32} borderRadius={8} duration={1.3} />
          <Bone width={420} height={16} borderRadius={6} duration={1.3} />
          <div className="pt-3">
            <Bone width={210} height={40} borderRadius={20} duration={1.3} />
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {[
            { title: "Free Career Tier", isPopular: false },
            { title: "Premium Pro", isPopular: true },
            { title: "Pro Max", isPopular: false }
          ].map((plan, idx) => (
            <div 
              key={idx} 
              className={`bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-5 border ${
                plan.isPopular ? "border-[#0d6e5a] ring-2 ring-[#0d6e5a]/20" : "border-slate-200"
              }`}
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
 * 5. BILLING SKELETON
 * Matches the subscription overview & invoices layout of /dashboard/billing
 */
export function BillingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1100px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        {/* Header */}
        <div className="border-b border-slate-200/80 pb-5 space-y-2">
          <Bone width={230} height={28} borderRadius={8} duration={1.3} />
          <Bone width={360} height={14} borderRadius={6} duration={1.3} />
        </div>

        {/* 2 Summary Cards */}
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

        {/* Invoices List */}
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
 * 6. HISTORY SKELETON
 * Matches the past optimizations list of /dashboard/history
 */
export function HistorySkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1180px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-2">
            <Bone width={240} height={28} borderRadius={8} duration={1.3} />
            <Bone width={380} height={14} borderRadius={6} duration={1.3} />
          </div>
          <Bone width={220} height={38} borderRadius={10} duration={1.3} />
        </div>

        {/* History Rows List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Bone width={150} height={18} borderRadius={6} duration={1.4} />
            <Bone width={90} height={14} borderRadius={4} duration={1.4} />
          </div>

          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-3.5">
                <Bone width={40} height={40} borderRadius={10} duration={1.4} />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Bone width={170} height={16} borderRadius={4} duration={1.4} />
                    <Bone width={50} height={18} borderRadius={10} duration={1.4} />
                  </div>
                  <Bone width={120} height={12} borderRadius={4} duration={1.4} />
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <Bone width={65} height={24} borderRadius={12} duration={1.4} />
                <Bone width={85} height={32} borderRadius={8} duration={1.4} />
                <Bone width={32} height={32} borderRadius={8} duration={1.4} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * 7. ADMIN SKELETON
 * Matches the admin dashboard metrics and users table of /dashboard/admin
 */
export function AdminSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col select-none">
      <NavbarSkeleton />

      <main className="flex-1 mx-auto max-w-[1280px] w-full px-4 sm:px-6 lg:px-8 py-7 flex flex-col gap-6">
        <div className="border-b border-slate-200/80 pb-5 space-y-2">
          <Bone width={210} height={28} borderRadius={8} duration={1.3} />
          <Bone width={340} height={14} borderRadius={6} duration={1.3} />
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <Bone width={100} height={14} borderRadius={4} duration={1.4} />
              <Bone width={70} height={26} borderRadius={6} duration={1.4} />
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Bone width={140} height={18} borderRadius={6} duration={1.5} />
            <Bone width={200} height={34} borderRadius={8} duration={1.5} />
          </div>
          {[1, 2, 3, 4].map((r) => (
            <div key={r} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <Bone width={32} height={32} borderRadius="50%" duration={1.5} />
                <Bone width={150} height={14} borderRadius={4} duration={1.5} />
              </div>
              <Bone width={80} height={20} borderRadius={10} duration={1.5} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * Full Page Motion Loader - Backward compatible fallback
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
