-- Run this in Supabase Dashboard → SQL Editor (one-time setup).
-- Adds Voice DNA capture fields to profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voice_profile JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

