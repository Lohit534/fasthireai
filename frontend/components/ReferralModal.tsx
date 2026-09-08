"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Share2, Sparkles, Users, Award, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    referralLink: string;
    totalReferrals: number;
    bonusCredits: number;
  }>({
    referralCode: "REF-WAITING",
    referralLink: "https://fasthireai.vercel.app/auth/signup?ref=...",
    totalReferrals: 0,
    bonusCredits: 0,
  });

  useEffect(() => {
    if (isOpen) {
      fetchReferralInfo();
    }
  }, [isOpen]);

  const fetchReferralInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      if (res.ok) {
        const data = await res.json();
        setReferralData(data);
      }
    } catch (e) {
      // silent — failed to load referral details
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralData.referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard! 🚀");
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = encodeURIComponent(
    `Hey! I'm using FastHire-AI to optimize my resume and score 90+ on ATS tests. Use my referral link to get +1 FREE AI resume optimization credit!`
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg border-slate-200 bg-white text-slate-900 shadow-2xl rounded-2xl p-6 sm:p-8 select-none">
        
        {/* Header Icon */}
        <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0d6e5a] mb-2">
          <Gift className="h-7 w-7 animate-bounce" />
        </div>

        <DialogHeader className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0d6e5a]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Refer & Earn Program</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Give 1 Free Credit, Get 1 Free Credit
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Invite your job-seeking friends to FastHire AI. When they sign up, you <strong className="text-slate-800">BOTH receive +1 Free AI Resume Optimization credit</strong>!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">

          {/* Referral Link Box */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Your Unique Referral Link
            </label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
              <input
                type="text"
                readOnly
                value={loading ? "Generating your referral link..." : referralData.referralLink}
                className="bg-transparent text-xs text-slate-800 px-3 w-full font-mono outline-none truncate"
              />
              <Button
                onClick={handleCopyLink}
                disabled={loading}
                className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white font-bold text-xs h-9 px-4 rounded-lg shrink-0 transition-all shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Social Share Buttons */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Share2 className="h-3 w-3" /> Quick Share
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(referralData.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                <span>WhatsApp</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralData.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                <span>LinkedIn</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              {/* Twitter/X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(referralData.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                <span>Twitter / X</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d6e5a]">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Friends Joined</p>
                <p className="text-base font-black text-slate-900">{referralData.totalReferrals}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Award className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Extra Credits Earned</p>
                <p className="text-base font-black text-emerald-700">+{referralData.bonusCredits}</p>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
