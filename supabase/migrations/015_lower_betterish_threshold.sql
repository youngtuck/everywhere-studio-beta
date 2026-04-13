-- Lower Betterish publication threshold from 900 to 800.
-- Promote outputs scoring 800-899 that are still marked as in_progress.
UPDATE outputs
SET content_state = 'vault'
WHERE score >= 800
  AND score < 900
  AND content_state = 'in_progress';
