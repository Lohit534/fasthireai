"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useResumeStore } from "@/store/useResumeStore";
import Navbar from "@/components/Navbar";
import HistoryCard from "@/components/HistoryCard";
import { Button } from "@/components/ui/button";
import { ResumeRecord } from "@/types";
import { logger } from "@/lib/logger";
import { Loader2, ArrowLeft, History, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function HistoryPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  // Zustand State Store
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

        if (active) {
          setAuthLoading(false);
        }

        // Fetch resumes directly from Supabase
        const { data: dbData, error: dbError } = await supabase
          .from("Resume")
          .select("*")
          .eq("userId", user.id)
          .order("createdAt", { ascending: false });

        if (!active) return;

        if (dbError) {
          logger.error("Failed to query scans from Supabase", dbError);
          toast.error("Could not load scans history.");
        } else if (dbData) {
          setResumes(dbData as any[]);
        }
        setLoading(false);
      } catch (err) {
        logger.error("Unexpected error loading history:", err);
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [router]);


  const handleSelectResume = (record: ResumeRecord) => {
    // Populate the Zustand store with history parameters
    store.setResumeText(record.originalText);
    store.setJobDescription(record.jobDescription);
    
    router.push("/dashboard");
    toast.success("Loaded optimization record into dashboard!");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Toolbar */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-100 h-9 w-9 p-0 rounded-full">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 text-indigo-500" />
              Optimization History
            </h1>
            <p className="text-xs text-slate-500">
              Click any card to restore the files into the workspace editor.
            </p>
          </div>
        </div>

        {/* History list loading state */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching history records...</p>
            </div>
          </div>
        ) : resumes.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gray-50 min-h-[380px]">
            <AlertCircle className="h-10 w-10 text-indigo-400 mb-4 animate-pulse" />
            <h3 className="font-extrabold text-slate-800 text-lg">No optimizations yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed font-medium">
              You haven&apos;t run any resume optimizations yet. Head back to the dashboard to scan your first document!
            </p>
            <div className="mt-6">
              <Link href="/dashboard">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Grid layout of past history scans
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <HistoryCard
                key={resume.id}
                resume={resume}
                onSelect={handleSelectResume}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
