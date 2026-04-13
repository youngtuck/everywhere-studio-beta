-- Sentinel intelligence briefings per user (filled by api/sentinel-generate and cron).
CREATE TABLE IF NOT EXISTS public.sentinel_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  date_label text,
  briefing jsonb NOT NULL,
  signals_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sentinel_briefings_user_generated
  ON public.sentinel_briefings (user_id, generated_at DESC);

ALTER TABLE public.sentinel_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefings"
  ON public.sentinel_briefings FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/update from server uses service role (bypasses RLS).
