"use client";

import React from "react";

// List of common active/strong resume action verbs
export const ACTION_VERBS = new Set([
  "delivered", "optimized", "managed", "led", "supervised", "automated", "created", "built",
  "architected", "developed", "scaled", "designed", "engineered", "implemented", "formulated",
  "orchestrated", "reduced", "improved", "increased", "maximized", "minimized", "spearheaded",
  "coordinated", "collaborated", "facilitated", "trained", "mentored", "streamlined", "solved",
  "resolved", "overhauled", "restructured", "eliminated", "decreased", "saved", "negotiated",
  "secured", "renegotiated", "executed", "initiated", "pioneered", "launched", "championed",
  "directed", "administered", "expanded", "generated", "produced", "consolidated", "liquidated"
]);

export function scoreBullet(bulletText: string) {
  const clean = bulletText.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);

  let hasVerb = false;
  // Scan first 3-4 words for strong action verbs
  for (let i = 0; i < Math.min(words.length, 4); i++) {
    const word = words[i];
    // Check direct matching or basic stemming (ends with 'ed')
    if (ACTION_VERBS.has(word) || (word.length > 4 && word.endsWith("ed"))) {
      hasVerb = true;
      break;
    }
  }

  // Check for metrics (numbers, dollar signs, percentages, decimals)
  const hasMetric = /\b\d+(?:\.\d+)?(?:%|\s*percent|\s*million|\s*billion|\s*k|\s*m)?\b/i.test(bulletText) ||
                    /[\$\£\€]\s*\d+/.test(bulletText);

  let score = 0;
  if (hasVerb) score += 0.5;
  if (hasMetric) score += 0.5;

  return { score, hasVerb, hasMetric };
}

export function getBulletSuggestions(bulletText: string) {
  const { hasVerb, hasMetric } = scoreBullet(bulletText);
  const suggestions: string[] = [];
  const verbs = ["Delivered", "Optimized", "Spearheaded", "Automated", "Architected", "Scaled"];

  if (!hasVerb) {
    suggestions.push("Missing action verb. Start with a powerful word explaining your action.");
  }
  if (!hasMetric) {
    suggestions.push("Missing quantification. Add a metric: how many? how much? what was the business result?");
  }

  return {
    suggestions,
    exampleVerbs: verbs.slice(0, 4)
  };
}
export default function BulletScorer() { return null; }
