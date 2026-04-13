-- Clean up duplicate/orphaned outputs with zero score still marked as in_progress.
-- These were created by the old code path that inserted before revision mode was fixed.
DELETE FROM outputs
WHERE score = 0
  AND content_state = 'in_progress';
