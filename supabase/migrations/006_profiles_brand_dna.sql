-- Add Brand DNA and Voice DNA markdown columns to profiles if missing.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_dna JSONB,
  ADD COLUMN IF NOT EXISTS brand_dna_md TEXT,
  ADD COLUMN IF NOT EXISTS voice_dna_md TEXT;
