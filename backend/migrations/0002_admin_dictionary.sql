-- Phase 2: administrator authentication controls and approved bilingual dictionary.
PRAGMA foreign_keys = ON;

CREATE TABLE admin_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_auth_policies (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  allowed_methods_json TEXT NOT NULL DEFAULT '["password_totp","email_otp"]',
  require_totp INTEGER NOT NULL DEFAULT 1 CHECK (require_totp IN (0, 1)),
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_mfa_factors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL CHECK (factor_type IN ('totp')),
  secret_ciphertext TEXT NOT NULL,
  enrolled_at TEXT,
  verified_at TEXT,
  disabled_at TEXT
);
CREATE INDEX idx_admin_mfa_user ON admin_mfa_factors(user_id, disabled_at);

CREATE TABLE admin_recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_admin_recovery_user ON admin_recovery_codes(user_id, used_at);

CREATE TABLE dictionary_entries (
  id TEXT PRIMARY KEY,
  headword TEXT NOT NULL,
  normalized_headword TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'si')),
  pronunciation_text TEXT,
  pronunciation_audio_ref TEXT,
  part_of_speech TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  source_attribution TEXT,
  content_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  updated_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_dictionary_headword ON dictionary_entries(language, normalized_headword);
CREATE INDEX idx_dictionary_status ON dictionary_entries(status, language);

CREATE TABLE dictionary_senses (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  meaning_text TEXT NOT NULL,
  target_language TEXT NOT NULL CHECK (target_language IN ('en', 'si')),
  sense_order INTEGER NOT NULL DEFAULT 1,
  usage_label TEXT
);
CREATE INDEX idx_dictionary_senses_entry ON dictionary_senses(entry_id, sense_order);

CREATE TABLE dictionary_examples (
  id TEXT PRIMARY KEY,
  sense_id TEXT NOT NULL REFERENCES dictionary_senses(id) ON DELETE CASCADE,
  sentence_text TEXT NOT NULL,
  translation_text TEXT NOT NULL,
  audio_ref TEXT,
  example_order INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_dictionary_examples_sense ON dictionary_examples(sense_id, example_order);

CREATE TABLE dictionary_content_events (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'edit', 'submit_review', 'publish', 'unpublish', 'archive')),
  safe_metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_dictionary_events_entry_time ON dictionary_content_events(entry_id, created_at);

-- Passwords must be modern password hashes; TOTP secrets must be encrypted using a
-- managed secret. OTPs, session tokens and recovery codes must be stored as hashes.
-- Public learner registration must never assign role='admin'.
