-- Sentinel topics per profile (used by cron and Generate Now).
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sentinel_topics text[] DEFAULT ARRAY[
  'AI and technology',
  'thought leadership',
  'executive communication',
  'content strategy'
];
