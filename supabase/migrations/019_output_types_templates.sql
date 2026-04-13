-- CO-003: Output type columns on outputs table
ALTER TABLE public.outputs ADD COLUMN IF NOT EXISTS output_category text;
ALTER TABLE public.outputs ADD COLUMN IF NOT EXISTS output_type_id text;
ALTER TABLE public.outputs ADD COLUMN IF NOT EXISTS source_output_id uuid REFERENCES public.outputs(id) ON DELETE SET NULL;

-- CO-003: Templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  output_type text NOT NULL,
  name text NOT NULL,
  is_base boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.templates
  FOR SELECT USING (auth.uid() = user_id OR is_base = true);
CREATE POLICY "Users can insert own templates" ON public.templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.templates
  FOR DELETE USING (auth.uid() = user_id AND is_base = false);

CREATE INDEX IF NOT EXISTS idx_templates_user ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_output_type ON public.templates(output_type);
CREATE INDEX IF NOT EXISTS idx_outputs_category ON public.outputs(output_category);
CREATE INDEX IF NOT EXISTS idx_outputs_source ON public.outputs(source_output_id);

-- Add project_type column to projects for identifying Book/Website/Newsletter/Social Media projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS output_type text;
