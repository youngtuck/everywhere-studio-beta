-- Pipeline infrastructure for agent gates, Betterish, templates, and content state

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id UUID REFERENCES outputs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PASSED', 'BLOCKED', 'ERROR')),
  original_draft TEXT,
  final_draft TEXT,
  gate_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  betterish_score JSONB,
  betterish_total INTEGER,
  wrap_applied BOOLEAN DEFAULT false,
  qa_result JSONB,
  completeness_result JSONB,
  blocked_at TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_tells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tell TEXT NOT NULL,
  category TEXT CHECK (category IN ('word', 'phrase', 'pattern', 'structure')),
  example TEXT,
  active BOOLEAN DEFAULT true,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS output_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_type TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS content_state TEXT DEFAULT 'in_progress'
  CHECK (content_state IN ('lot', 'in_progress', 'vault'));

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_output ON pipeline_runs(output_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user ON pipeline_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_outputs_state ON outputs(content_state);
CREATE INDEX IF NOT EXISTS idx_templates_user ON output_templates(user_id);

INSERT INTO ai_tells (tell, category) VALUES
  ('Delve', 'word'),
  ('It''s worth noting that', 'phrase'),
  ('Importantly,...', 'phrase'),
  ('Certainly/Absolutely as opener', 'phrase'),
  ('In conclusion.../In summary...', 'phrase'),
  ('Navigating (as metaphor)', 'word'),
  ('Landscape (describing industry)', 'word'),
  ('Robust (describing solution)', 'word'),
  ('Three parallel items same start word', 'structure'),
  ('Closing paragraph summarizes', 'structure'),
  ('Tapestry/rich tapestry', 'phrase'),
  ('At the end of the day', 'phrase'),
  ('It''s not just X, it''s Y pattern', 'structure'),
  ('In today''s world/In today''s...', 'phrase'),
  ('This is a testament to', 'phrase'),
  ('Em dash sentence connectors', 'structure'),
  ('Here''s the thing: AI transition', 'phrase'),
  ('Let''s be clear:/Make no mistake:', 'phrase'),
  ('The reality is: AI opinion as fact', 'phrase')
ON CONFLICT DO NOTHING;

