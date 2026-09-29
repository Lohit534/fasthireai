"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 font-sans p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Application Error</h2>
          <p className="text-sm text-slate-600">An unexpected error occurred while loading this page.</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#0d6e5a] text-white rounded-lg text-sm font-semibold hover:bg-[#0f766e] transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
