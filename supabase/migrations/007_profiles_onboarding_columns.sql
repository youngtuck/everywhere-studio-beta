-- Add all profile columns used by OnboardingPage (Voice DNA + Brand DNA).
-- Without these, profile updates fail and the user sees "We couldn't save your progress."

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voice_dna JSONB,
  ADD COLUMN IF NOT EXISTS voice_dna_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voice_dna_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_dna_method TEXT,
  ADD COLUMN IF NOT EXISTS brand_dna_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS brand_dna_completed_at TIMESTAMPTZ;
