-- ============================================================
-- Migration: Data Preferences + Training Samples
-- Run this SQL in your Supabase SQL editor (or via CLI migrations)
-- ============================================================

-- 1. DataPreferences table
--    Stores per-user opt-in/out setting for AI model training.
--    Keyed on userId — one row per user.
CREATE TABLE IF NOT EXISTS "DataPreferences" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  "dataTrainingEnabled"   BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast look-up by user
CREATE INDEX IF NOT EXISTS idx_datapreferences_userid ON "DataPreferences" ("userId");

-- Row Level Security: users can only read/write their OWN row
ALTER TABLE "DataPreferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preference"
  ON "DataPreferences"
  FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can upsert own preference"
  ON "DataPreferences"
  FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own preference"
  ON "DataPreferences"
  FOR UPDATE
  USING (auth.uid() = "userId");

-- 2. TrainingSample table
--    Stores ANONYMISED training snippets — NO userId, NO PII.
--    Used to improve keyword injection & scoring accuracy over time.
CREATE TABLE IF NOT EXISTS "TrainingSample" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NOTE: No userId column — samples are fully anonymous
  "jobTitle"          TEXT,
  "keywordsFromJD"    TEXT[] DEFAULT '{}',
  "keywordsInjected"  TEXT[] DEFAULT '{}',
  "keywordsMissing"   TEXT[] DEFAULT '{}',
  "scoreBefore"       INT,
  "scoreAfter"        INT,
  "jdSnippet"         TEXT,        -- first 300 chars, PII stripped
  "resumeSnippet"     TEXT,        -- first 300 chars, PII stripped
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_trainingsample_jobtitle ON "TrainingSample" ("jobTitle");
CREATE INDEX IF NOT EXISTS idx_trainingsample_createdat ON "TrainingSample" ("createdAt");

-- RLS: only service-role (admin) can insert/read training samples
--      No public SELECT allowed — this data is internal only
ALTER TABLE "TrainingSample" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to training samples"
  ON "TrainingSample"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- (Optional) Grant the authenticated role read-only if you want
-- admin dashboards to query this. Otherwise leave this commented out.
-- GRANT SELECT ON "TrainingSample" TO authenticated;
