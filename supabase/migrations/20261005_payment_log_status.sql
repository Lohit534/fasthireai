-- ============================================================
-- Migration: Add status column to PaymentLog
-- Optional column addition for PaymentLog status tracking.
-- Run in Supabase SQL Editor if you want the explicit status column.
-- ============================================================

ALTER TABLE IF EXISTS "PaymentLog" 
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'captured';
