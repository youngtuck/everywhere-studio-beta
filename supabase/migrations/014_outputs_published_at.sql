-- Optional: mark outputs as published when moved to Vault from Workbench
ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_outputs_published_at ON public.outputs(published_at) WHERE published_at IS NOT NULL;
