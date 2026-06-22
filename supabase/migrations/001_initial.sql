-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','plus','pro')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode        TEXT NOT NULL DEFAULT 'realtime' CHECK (mode IN ('realtime','twelve_hour')),
  category    TEXT NOT NULL CHECK (category IN ('fashion','food','home','design','beauty','other')),
  question    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  photo_url   TEXT NOT NULL,
  vote_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  voter_id    TEXT,
  voter_type  TEXT NOT NULL DEFAULT 'human' CHECK (voter_type IN ('human','ai')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, voter_id)
);

CREATE TABLE ai_verdicts (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id                  UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  recommendation_option_id UUID NOT NULL REFERENCES options(id),
  confidence               NUMERIC NOT NULL DEFAULT 0.8,
  insights                 JSONB NOT NULL DEFAULT '[]',
  sources                  JSONB NOT NULL DEFAULT '[]',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchases (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id      UUID REFERENCES posts(id),
  product_type TEXT NOT NULL,
  amount_pence INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE options    ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases  ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_read_all"   ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- posts
CREATE POLICY "posts_read_all"        ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_own"      ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own"      ON posts FOR UPDATE USING (auth.uid() = user_id);

-- options (managed by backend service role; public read)
CREATE POLICY "options_read_all" ON options FOR SELECT USING (true);

-- votes
CREATE POLICY "votes_read_all"    ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_any"  ON votes FOR INSERT WITH CHECK (true);

-- ai_verdicts
CREATE POLICY "ai_verdicts_read_all" ON ai_verdicts FOR SELECT USING (true);

-- purchases
CREATE POLICY "purchases_read_own"   ON purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "purchases_insert_own" ON purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX posts_user_id_idx       ON posts (user_id);
CREATE INDEX posts_status_exp_idx    ON posts (status, expires_at);
CREATE INDEX options_post_id_idx     ON options (post_id);
CREATE INDEX votes_post_id_idx       ON votes (post_id);
CREATE INDEX votes_post_voter_idx    ON votes (post_id, voter_id);
CREATE INDEX ai_verdicts_post_id_idx ON ai_verdicts (post_id);

-- ─── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE options;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- ─── Storage ──────────────────────────────────────────────────────────────────
-- Run in Supabase dashboard → Storage → New bucket:
--   Name: post-images
--   Public: true
--   Max file size: 10 MB
--   Allowed MIME types: image/jpeg, image/png, image/heic, image/heif, image/webp
