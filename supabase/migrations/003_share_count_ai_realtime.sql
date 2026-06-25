-- Add share count to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS share_count INTEGER NOT NULL DEFAULT 0;

-- Add ai_verdicts to realtime publication so the feed updates live when AI votes are cast
ALTER PUBLICATION supabase_realtime ADD TABLE ai_verdicts;
