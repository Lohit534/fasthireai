"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CreditInfo } from "@/types";
import { logger } from "@/lib/logger";
import { Coins } from "lucide-react";

interface CreditBadgeProps {
  refreshKey?: number;
}

export default function CreditBadge({ refreshKey = 0 }: CreditBadgeProps) {
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchCredits() {
      try {
        setLoading(true);
        const res = await fetch("/api/credits");
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setCredits(data);
          }
        }
      } catch (err) {
        logger.error("Failed to load credits status in CreditBadge", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchCredits();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <Badge variant="outline" className="border-slate-800 text-slate-400 animate-pulse py-1">
        <Coins className="h-3.5 w-3.5 mr-1" />
        checking...
      </Badge>
    );
  }

  const freeRemaining = credits?.freeRemaining ?? 0;
  const paidCredits = credits?.paidCredits ?? 0;
  const isPositive = freeRemaining > 0 || paidCredits > 0;

  let badgeText = "";
  if (freeRemaining > 0) {
    badgeText = `${freeRemaining} of 2 free left`;
  } else if (paidCredits > 0) {
    badgeText = `${paidCredits} paid left`;
  } else {
    badgeText = "0 free left";
  }

  return (
    <Badge
      variant="outline"
      className={
        isPositive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 py-1"
          : "border-red-500/30 bg-red-500/10 text-red-400 py-1"
      }
    >
      <Coins className="h-3.5 w-3.5 mr-1" />
      {badgeText}
    </Badge>
  );
}
