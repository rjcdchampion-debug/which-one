-- Track whether a free user paid £0.99 for an AI verdict on this specific post.
-- Plus/Pro users get verdicts automatically; free users need this flag set to true.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_verdict_paid BOOLEAN NOT NULL DEFAULT false;
