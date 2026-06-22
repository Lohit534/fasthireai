"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ResumeRecord } from "@/types";
import { logger } from "@/lib/logger";
import {
  Loader2,
  History,
  AlertCircle,
  Plus,
  ChevronRight,
  TrendingUp,
  Calendar,
  Building2,
  X,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Tag,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { formatDate } from "@/lib/utils";

/* ─── helpers ─────────────────────────────────────── */
function scoreColor(n: number) {
  if (n >= 75) return { ring: "#22c55e", bg: "rgba(34,197,94,0.08)", text: "#22c55e" };
  if (n >= 50) return { ring: "#f59e0b", bg: "rgba(245,158,11,0.08)", text: "#f59e0b" };
  return { ring: "#ef4444", bg: "rgba(239,68,68,0.08)", text: "#ef4444" };
}

function CircleGauge({ value, size = 80 }: { value: number; size?: number }) {
  const { ring, bg, text } = scoreColor(value);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill={bg} stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={ring} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <span className="relative text-xl font-black" style={{ color: text }}>{value}</span>
    </div>
  );
}

/* ─── Detail panel ─────────────────────────────────── */
function DetailPanel({ resume, onClose, onRestore }: { resume: ResumeRecord; onClose: () => void; onRestore: () => void }) {
  const [copied, setCopied] = useState(false);
  const delta = resume.scoreAfter - resume.scoreBefore;
  const keywords = Array.isArray(resume.keywordsAdded) ? resume.keywordsAdded : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(resume.optimizedText || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch pointer-events-none">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm pointer-events-auto cursor-pointer"
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        className="w-full max-w-2xl pointer-events-auto flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d0e20 0%, #0a0b18 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "-32px 0 80px rgba(0,0,0,0.7)",
          animation: "slideIn 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Panel Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full">
                Optimization Result
              </span>
              {delta > 0 && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  +{delta} pts
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white truncate">{resume.jobTitle || "Resume Optimization"}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              {resume.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />{resume.company}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />{formatDate(resume.createdAt)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto space-y-5 p-6">
          {/* ATS Score Before → After */}
          <div
            className="rounded-2xl p-5 flex items-center justify-around gap-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Before</span>
              <CircleGauge value={resume.scoreBefore} size={88} />
              <span className="text-[11px] text-slate-400 font-semibold">{resume.scoreBefore}/100</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
              >
                <ArrowRight className="h-4 w-4 text-violet-400" />
              </div>
              {delta > 0 && (
                <span className="text-xs font-black text-emerald-400">+{delta}</span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">After</span>
              <CircleGauge value={resume.scoreAfter} size={88} />
              <span className="text-[11px] text-slate-400 font-semibold">{resume.scoreAfter}/100</span>
            </div>
          </div>

          {/* Keywords Added */}
          {keywords.length > 0 && (
            <div
              className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Keywords Injected</span>
                <span className="ml-auto text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-bold">
                  {keywords.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{
                      background: "rgba(139,92,246,0.12)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      color: "#a78bfa",
                    }}
                  >
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optimized Resume Text */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Optimized Resume</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: copied ? "#22c55e" : "#94a3b8",
                }}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre
              className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono max-h-64 overflow-y-auto"
              style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              {resume.optimizedText || "No optimized text stored."}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="p-5 border-t border-white/5 flex gap-3"
          style={{ background: "rgba(0,0,0,0.2)" }}
        >
          <Button
            onClick={onRestore}
            className="flex-1 font-bold text-sm h-10"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Restore to Dashboard
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="h-10 border-white/10 text-slate-300 hover:bg-white/5 font-semibold"
          >
            Close
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─── History Row Card ─────────────────────────────── */
function HistoryRow({
  resume,
  index,
  onClick,
}: {
  resume: ResumeRecord;
  index: number;
  onClick: () => void;
}) {
  const delta = resume.scoreAfter - resume.scoreBefore;
  const { text: beforeText } = scoreColor(resume.scoreBefore);
  const { text: afterText } = scoreColor(resume.scoreAfter);
  const keywords = Array.isArray(resume.keywordsAdded) ? resume.keywordsAdded : [];

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl p-5 flex items-center gap-5 transition-all duration-300 relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: `fadeSlideUp 0.4s ease both`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.05) 0%, transparent 60%)" }}
      />

      {/* Index number */}
      <div
        className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black text-violet-400"
        style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.15)" }}
      >
        {index + 1}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">
            {resume.jobTitle || "Resume Optimization"}
          </h3>
          {resume.company && (
            <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full truncate max-w-[120px]">
              {resume.company}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />{formatDate(resume.createdAt)}
          </span>
          {keywords.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />{keywords.length} keywords added
            </span>
          )}
        </div>
      </div>

      {/* Score chips */}
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-sm font-black" style={{ color: beforeText }}>{resume.scoreBefore}</span>
        <div className="h-4 w-4 flex items-center justify-center">
          <ArrowRight className="h-3 w-3 text-slate-600" />
        </div>
        <span className="text-sm font-black" style={{ color: afterText }}>{resume.scoreAfter}</span>
        {delta > 0 && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full ml-1"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            +{delta}
          </span>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />

      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </button>
  );
}

/* ─── Main Page ────────────────────────────────────── */
export default function HistoryPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [selected, setSelected] = useState<ResumeRecord | null>(null);

  const store = useResumeStore();

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;

        if (error || !user) {
          toast.error("Please sign in to view history.");
          router.push("/auth/login");
          return;
        }

        if (active) setAuthLoading(false);

        const { data: dbData, error: dbError } = await supabase
          .from("Resume")
          .select("*")
          .eq("userId", user.id)
          .order("createdAt", { ascending: false });

        if (!active) return;

        if (dbError) {
          logger.error("Failed to query scans from Supabase", dbError);
          toast.error("Could not load history.");
        } else if (dbData) {
          setResumes(dbData as any[]);
        }
        setLoading(false);
      } catch (err) {
        logger.error("Unexpected error loading history:", err);
        if (active) setLoading(false);
      }
    }

    loadHistory();
    return () => { active = false; };
  }, [router]);

  const handleRestore = (record: ResumeRecord) => {
    store.setResumeText(record.originalText);
    store.setJobDescription(record.jobDescription);
    setSelected(null);
    router.push("/dashboard");
    toast.success("Loaded into dashboard!");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060713]">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-slate-100" style={{ background: "#07080f" }}>
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
              >
                <History className="h-4 w-4 text-violet-400" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Resume History</h1>
            </div>
            <p className="text-sm text-slate-400 ml-10">
              {resumes.length > 0
                ? `${resumes.length} optimization${resumes.length !== 1 ? "s" : ""} — click any row to view details`
                : "Your resume optimizations will appear here"}
            </p>
          </div>

          <Link href="/dashboard">
            <Button
              className="h-10 px-4 font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Resume
            </Button>
          </Link>
        </div>

        {/* Stats bar */}
        {resumes.length > 0 && (
          <div
            className="grid grid-cols-3 gap-4 mb-8 rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              {
                label: "Total Optimizations",
                value: resumes.length,
                icon: <History className="h-4 w-4 text-violet-400" />,
              },
              {
                label: "Avg. Score Lift",
                value:
                  "+" +
                  Math.round(
                    resumes.reduce((s, r) => s + (r.scoreAfter - r.scoreBefore), 0) / resumes.length
                  ) +
                  " pts",
                icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
              },
              {
                label: "Best After Score",
                value: Math.max(...resumes.map((r) => r.scoreAfter)),
                icon: <Sparkles className="h-4 w-4 text-amber-400" />,
              },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 py-2">
                {s.icon}
                <span className="text-xl font-black text-white">{s.value}</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            <p className="text-xs text-slate-500 font-semibold">Loading history...</p>
          </div>
        ) : resumes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-3xl p-16 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              <AlertCircle className="h-7 w-7 text-violet-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">No optimizations yet</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Upload your resume and a job description to run your first AI-powered optimization.
            </p>
            <Link href="/dashboard" className="mt-6">
              <Button
                className="font-bold"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Start Optimizing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume, i) => (
              <HistoryRow
                key={resume.id}
                resume={resume}
                index={i}
                onClick={() => setSelected(resume)}
              />
            ))}

            <p className="text-center text-[11px] text-slate-600 pt-4 font-medium">
              Showing {resumes.length} record{resumes.length !== 1 ? "s" : ""} · sorted by newest
            </p>
          </div>
        )}
      </main>

      {/* Detail Panel */}
      {selected && (
        <DetailPanel
          resume={selected}
          onClose={() => setSelected(null)}
          onRestore={() => handleRestore(selected)}
        />
      )}
    </div>
  );
}
