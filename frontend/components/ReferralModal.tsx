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
      <DialogContent className="sm:max-w-lg border-white/10 bg-[#0b0c1b]/95 backdrop-blur-2xl text-white shadow-2xl rounded-3xl p-6 sm:p-8 select-none">
        
        {/* Header Icon */}
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-emerald-500/30 border border-violet-500/30 flex items-center justify-center text-emerald-400 shadow-inner mb-2">
          <Gift className="h-7 w-7 animate-bounce" />
        </div>

        <DialogHeader className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Refer & Earn Program</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Give 1 Free Credit, Get 1 Free Credit
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Invite your job-seeking friends to FastHire-AI. When they sign up, you <strong className="text-white">BOTH receive +1 Free AI Resume Optimization credit</strong>!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">

          {/* Referral Link Box */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Your Unique Referral Link
            </label>
            <div className="flex items-center gap-2 bg-[#050612] border border-white/10 p-1.5 rounded-2xl">
              <input
                type="text"
                readOnly
                value={loading ? "Generating your referral link..." : referralData.referralLink}
                className="bg-transparent text-xs text-slate-200 px-3 w-full font-mono outline-none truncate"
              />
              <Button
                onClick={handleCopyLink}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs h-9 px-4 rounded-xl shrink-0 transition-all shadow-lg shadow-emerald-500/20"
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
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Share2 className="h-3 w-3" /> Quick Share
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(referralData.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-[#122e1e] hover:bg-[#194029] border border-emerald-500/20 text-emerald-300 text-xs font-bold py-2 px-3 rounded-xl transition-all"
              >
                <span>WhatsApp</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralData.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-[#0a233b] hover:bg-[#0f3458] border border-blue-500/20 text-blue-300 text-xs font-bold py-2 px-3 rounded-xl transition-all"
              >
                <span>LinkedIn</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              {/* Twitter/X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(referralData.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 bg-[#171829] hover:bg-[#20223b] border border-white/10 text-slate-300 text-xs font-bold py-2 px-3 rounded-xl transition-all"
              >
                <span>Twitter / X</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 bg-[#060714] border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Friends Joined</p>
                <p className="text-base font-black text-white">{referralData.totalReferrals}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Award className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Extra Credits Earned</p>
                <p className="text-base font-black text-emerald-400">+{referralData.bonusCredits}</p>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
