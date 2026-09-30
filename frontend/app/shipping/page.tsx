import React from "react";
import Link from "next/link";
import { ArrowLeft, Truck, Zap, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Shipping & Delivery Policy — FastHire AI",
  description: "FastHire AI shipping and digital delivery policy for online software subscriptions.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col antialiased font-sans">
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-[#0d6e5a] mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Return to Home
        </Link>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
              <Truck className="h-5 w-5 text-[#0d6e5a]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shipping & Delivery Policy</h1>
              <p className="text-xs text-slate-500 mt-0.5">Last updated: June 2026</p>
            </div>
          </div>

          <div className="w-full border-t border-slate-200" />

          <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-normal">
            <div className="bg-emerald-50 border border-emerald-200/80 p-5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <Zap className="h-4 w-4 text-emerald-600" />
                <span>100% Digital & Instant Delivery</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                FastHire AI is a cloud-based Software-as-a-Service (SaaS) web application. We do not manufacture or ship physical goods. All services, AI credits, and downloads are delivered electronically over the Internet.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">1. Delivery Method</h2>
              <p>
                Upon completing payment or upgrading your plan, your account is immediately credited with the corresponding optimization credits, PDF/DOCX export privileges, and unlocked features. Delivery is completed within seconds.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">2. Confirmation & Access</h2>
              <p>
                A digital order receipt and confirmation is sent directly to your registered email address immediately following successful transaction processing via Razorpay. Your updated quota is also visible instantly on your FastHire AI dashboard.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">3. Shipping Fees</h2>
              <p>
                Because all services are delivered electronically via web access and downloadable files, there are <strong>zero shipping charges, handling costs, or transit delays</strong>.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">4. Questions or Delivery Issues</h2>
              <p>
                If you do not see your purchased credits reflected in your account within 5 minutes of a completed transaction, please contact us immediately:
              </p>
              <div className="mt-3">
                <a
                  href="mailto:support@fasthireai.com?subject=Delivery%20or%20Credits%20Issue"
                  className="text-xs font-bold text-[#0d6e5a] hover:underline"
                >
                  support@fasthireai.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
