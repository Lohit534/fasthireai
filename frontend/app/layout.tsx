import React from "react";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "FastHire AI — Beat the ATS. Land the Interview.",
  description: "AI-powered resume optimization that beats ATS filters in under 30 seconds. Free to start.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[#040d1a] text-foreground flex flex-col antialiased font-sans">
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <div className="flex flex-col min-h-screen">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
