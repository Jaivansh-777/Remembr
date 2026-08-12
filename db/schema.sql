-- Remembr — Postgres schema (Neon)
-- Run once: psql "$DATABASE_URL" -f db/schema.sql

-- Files: content bytes + metadata. New uploads are stored here.
CREATE TABLE IF NOT EXISTS files (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  project_id  TEXT,
  chat_id     TEXT,
  name        TEXT NOT NULL,
  type        TEXT,
  category    TEXT,
  size        BIGINT NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'ready',
  summary     TEXT,
  text        TEXT,
  facts       JSONB NOT NULL DEFAULT '[]',
  keywords    JSONB NOT NULL DEFAULT '[]',
  metadata    JSONB NOT NULL DEFAULT '{}',
  content     BYTEA,
  error       TEXT,
  created_at  BIGINT NOT NULL,
  expires_at  BIGINT
);

CREATE INDEX IF NOT EXISTS files_user_id_idx ON files (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS files_project_id_idx ON files (project_id);
CREATE INDEX IF NOT EXISTS files_chat_id_idx ON files (chat_id);

-- Chats: one row per conversation.
CREATE TABLE IF NOT EXISTS chats (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  project_id  TEXT,
  title       TEXT,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats (user_id, updated_at DESC);

-- Messages: one row per chat turn.
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  chat_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages (chat_id, created_at);

-- Memories: AI-extracted facts for cross-session recall.
CREATE TABLE IF NOT EXISTS memories (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  project_id  TEXT,
  chat_id     TEXT,
  content     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'fact',
  confidence  REAL NOT NULL DEFAULT 1,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS memories_project_id_idx ON memories (project_id);

-- Feedback: thumbs up/down on assistant messages (reward/penalty signal for learning).
CREATE TABLE IF NOT EXISTS message_feedback (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  chat_id     TEXT,
  message_id  TEXT NOT NULL,
  value       INTEGER NOT NULL DEFAULT 0,
  created_at  BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS message_feedback_user_message_idx
  ON message_feedback (user_id, message_id);
CREATE INDEX IF NOT EXISTS message_feedback_user_id_idx ON message_feedback (user_id, created_at DESC);

-- User learning profiles: adaptive behavioral stats used to personalize prompts.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id            TEXT PRIMARY KEY,
  message_count      INTEGER NOT NULL DEFAULT 0,
  avg_message_chars  REAL NOT NULL DEFAULT 0,
  hindi_messages     INTEGER NOT NULL DEFAULT 0,
  emoji_messages     INTEGER NOT NULL DEFAULT 0,
  up_votes           INTEGER NOT NULL DEFAULT 0,
  down_votes         INTEGER NOT NULL DEFAULT 0,
  style_score        REAL NOT NULL DEFAULT 0,
  learning           JSONB NOT NULL DEFAULT '{}',
  updated_at         BIGINT NOT NULL
);
