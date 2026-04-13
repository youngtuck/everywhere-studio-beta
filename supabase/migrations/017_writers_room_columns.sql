-- Writer's Room: add columns to track multi-phase creative process
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS outline jsonb DEFAULT NULL;
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS stress_test_results jsonb DEFAULT NULL;
ALTER TABLE outputs ADD COLUMN IF NOT EXISTS writer_room_phase text DEFAULT NULL;
