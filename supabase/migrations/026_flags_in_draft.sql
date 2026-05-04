-- CO_038C WS12: per-user toggle for draft flag highlight visibility.
-- The Edit-stage flag detection (PASSIVE_REGEX, CLICHE_REGEX, percentage claims) and
-- the "Draft has flagged items" advance warning continue to run regardless. This flag
-- only controls whether matched paragraphs render with a visual highlight treatment.
--
-- Run: Supabase Dashboard, SQL Editor, or `supabase db push`.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS flags_in_draft boolean DEFAULT true;
