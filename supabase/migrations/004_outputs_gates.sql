-- Run this in Supabase Dashboard → SQL Editor (one-time setup).
-- Adds a JSONB column for storing Betterish / Quality Gate scores per output.

ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS gates JSONB;

