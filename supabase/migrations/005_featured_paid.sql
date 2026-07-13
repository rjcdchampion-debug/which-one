-- Track whether a post has paid to appear in the desktop "Featured" hero slot.
-- Plus/Pro users get it included; free users pay a one-off £0.99, mirroring ai_verdict_paid.
-- When no post in the live pool has featured_paid = true, the frontend falls back to
-- auto-picking the top live post so the Featured section is never empty.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured_paid BOOLEAN NOT NULL DEFAULT false;
