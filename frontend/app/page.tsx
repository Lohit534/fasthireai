"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  ArrowRight, 
  Upload, 
  Terminal, 
  CheckCircle, 
  Shield, 
  Cpu, 
  Sparkles,
  Zap
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-gray-200/60 bg-white">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-indigo-50/50 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-emerald-50/40 blur-3xl -z-10" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-50 px-3 py-1 text-xs rounded-full inline-flex items-center gap-1.5 select-none">
            <Sparkles className="h-3 w-3" />
            AI-Powered Resume Scanner & ATS Optimizer
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1] max-w-4xl mx-auto">
            From overlooked to shortlisted — in <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">30 seconds.</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium">
            Transform your resume to beat applicant tracking systems. Optimize semantic match scores, highlight key technical metrics, and get more interviews with 3-layer AI.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 font-bold px-8">
                Try Free Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-200 text-slate-700 hover:bg-gray-50 font-bold px-8">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="bg-slate-900 text-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl font-black text-indigo-400">4.3M+</p>
              <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Resumes Optimized</p>
            </div>
            <div className="space-y-1 border-t md:border-t-0 md:border-x border-slate-800 pt-6 md:pt-0">
              <p className="text-4xl md:text-5xl font-black text-emerald-400">91</p>
              <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Avg ATS Score</p>
            </div>
            <div className="space-y-1 border-t md:border-t-0 pt-6 md:pt-0">
              <p className="text-4xl md:text-5xl font-black text-indigo-400">2x</p>
              <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Interview Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">How It Works</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto font-medium">
              Optimize your resume for the job you want in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center space-y-4 p-4 rounded-xl hover:bg-gray-50/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">1. Upload Resume</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload your PDF or DOCX resume. Our parser will instantly extract the text, preserving section tags.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-4 p-4 rounded-xl hover:bg-gray-50/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">2. Paste Job Description</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Paste the job description of your target role. Our engine tokenizes bigrams and missing keywords.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-4 p-4 rounded-xl hover:bg-gray-50/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">3. Get Optimized</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan, review score gauges, and get bullet rewrites with missing keywords integrated naturally.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Score Card Example */}
      <section className="py-16 bg-gray-50 border-y border-gray-200/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Real-Time Scoring Lift</h2>
            <p className="text-slate-500 text-xs max-w-sm mx-auto font-medium">
              See the direct ATS scoring change before and after AI keyword integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
            {/* Before Score Mock */}
            <Card className="border-red-100 bg-white shadow-md">
              <CardContent className="p-6 text-center space-y-4">
                <Badge variant="outline" className="border-red-500/20 bg-red-50 text-red-500 font-bold text-[10px]">
                  INITIAL RESUME
                </Badge>
                <div className="flex items-center justify-center h-24 w-24 rounded-full border-4 border-red-500/20 bg-red-50/30 mx-auto">
                  <span className="text-3xl font-black text-red-500">34</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Weak ATS Rating</h4>
                <div className="space-y-2 text-left pt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Keyword Match</span>
                    <span className="text-slate-700 font-bold">21%</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-red-500 w-[21%]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* After Score Mock */}
            <Card className="border-emerald-100 bg-white shadow-md relative">
              <div className="absolute -top-3 -right-3 bg-emerald-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full border border-emerald-400 animate-bounce">
                +57 pts
              </div>
              <CardContent className="p-6 text-center space-y-4">
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                  OPTIMIZED RESUME
                </Badge>
                <div className="flex items-center justify-center h-24 w-24 rounded-full border-4 border-emerald-500/20 bg-emerald-50/30 mx-auto">
                  <span className="text-3xl font-black text-emerald-500">91</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Strong ATS Rating</h4>
                <div className="space-y-2 text-left pt-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Keyword Match</span>
                    <span className="text-slate-700 font-bold">94%</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[94%]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Integration Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Our 3-Layer AI Architecture</h2>
            <p className="text-slate-500 text-xs max-w-md mx-auto font-medium">
              We leverage distinct models to offer semantic scoring, keyword parsing, and bullet point rewrites.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto pt-4">
            <Card className="border-gray-100 bg-gray-50/50 shadow-sm p-5 space-y-2">
              <Cpu className="h-6 w-6 text-indigo-500 mx-auto mb-1" />
              <h4 className="font-bold text-xs text-slate-900">Layer 1: Sentence-BERT</h4>
              <p className="text-[10px] text-slate-500 leading-normal">
                Runs on HF Spaces for semantic similarity scoring.
              </p>
            </Card>
            <Card className="border-gray-100 bg-gray-50/50 shadow-sm p-5 space-y-2">
              <Terminal className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
              <h4 className="font-bold text-xs text-slate-900">Layer 2: spaCy NER</h4>
              <p className="text-[10px] text-slate-500 leading-normal">
                Extracts technical skill vocabulary and job-related keywords.
              </p>
            </Card>
            <Card className="border-gray-100 bg-gray-50/50 shadow-sm p-5 space-y-2">
              <CheckCircle className="h-6 w-6 text-indigo-500 mx-auto mb-1" />
              <h4 className="font-bold text-xs text-slate-900">Layer 3: Gemini 1.5 Flash</h4>
              <p className="text-[10px] text-slate-500 leading-normal">
                Generates natural keyword integrations and bullet revisions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 text-white py-16 text-center border-t border-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black tracking-tight">Ready to Land More Interviews?</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Get 2 free resume optimizations each month. No credit card required. Cancel anytime.
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 shadow-lg shadow-indigo-600/10">
                Start Free Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-xs text-slate-400 mt-auto">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            FastHire-AI &copy; 2025. All rights reserved.
          </div>
          <div className="flex gap-4 font-semibold text-slate-500">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
