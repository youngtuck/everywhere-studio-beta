-- Add override_log column to sunday_editions for tracking publish-with-violations events.
ALTER TABLE public.sunday_editions ADD COLUMN IF NOT EXISTS override_log jsonb DEFAULT '[]';
