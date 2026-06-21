import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ScoreColor, ATS_THRESHOLDS } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getScoreColor(score: number): ScoreColor {
  if (score <= ATS_THRESHOLDS.RED) return "red";
  if (score <= ATS_THRESHOLDS.AMBER) return "amber";
  return "green";
}

export function getScoreLabel(score: number): string {
  if (score <= ATS_THRESHOLDS.RED) return "Weak";
  if (score <= ATS_THRESHOLDS.AMBER) return "Moderate";
  return "Strong";
}

export function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

export function countWords(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
