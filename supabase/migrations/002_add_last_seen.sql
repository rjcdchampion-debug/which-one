-- Add last_seen column for online presence tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
