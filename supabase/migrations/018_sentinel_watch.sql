-- Sources table for Watch/Sentinel
CREATE TABLE IF NOT EXISTS public.watch_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Substack', 'Podcast', 'Newsletter', 'Blog', 'Publication')),
  name TEXT NOT NULL,
  track TEXT DEFAULT 'general' CHECK (track IN ('competitor', 'thoughtLeader', 'techInfra', 'industry', 'general')),
  rss_url TEXT DEFAULT '',
  description TEXT,
  validation_status TEXT DEFAULT 'valid' CHECK (validation_status IN ('valid', 'invalid', 'validating')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Briefings cache table
CREATE TABLE IF NOT EXISTS public.watch_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  run_date TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  briefing JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, run_date, config_hash)
);

-- Watch configuration stored in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS watch_config JSONB DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_watch_sources_user ON watch_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_briefings_user ON watch_briefings(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_briefings_lookup ON watch_briefings(user_id, run_date, config_hash);

-- RLS
ALTER TABLE watch_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sources" ON watch_sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own briefings" ON watch_briefings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
