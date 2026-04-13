-- Settings page: profile columns for account, studio, and notifications.
-- (Spec called this 006_settings_columns; file is 008 to avoid overwriting 006_profiles_brand_dna.sql.)
-- Run: Supabase Dashboard → SQL Editor or `supabase db push`

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS publication_threshold integer DEFAULT 800,
  ADD COLUMN IF NOT EXISTS voice_dna_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_agent_names boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS one_question_mode boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS proactive_suggestions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS browser_push boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sentinel_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_digest boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_deleted_at timestamptz;

-- Optional: create avatars storage bucket (run in Dashboard if not exists)
-- Storage → New bucket → name: avatars, Public: yes
-- RLS policy: Users can upload/update/select their own folder (id/*)
