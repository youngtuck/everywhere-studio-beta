-- Per-project Work session sync (debounced from app). Replaces single-row-per-user model.

ALTER TABLE public.work_sessions DROP CONSTRAINT IF EXISTS work_sessions_user_id_key;

ALTER TABLE public.work_sessions
  ADD COLUMN IF NOT EXISTS project_key TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'Intake',
  ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outline_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS draft TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.work_sessions
SET stage = COALESCE(NULLIF(TRIM(work_stage), ''), 'Intake')
WHERE stage IS NULL OR stage = '';

UPDATE public.work_sessions
SET
  messages = CASE
    WHEN jsonb_typeof(payload->'messages') = 'array' THEN (payload->'messages')::jsonb
    ELSE '[]'::jsonb
  END,
  outline_rows = CASE
    WHEN jsonb_typeof(payload->'outlineRows') = 'array' THEN (payload->'outlineRows')::jsonb
    ELSE '[]'::jsonb
  END,
  draft = COALESCE(NULLIF(payload->>'generatedContent', ''), '')
WHERE payload IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS work_sessions_user_project_key_key
  ON public.work_sessions (user_id, project_key);

CREATE INDEX IF NOT EXISTS idx_work_sessions_user_project_updated
  ON public.work_sessions (user_id, project_key, updated_at DESC);
