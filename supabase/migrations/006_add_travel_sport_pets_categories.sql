-- Add Travel, Sport, Pets to the posts.category allow-list.
-- posts.category has a DB-level CHECK constraint (see 001_initial.sql) restricting
-- values to 'fashion','food','home','design','beauty','other' — it's not a free-text
-- column, so new categories need a migration, not just frontend/backend changes.
-- The constraint name below (posts_category_check) is Postgres's default auto-generated
-- name for an inline CHECK on the "category" column; DROP IF EXISTS makes this safe to
-- run even if the live project named it differently and already lacks the constraint.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;

ALTER TABLE posts ADD CONSTRAINT posts_category_check
  CHECK (category IN ('fashion','food','home','design','beauty','travel','sport','pets','other'));
