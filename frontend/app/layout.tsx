import React from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Footer from "@/components/Footer";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "FastHire-AI — Free AI Resume Builder & ATS Score Checker",
  description: "Free AI-powered resume builder and ATS checker. Score your resume against any job description, get it rewritten with missing keywords, and download a clean PDF. No credit card required.",
  keywords: [
    "free ATS checker",
    "free resume builder",
    "AI resume optimizer",
    "ATS score checker",
    "resume ATS score",
    "free resume scanner",
    "ATS resume builder",
    "resume keyword checker",
    "free resume checker india",
    "ATS friendly resume"
  ],
  openGraph: {
    title: "FastHire-AI — Free AI Resume Builder & ATS Checker",
    description: "Score 90+ on ATS in 30 seconds. Free forever.",
    url: "https://fasthireai.vercel.app",
    siteName: "FastHire-AI",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FastHire-AI — Free ATS Resume Optimizer",
    description: "Score 90+ on ATS in 30 seconds. Free forever.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#111318] text-[#e2e2e8] flex flex-col antialiased font-sans">
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <div className="flex flex-col min-h-screen flex-1">
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
