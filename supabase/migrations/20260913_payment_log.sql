-- ============================================================
-- Migration: PaymentLog Table
-- Tracks every real Razorpay payment for admin revenue reporting.
-- Run this SQL in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================

CREATE TABLE IF NOT EXISTS "PaymentLog" (
  "id"                TEXT PRIMARY KEY,
  "userId"            TEXT NOT NULL,
  "email"             TEXT NOT NULL,
  "planId"            TEXT NOT NULL,
  "billingCycle"      TEXT NOT NULL DEFAULT 'monthly',
  "amount"            INTEGER NOT NULL,
  "razorpayOrderId"   TEXT NOT NULL,
  "razorpayPaymentId" TEXT NOT NULL UNIQUE,
  "isFreeGrant"       BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paymentlog_userid    ON "PaymentLog" ("userId");
CREATE INDEX IF NOT EXISTS idx_paymentlog_createdat ON "PaymentLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_paymentlog_freegrant ON "PaymentLog" ("isFreeGrant");

ALTER TABLE "PaymentLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to payment log"
  ON "PaymentLog"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
