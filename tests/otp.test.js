const test = require("node:test");
const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const { normalizeEmail, isValidOtp, createOtp, hashOtp, isValidOtpDigest } = require("../backend/src/auth/otp.js");

test("email normalization trims whitespace and lowercases", () => {
  assert.equal(normalizeEmail("  Learner@Example.COM "), "learner@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail("x".repeat(250) + "@a.com"), null);
});

test("OTP validator accepts exactly six decimal digits", () => {
  assert.equal(isValidOtp("004219"), true);
  for (const value of ["4219", "1234567", "12a456", 123456]) assert.equal(isValidOtp(value), false);
});

test("OTP generator returns a six-digit string including leading zeroes", () => {
  for (let i = 0; i < 100; i++) assert.match(createOtp(webcrypto), /^[0-9]{6}$/);
});

test("OTP HMAC is deterministic, email-bound, and code-bound", async () => {
  const secret = "test-only-pepper-value-with-at-least-32-characters";
  const first = await hashOtp("Learner@example.com", "004219", secret, webcrypto);
  const same = await hashOtp("learner@example.com", "004219", secret, webcrypto);
  const otherCode = await hashOtp("learner@example.com", "004220", secret, webcrypto);
  const otherEmail = await hashOtp("other@example.com", "004219", secret, webcrypto);
  assert.equal(first, same);
  assert.notEqual(first, otherCode);
  assert.notEqual(first, otherEmail);
  assert.equal(isValidOtpDigest(first), true);
});

test("OTP hashing refuses invalid inputs and short secrets", async () => {
  await assert.rejects(hashOtp("bad", "123456", "x".repeat(40), webcrypto), /invalid_otp_input/);
  await assert.rejects(hashOtp("valid@example.com", "123456", "short", webcrypto), /otp_pepper_not_configured/);
});
