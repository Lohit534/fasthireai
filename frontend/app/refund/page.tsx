import React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldCheck, Mail } from "lucide-react";

export const metadata = {
  title: "Cancellation & Refund Policy — FastHire AI",
  description: "Learn about the FastHire AI cancellation and refund policy for subscriptions and credits.",
};

export default function RefundPage() {
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
              <RefreshCw className="h-5 w-5 text-[#0d6e5a]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cancellation & Refund Policy</h1>
              <p className="text-xs text-slate-500 mt-0.5">Last updated: June 2026</p>
            </div>
          </div>

          <div className="w-full border-t border-slate-200" />

          <div className="space-y-6 text-sm text-slate-600 leading-relaxed font-normal">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <ShieldCheck className="h-4 w-4 text-[#0d6e5a]" />
                <span>Our Customer Satisfaction Commitment</span>
              </div>
              <p className="text-xs text-slate-500">
                At FastHire AI, we want you to be fully satisfied with our AI resume optimization tools. If you encounter any technical issues or are dissatisfied with your purchase, we are here to assist.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">1. Subscription Plans & Digital Credits</h2>
              <p>
                FastHire AI provides digital credits and monthly/yearly subscriptions (Premium Pro & Pro Max). Because credits and optimization features are delivered immediately upon payment, all purchases are generally non-refundable once optimization credits have been utilized.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">2. Eligibility for Refunds</h2>
              <p>
                You may request a full refund within <strong>7 days</strong> of your initial purchase if:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
                <li>You experienced persistent technical errors that prevented you from optimizing resumes.</li>
                <li>You were accidentally charged multiple times for the same transaction.</li>
                <li>You have not used more than 2 paid optimization credits from the newly purchased billing period.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">3. Subscription Cancellation</h2>
              <p>
                You can cancel your active subscription at any time directly through your <strong>Billing</strong> dashboard or by reaching out to our support team. Upon cancellation, your access remains active until the end of the current billing cycle, and no further renewals will be charged.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">4. Refund Processing Time</h2>
              <p>
                Approved refunds are credited back to the original payment method (via Razorpay/card/UPI) within <strong>5–7 business days</strong>, depending on your banking provider.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">5. How to Request a Refund</h2>
              <p>
                To request a refund, please contact us with your registered email and payment ID:
              </p>
              <div className="mt-3">
                <a
                  href="mailto:support@fasthireai.com?subject=Refund%20Request"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d6e5a] text-white text-xs font-bold hover:bg-[#094d3f] transition-all shadow-xs"
                >
                  <Mail className="h-4 w-4" />
                  Contact Support for Refund
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
