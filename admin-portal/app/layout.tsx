import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FastHire AI — Admin Portal",
  description: "Secure administrator control panel — FastHire AI",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#060713] text-slate-100 antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#0d0e22", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", fontSize: "12px" },
          }}
        />
        {children}
      </body>
    </html>
  );
}
