"""Execute every D1 SQLite migration against a real in-memory SQLite engine."""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = [
    ROOT / "backend/migrations/0001_initial.sql",
    ROOT / "backend/migrations/0002_admin_dictionary.sql",
    ROOT / "backend/migrations/0003_auth_rate_limits.sql",
]


class MigrationExecutionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = sqlite3.connect(":memory:")
        cls.db.execute("PRAGMA foreign_keys = ON")
        for migration in MIGRATIONS:
            cls.db.executescript(migration.read_text(encoding="utf-8"))

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_all_expected_tables_exist(self):
        names = {row[0] for row in self.db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}
        expected = {
            "users", "learner_profiles", "otp_challenges", "sessions",
            "learner_saved_words", "lesson_progress", "quiz_attempts",
            "admin_audit_events", "admin_credentials", "admin_auth_policies",
            "admin_mfa_factors", "admin_recovery_codes", "auth_rate_limits", "dictionary_entries",
            "dictionary_senses", "dictionary_examples", "dictionary_content_events",
        }
        self.assertTrue(expected.issubset(names), expected - names)

    def test_learner_defaults_and_profile_foreign_key(self):
        self.db.execute(
            "INSERT INTO users (id, email_normalized) VALUES (?, ?)",
            ("learner-1", "learner@example.test"),
        )
        self.db.execute(
            "INSERT INTO learner_profiles (user_id, display_name) VALUES (?, ?)",
            ("learner-1", "Learner"),
        )
        profile = self.db.execute(
            "SELECT level, teaching_language, daily_target_minutes FROM learner_profiles WHERE user_id=?",
            ("learner-1",),
        ).fetchone()
        self.assertEqual(profile, ("pre-a1", "si", 15))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO learner_profiles (user_id) VALUES (?)", ("missing-user",)
            )

    def test_role_and_status_constraints_are_enforced(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO users (id, email_normalized, role) VALUES (?, ?, ?)",
                ("bad-role", "bad-role@example.test", "superadmin"),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO users (id, email_normalized, status) VALUES (?, ?, ?)",
                ("bad-status", "bad-status@example.test", "enabled"),
            )

    def test_dictionary_relations_and_moderation_constraints(self):
        self.db.execute(
            "INSERT INTO dictionary_entries (id, headword, normalized_headword, language, status) VALUES (?, ?, ?, ?, ?)",
            ("word-1", "hello", "hello", "en", "draft"),
        )
        self.db.execute(
            "INSERT INTO dictionary_senses (id, entry_id, meaning_text, target_language) VALUES (?, ?, ?, ?)",
            ("sense-1", "word-1", "ආයුබෝවන්", "si"),
        )
        self.db.execute(
            "INSERT INTO dictionary_examples (id, sense_id, sentence_text, translation_text) VALUES (?, ?, ?, ?)",
            ("example-1", "sense-1", "Hello.", "ආයුබෝවන්."),
        )
        count = self.db.execute(
            "SELECT COUNT(*) FROM dictionary_examples WHERE sense_id='sense-1'"
        ).fetchone()[0]
        self.assertEqual(count, 1)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO dictionary_entries (id, headword, normalized_headword, language, status) VALUES (?, ?, ?, ?, ?)",
                ("bad-word", "bad", "bad", "en", "live"),
            )

    def test_foreign_key_cascade_removes_learner_profile(self):
        self.db.execute(
            "INSERT INTO users (id, email_normalized) VALUES (?, ?)",
            ("cascade-user", "cascade@example.test"),
        )
        self.db.execute(
            "INSERT INTO learner_profiles (user_id) VALUES (?)", ("cascade-user",)
        )
        self.db.execute("DELETE FROM users WHERE id='cascade-user'")
        remaining = self.db.execute(
            "SELECT COUNT(*) FROM learner_profiles WHERE user_id='cascade-user'"
        ).fetchone()[0]
        self.assertEqual(remaining, 0)

    def test_email_uniqueness_and_otp_purpose_constraints(self):
        self.db.execute(
            "INSERT INTO users (id, email_normalized) VALUES (?, ?)",
            ("unique-user", "unique@example.test"),
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO users (id, email_normalized) VALUES (?, ?)",
                ("duplicate-user", "unique@example.test"),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO otp_challenges (id, email_normalized, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)",
                ("bad-otp", "unique@example.test", "password_reset", "hash", "2030-01-01T00:00:00Z"),
            )

    def test_auth_rate_limit_bucket_constraints(self):
        self.db.execute(
            "INSERT INTO auth_rate_limits (bucket_key_hash, purpose, window_started_at, request_count) VALUES (?, ?, ?, ?)",
            ("keyed-hash", "learner_otp_request", "2030-01-01T00:00:00Z", 1),
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO auth_rate_limits (bucket_key_hash, purpose, window_started_at) VALUES (?, ?, ?)",
                ("bad-purpose", "email", "2030-01-01T00:00:00Z"),
            )
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO auth_rate_limits (bucket_key_hash, purpose, window_started_at, request_count) VALUES (?, ?, ?, ?)",
                ("negative-count", "admin_auth", "2030-01-01T00:00:00Z", -1),
            )

    def test_foreign_key_pragma_is_enabled(self):
        self.assertEqual(self.db.execute("PRAGMA foreign_keys").fetchone()[0], 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
