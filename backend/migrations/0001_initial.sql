-- Lingua AI English Academy: initial relational schema.
-- Apply with Wrangler D1 migrations after creating the database.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learner_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  level TEXT NOT NULL DEFAULT 'pre-a1',
  teaching_language TEXT NOT NULL DEFAULT 'si',
  daily_target_minutes INTEGER NOT NULL DEFAULT 15 CHECK (daily_target_minutes BETWEEN 5 AND 120),
  preferences_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE otp_challenges (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('learner_login', 'admin_login')),
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_otp_email_purpose_created ON otp_challenges(email_normalized, purpose, created_at);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  auth_method TEXT NOT NULL,
  mfa_verified_at TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user_expiry ON sessions(user_id, expires_at);

CREATE TABLE learner_saved_words (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dictionary_entry_id TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  review_status TEXT NOT NULL DEFAULT 'new',
  PRIMARY KEY (user_id, dictionary_entry_id)
);

CREATE TABLE lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  best_score INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_quiz_user_time ON quiz_attempts(user_id, attempted_at);

CREATE TABLE admin_audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  safe_metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_admin_audit_time ON admin_audit_events(created_at);

-- Security note: OTPs, session tokens and recovery codes are never stored in plaintext.
-- Admin passwords and TOTP factors will be added with the authentication implementation.
