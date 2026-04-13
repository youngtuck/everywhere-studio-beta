-- Optional per-user memory lines for Reed (pinned facts, future session summaries).
-- Injected in api/_resources.js when rows exist. UI to manage rows can follow.

CREATE TABLE IF NOT EXISTS public.composer_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'pinned' CHECK (source IN ('pinned', 'session_summary', 'import')),
  sort_priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_composer_memory_user ON public.composer_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_composer_memory_user_priority ON public.composer_memory(user_id, sort_priority DESC, updated_at DESC);

ALTER TABLE public.composer_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own composer_memory" ON public.composer_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own composer_memory" ON public.composer_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own composer_memory" ON public.composer_memory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own composer_memory" ON public.composer_memory
  FOR DELETE USING (auth.uid() = user_id);
