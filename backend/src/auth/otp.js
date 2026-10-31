/**
 * Provider-neutral OTP primitives for Cloudflare Workers.
 * This module does not send email, persist challenges, or create sessions.
 * Callers must enforce rate limits and persist only the HMAC digest.
 */

export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function isValidOtp(value) {
  return typeof value === "string" && /^[0-9]{6}$/.test(value);
}

export function createOtp(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) throw new Error("secure_random_unavailable");
  // Rejection sampling avoids modulo bias for a six-digit code.
  const limit = Math.floor(0x100000000 / 1000000) * 1000000;
  const buffer = new Uint32Array(1);
  let value;
  do {
    cryptoApi.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return String(value % 1000000).padStart(6, "0");
}

export async function hashOtp(email, code, secret, cryptoApi = globalThis.crypto) {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidOtp(code)) throw new Error("invalid_otp_input");
  if (typeof secret !== "string" || secret.length < 32) throw new Error("otp_pepper_not_configured");
  if (!cryptoApi?.subtle) throw new Error("secure_hash_unavailable");
  const key = await cryptoApi.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await cryptoApi.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(normalized + ":" + code)
  );
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function isValidOtpDigest(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
