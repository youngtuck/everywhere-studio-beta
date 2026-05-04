-- Store generated visuals so they persist across page navigations.
CREATE TABLE IF NOT EXISTS output_visuals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id   uuid NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vibe        text NOT NULL,
  aspect_ratio text NOT NULL DEFAULT '16:9',
  image_base64 text NOT NULL,
  mime_type   text NOT NULL DEFAULT 'image/png',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by output
CREATE INDEX idx_output_visuals_output_id ON output_visuals(output_id);

-- RLS: users can only see and manage their own visuals
ALTER TABLE output_visuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own visuals"
  ON output_visuals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visuals"
  ON output_visuals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own visuals"
  ON output_visuals FOR DELETE
  USING (auth.uid() = user_id);
