-- Projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  -- Watch configuration for Sentinel
  watch_industries TEXT[] DEFAULT '{}',
  watch_topics TEXT[] DEFAULT '{}',
  watch_people TEXT[] DEFAULT '{}',
  -- Project-specific context that gets injected into agent prompts
  project_context TEXT DEFAULT '',
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Add project_id to outputs table
ALTER TABLE public.outputs ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add project_id to sentinel_briefings table
ALTER TABLE public.sentinel_briefings ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_outputs_project ON public.outputs(project_id);
CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_sentinel_briefings_project ON public.sentinel_briefings(project_id);

-- Auto-create a default "My Studio" project for new users
-- (Add this to the existing handle_new_user trigger or create a new one)
CREATE OR REPLACE FUNCTION public.handle_new_user_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.projects (user_id, name, description, is_default)
  VALUES (NEW.id, 'My Studio', 'Your default workspace', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_project
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_project();

