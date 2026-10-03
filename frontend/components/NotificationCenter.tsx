"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CreditInfo, isOwnerEmail } from "@/types";
import { useUpgradeModalStore } from "@/store/useUpgradeModalStore";
import {
  Bell,
  X,
  Sparkles,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export interface AppNotification {
  id: string;
  type: "upgrade" | "expiring" | "info";
  title: string;
  message: string;
  actionText?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  dateStr?: string;
}

interface NotificationBellProps {
  credits: CreditInfo | null;
  userEmail?: string | null;
  compact?: boolean;
}

/**
 * Derives notifications based on user's current plan and expiry status.
 *
 * Rules:
 *  - Free users: "Upgrade for more features" notification.
 *  - Paid users close to expiry (<= 7 days): "Plan expiring soon, please renew/upgrade" notification.
 *  - Paid users with plenty of time (> 7 days): NO upgrade notifications.
 *  - Owner: NO upgrade/expiry notifications.
 */
export function getActiveNotifications(
  credits: CreditInfo | null,
  userEmail?: string | null,
  dismissedIds: string[] = []
): AppNotification[] {
  if (!credits) return [];

  const isOwner = credits.isOwner || isOwnerEmail(userEmail || undefined);
  if (isOwner) return [];

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
  const planId = (credits.planId || "free").toLowerCase();
  const isPaid = planId === "premium" || planId === "promax" || (credits.paidCredits && credits.paidCredits > 0);

  const notifications: AppNotification[] = [];

  if (isPaid) {
    // Check expiration date
    if (credits.expiresAt) {
      const expiry = new Date(credits.expiresAt);
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Paid users getting close to plan expiration (within 7 days)
      if (diffDays <= 7 && diffDays >= 0) {
        const notifId = `expiring_${planId}_${expiry.toISOString().slice(0, 10)}`;
        if (!dismissedIds.includes(notifId)) {
          const planTitle = planId === "promax" ? "Pro Max" : "Premium Pro";
          const formattedDate = expiry.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          notifications.push({
            id: notifId,
            type: "expiring",
            title: `${planTitle} Plan Expiring Soon`,
            message: `Your ${planTitle} subscription will expire on ${formattedDate} (${diffDays === 0 ? "today" : `in ${diffDays} day${diffDays > 1 ? "s" : ""}`}). Renew or upgrade now to keep your ATS optimizations and exports active.`,
            actionText: "Renew Plan",
            actionHref: "/dashboard/pricing",
            dateStr: formattedDate,
          });
        }
      }
    }
    // Paid users who are NOT close to expiring get ZERO upgrade notifications.
  } else {
    // Free plan users
    const notifId = `free_upgrade_${currentMonthKey}`;
    if (!dismissedIds.includes(notifId)) {
      notifications.push({
        id: notifId,
        type: "upgrade",
        title: "Upgrade for More Features",
        message: "Unlock 20 monthly AI optimizations, full PDF & DOCX downloads, AI cover letters, and career roadmaps.",
        actionText: "Upgrade to Pro",
        actionHref: "/dashboard/pricing",
        dateStr: "New",
      });
    }
  }

  return notifications;
}

export function NotificationBell({ credits, userEmail, compact = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load dismissed notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fastHire_dismissed_notifications");
      if (stored) {
        setDismissedIds(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Handle outside click to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeNotifications = getActiveNotifications(credits, userEmail, dismissedIds);
  const unreadCount = activeNotifications.length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      localStorage.setItem("fastHire_dismissed_notifications", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, ...activeNotifications.map((n) => n.id)];
    setDismissedIds(updated);
    try {
      localStorage.setItem("fastHire_dismissed_notifications", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className={`relative rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          compact
            ? "h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            : "h-9 w-9 text-slate-600 hover:text-slate-900 border border-slate-200/90 bg-white hover:bg-slate-50 shadow-xs"
        }`}
      >
        <Bell className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#0d6e5a] text-white text-[9px] font-black items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[300px] sm:w-[340px] bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2 select-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-teal-50 border border-teal-200 text-[#0d6e5a] text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[10px] text-slate-400 hover:text-slate-700 font-semibold transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notifications List */}
          {activeNotifications.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <div className="h-8 w-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-[#0d6e5a]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-800">You're all caught up!</p>
              <p className="text-[10px] text-slate-400">No unread notifications at this time.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
              {activeNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-2.5 rounded-xl border transition-all relative ${
                    notif.type === "expiring"
                      ? "bg-amber-50/70 border-amber-200/80 text-amber-950"
                      : "bg-teal-50/50 border-teal-200/70 text-slate-900"
                  }`}
                >
                  {/* Delete (X) button */}
                  <button
                    type="button"
                    onClick={(e) => handleDismiss(notif.id, e)}
                    aria-label="Delete message"
                    className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-200/50 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex items-start gap-2 pr-5">
                    <div
                      className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        notif.type === "expiring"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-teal-100 text-[#0d6e5a]"
                      }`}
                    >
                      {notif.type === "expiring" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-900 leading-tight">
                          {notif.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                        {notif.message}
                      </p>
                      {notif.actionText && notif.actionHref && (
                        <div className="pt-1">
                          <Link
                            href={notif.actionHref}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0d6e5a] hover:text-[#094d3f] hover:underline cursor-pointer"
                          >
                            <span>{notif.actionText}</span>
                            <ArrowRight className="h-2.5 w-2.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Monthly One-Time Popup Notification.
 *
 * Rules:
 *  - Free Users: One popup per month highlighting Pro features and upgrade option.
 *  - Paid Users: Only pops up if their plan is expiring within 7 days ("Your plan is expiring soon").
 *  - Paid Users with active, healthy plan: NEVER show upgrade popups.
 *  - Owners: NEVER show popups.
 *  - Users can dismiss (X), storing the month key in localStorage so it appears at most once per month.
 */
export function MonthlyNotificationModal({
  credits,
  userEmail,
}: {
  credits: CreditInfo | null;
  userEmail?: string | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    description: string;
    badge: string;
    actionText: string;
    actionHref: string;
    isExpiring?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!credits) return;

    const isOwner = credits.isOwner || isOwnerEmail(userEmail || undefined);
    if (isOwner) return;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
    const storageKey = `fastHire_monthly_popup_${currentMonthKey}`;

    // If already seen / dismissed this month, don't show
    try {
      const seen = localStorage.getItem(storageKey);
      if (seen) return;
    } catch {
      return;
    }

    const planId = (credits.planId || "free").toLowerCase();
    const isPaid = planId === "premium" || planId === "promax" || (credits.paidCredits && credits.paidCredits > 0);

    if (isPaid) {
      // Check if paid plan is getting close to expiring (within 7 days)
      if (credits.expiresAt) {
        const expiry = new Date(credits.expiresAt);
        const diffMs = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 7 && diffDays >= 0) {
          const planTitle = planId === "promax" ? "Pro Max" : "Premium Pro";
          const formattedDate = expiry.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          setModalData({
            badge: "PLAN EXPIRING SOON",
            title: `Your ${planTitle} plan expires on ${formattedDate}`,
            description: `You have ${diffDays === 0 ? "less than 24 hours" : `${diffDays} days`} left on your current billing cycle. Renew or upgrade now to keep your ATS optimizations, high-scoring bullet improvers, and exports active without disruption.`,
            actionText: "Renew / Upgrade Plan",
            actionHref: "/dashboard/pricing",
            isExpiring: true,
          });
          setShowModal(true);
        }
      }
      // Note: Paid users NOT close to expiring will NOT get any popup.
    } else {
      // Free plan users: show monthly one-time upgrade reminder
      setModalData({
        badge: "MONTHLY PRO HIGHLIGHT",
        title: "Upgrade to Pro for Unlimited Resume Optimizations",
        description: "Supercharge your job applications this month! FastHire Pro includes 20 monthly AI resume optimizations, full PDF and Word DOCX downloads, tailored cover letters, and custom career skill roadmaps.",
        actionText: "View Pricing Plans",
        actionHref: "/dashboard/pricing",
        isExpiring: false,
      });
      setShowModal(true);
    }
  }, [credits, userEmail]);

  const handleClose = () => {
    setShowModal(false);
    try {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
      localStorage.setItem(`fastHire_monthly_popup_${currentMonthKey}`, "dismissed");
    } catch {
      // Ignore
    }
  };

  if (!showModal || !modalData) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none relative">
        {/* Close (X) button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close monthly notification"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Badge & Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              modalData.isExpiring
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-teal-50 border-teal-200 text-[#0d6e5a]"
            }`}
          >
            {modalData.isExpiring ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </div>
          <div>
            <span
              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                modalData.isExpiring
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-teal-50 text-[#0d6e5a] border-teal-200"
              }`}
            >
              {modalData.badge}
            </span>
            <h3 className="font-extrabold text-slate-900 text-base mt-1 leading-snug">
              {modalData.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {modalData.description}
        </p>

        {/* Feature Highlights for Free Users */}
        {!modalData.isExpiring && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
              <span className="font-medium text-[11px]">20 AI optimizations every month</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
              <span className="font-medium text-[11px]">Download Harvard/Tech styled PDF &amp; DOCX</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#0d6e5a] shrink-0" />
              <span className="font-medium text-[11px]">AI Cover Letter &amp; 90-day Skill Roadmaps</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
          <Link
            href={modalData.actionHref}
            onClick={handleClose}
            className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white text-xs font-bold px-4 h-9 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>{modalData.actionText}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
