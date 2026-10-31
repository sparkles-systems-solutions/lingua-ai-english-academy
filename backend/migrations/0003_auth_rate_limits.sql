-- Phase 3 preparation: indexes and persistent rate-limit counters for authentication.
-- Keys must be keyed hashes (not raw email addresses or IP addresses).
CREATE TABLE auth_rate_limits (
  bucket_key_hash TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('learner_otp_request', 'learner_otp_verify', 'admin_auth')),
  window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  blocked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_auth_rate_limits_blocked ON auth_rate_limits(blocked_until);
CREATE INDEX idx_otp_expiry ON otp_challenges(expires_at, consumed_at);
CREATE INDEX idx_sessions_active ON sessions(user_id, expires_at, revoked_at);
CREATE INDEX idx_dictionary_published ON dictionary_entries(language, normalized_headword) WHERE status = 'published';
