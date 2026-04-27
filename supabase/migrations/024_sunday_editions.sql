-- Sunday Editions: multi-deliverable production packages for Sunday Stories.
-- Each edition stores 12 deliverables in a content jsonb column.

CREATE TABLE IF NOT EXISTS public.sunday_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Edition',
  status text NOT NULL DEFAULT 'draft',
  impact_score integer DEFAULT 0,
  content jsonb NOT NULL DEFAULT '{}',
  brand_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sunday_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own editions" ON public.sunday_editions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own editions" ON public.sunday_editions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own editions" ON public.sunday_editions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own editions" ON public.sunday_editions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_sunday_editions_user ON public.sunday_editions(user_id, created_at DESC);
