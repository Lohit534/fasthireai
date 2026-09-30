"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Sparkles, ShieldCheck } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/auth")) {
    return null;
  }

  const productLinks = [
    { label: "Optimizer", href: "/dashboard" },
    { label: "ATS checker", href: "/dashboard" },
    { label: "Resume builder", href: "/dashboard/resumes" },
    { label: "Job tracker", href: "/dashboard/job-tracker" },
    { label: "Templates", href: "/dashboard/resumes" },
  ];

  const trustLinks = [
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Refund policy", href: "/refund" },
    { label: "Shipping & delivery", href: "/shipping" },
    { label: "Contact support", href: "mailto:support@fasthireai.com", isExternal: true },
  ];

  const accountLinks = [
    { label: "Pricing & Plans", href: "/dashboard/pricing" },
    { label: "Billing & Invoices", href: "/dashboard/billing" },
    { label: "Optimization History", href: "/dashboard/history" },
    { label: "Sign In", href: "/auth/login" },
  ];

  return (
    <footer className="w-full bg-white border-t border-slate-200 py-12 md:py-14 mt-auto text-slate-800 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10">
          
          {/* Brand & Mission Tagline */}
          <div className="sm:col-span-2 md:col-span-1 space-y-3.5">
            <div className="flex items-center gap-2 select-none">
              <img
                src="/logo.png"
                alt="FastHire AI Logo"
                className="h-8 w-8 rounded-xl object-contain shadow-xs"
              />
              <span className="font-extrabold text-slate-900 text-base tracking-tight">
                FastHire AI
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              AI resume optimization for people who’d rather be interviewing than reformatting.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-[10px] font-bold text-[#0d6e5a]">
              <Sparkles className="h-3 w-3" />
              <span>ATS Score Lift 57+ pts</span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Product
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-xs text-slate-500 hover:text-[#0d6e5a] transition-colors font-medium inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust Column */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Trust
            </h4>
            <ul className="space-y-2.5">
              {trustLinks.map((item) => (
                <li key={item.label}>
                  {item.isExternal ? (
                    <a
                      href={item.href}
                      className="text-xs text-slate-500 hover:text-[#0d6e5a] transition-colors font-medium inline-flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-xs text-slate-500 hover:text-[#0d6e5a] transition-colors font-medium inline-block"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Account & Pricing Column */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
              Account & Pricing
            </h4>
            <ul className="space-y-2.5">
              {accountLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-xs text-slate-500 hover:text-[#0d6e5a] transition-colors font-medium inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
            © {new Date().getFullYear()} FastHire AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              100% Secure &amp; Private
            </span>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
