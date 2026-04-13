-- Active Work session mirror (browser sessionStorage sync + Pipeline "In Progress")
-- One row per user; upserted on each saveSession when authenticated.

CREATE TABLE public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_title TEXT NOT NULL DEFAULT '',
  work_stage TEXT NOT NULL DEFAULT 'Intake',
  output_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT work_sessions_user_id_key UNIQUE (user_id)
);

CREATE INDEX idx_work_sessions_user_updated ON public.work_sessions(user_id, updated_at DESC);

ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own work_sessions" ON public.work_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work_sessions" ON public.work_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work_sessions" ON public.work_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own work_sessions" ON public.work_sessions
  FOR DELETE USING (auth.uid() = user_id);
