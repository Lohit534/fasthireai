"use client";

import React, { useState, useEffect } from "react";

export function scoreColor(n: number) {
  if (n >= 75) return { ring: "#22c55e", bg: "rgba(34,197,94,0.08)", text: "#22c55e", border: "rgba(34,197,94,0.2)" };
  if (n >= 50) return { ring: "#f59e0b", bg: "rgba(245,158,11,0.08)", text: "#f59e0b", border: "rgba(245,158,11,0.2)" };
  return { ring: "#ef4444", bg: "rgba(239,68,68,0.08)", text: "#ef4444", border: "rgba(239,68,68,0.2)" };
}

interface CircleGaugeProps {
  value: number;
  label: string;
  size?: number;
}

export default function CircleGauge({ value, label, size = 100 }: CircleGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 1000; // Animate over 1000ms
    const increment = end / (duration / 16); // ~60fps
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  const { ring, bg, text } = scoreColor(value);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (displayValue / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={6} />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={ring} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-150 ease-out"
          />
        </svg>
        <span className="relative text-2xl font-black tracking-tight animate-pulse-subtle" style={{ color: text }}>{displayValue}</span>
      </div>
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}
