-- Optional label for each composer_memory row (shown in Studio UI; prepended when building Reed context).

ALTER TABLE public.composer_memory
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.composer_memory.title IS 'Optional short label; body remains the required Reed-facing text.';
