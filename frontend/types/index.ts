export interface ATSScore {
  overall: number;
  semanticMatch: number;
  keywordMatch: number;
  impactBullets: number;
  formatting: number;
  extractedSkills: string[];
  extractedTitles: string[];
  missingKeywords: string[];
  foundKeywords: string[];
  missingMetrics?: string[];
  quantifiedCount?: number;
  totalBulletsCount?: number;
  metricCoveragePercent?: number;
}

export interface OptimizeResult {
  scoreBefore: number;
  scoreAfter: number;
  optimizedText: string;
  keywordsAdded: string[];
  changesCount: number;
  summary: string;
  resumeId: string;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  originalText: string;
  jobDescription: string;
  jobTitle?: string | null;
  company?: string | null;
  scoreBefore: number;
  scoreAfter: number;
  keywordsBefore: number;
  keywordsAfter: number;
  impactBefore: number;
  impactAfter: number;
  optimizedText: string;
  keywordsAdded: string[];
  pdfUrl?: string | null;
  docxUrl?: string | null;
  createdAt: Date | string;
}

export interface CreditInfo {
  freeUsed: number;
  paidCredits: number;
  freeRemaining: number;
  resetAt: Date | string;
  isOwner?: boolean;
  isFirst50?: boolean;
  planId?: string;
  billingCycle?: string;
  expiresAt?: Date | string | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export type ExportFormat = 'pdf' | 'docx';
export type ScoreColor = 'red' | 'amber' | 'green';

export const ATS_THRESHOLDS = {
  RED: 40,
  AMBER: 70,
} as const;

export const FREE_CREDITS_PER_MONTH = 2;
export const PRO_CREDITS_PER_MONTH = 20;
export const PRO_MAX_CREDITS_PER_MONTH = 90;
export const MAX_RESUME_CHARS = 8000;
export const MAX_JD_CHARS = 5000;
export const MIN_RESUME_CHARS = 100;
export const MIN_JD_CHARS = 50;

// Owner email configuration with environment variable and fallback
export const OWNER_EMAIL = process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.NEXT_PUBLIC_OWNER_EMAIL || "lohithpeyyala@gmail.com";
export const isOwnerEmail = (email?: string): boolean => {
  if (!email) return false;
  const rawOwners = process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.NEXT_PUBLIC_OWNER_EMAIL || "lohithpeyyala@gmail.com";
  const ownerEmails = rawOwners.split(",").map(e => e.toLowerCase().trim()).filter(Boolean);
  if (!ownerEmails.includes("lohithpeyyala@gmail.com")) {
    ownerEmails.push("lohithpeyyala@gmail.com");
  }
  return ownerEmails.includes(email.toLowerCase().trim());
};
