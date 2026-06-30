import React from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#040d1a] border-t border-white/5 py-8 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <span className="font-extrabold text-white text-sm">FastHire AI</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-[180px]">
              AI-powered resume optimization that beats ATS filters in under 30 seconds.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Product</h4>
            <ul className="space-y-2">
              {[
                { label: "Optimize Resume", href: "/dashboard" },
                { label: "Resumes", href: "/dashboard/resumes" },
                { label: "Job Tracker", href: "/dashboard/job-tracker" },
                { label: "History", href: "/dashboard/history" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[11px] text-slate-500 hover:text-cyan-400 transition-colors font-medium">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Account</h4>
            <ul className="space-y-2">
              {[
                { label: "Sign Up Free", href: "/auth/signup" },
                { label: "Sign In", href: "/auth/login" },
                { label: "Pricing", href: "/dashboard/pricing" },
                { label: "Billing", href: "/dashboard/billing" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[11px] text-slate-500 hover:text-cyan-400 transition-colors font-medium">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Legal</h4>
            <ul className="space-y-2">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[11px] text-slate-500 hover:text-cyan-400 transition-colors font-medium">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/5">
          <p className="text-[10px] text-slate-600 font-medium">
            © 2026 FastHire AI. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
