const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationDir = path.join(__dirname, "..", "backend", "migrations");
const initial = fs.readFileSync(path.join(migrationDir, "0001_initial.sql"), "utf8");
const phaseTwo = fs.readFileSync(path.join(migrationDir, "0002_admin_dictionary.sql"), "utf8");

test("initial schema keeps learner roles and progress scoped to user accounts", () => {
  assert.match(initial, /role TEXT NOT NULL DEFAULT 'learner' CHECK \(role IN \('learner', 'admin'\)\)/);
  assert.match(initial, /FOREIGN KEY|REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(initial, /CREATE TABLE lesson_progress/);
  assert.match(initial, /CREATE TABLE quiz_attempts/);
});

test("OTP and session schema stores hashes and supports expiry and revocation", () => {
  assert.match(initial, /code_hash TEXT NOT NULL/);
  assert.match(initial, /expires_at TEXT NOT NULL/);
  assert.match(initial, /consumed_at TEXT/);
  assert.match(initial, /token_hash TEXT NOT NULL UNIQUE/);
  assert.match(initial, /revoked_at TEXT/);
});

test("admin schema supports both required login methods and second-factor enforcement", () => {
  assert.match(phaseTwo, /CREATE TABLE admin_credentials/);
  assert.match(phaseTwo, /password_hash TEXT NOT NULL/);
  assert.match(phaseTwo, /allowed_methods_json TEXT NOT NULL/);
  assert.match(phaseTwo, /require_totp INTEGER NOT NULL DEFAULT 1/);
  assert.match(phaseTwo, /secret_ciphertext TEXT NOT NULL/);
  assert.match(phaseTwo, /code_hash TEXT NOT NULL/);
});

test("dictionary schema supports moderation, multiple meanings and bilingual examples", () => {
  assert.match(phaseTwo, /status TEXT NOT NULL DEFAULT 'draft'/);
  assert.match(phaseTwo, /CREATE TABLE dictionary_senses/);
  assert.match(phaseTwo, /CREATE TABLE dictionary_examples/);
  assert.match(phaseTwo, /source_attribution TEXT/);
  assert.match(phaseTwo, /CREATE TABLE dictionary_content_events/);
});
