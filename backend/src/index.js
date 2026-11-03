const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY"
};
const OTP_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 30;
const MAX_OTP_ATTEMPTS = 5;

function withCors(response, cors) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}
function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowlist = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  return allowlist.includes(origin) ? origin : null;
}
function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function validOtp(value) { return typeof value === "string" && /^[0-9]{6}$/.test(value); }
function randomId() { return crypto.randomUUID(); }
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function hmac(value, secret) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("server_secret_not_configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result), b => b.toString(16).padStart(2, "0")).join("");
}
function createOtp() {
  const limit = Math.floor(0x100000000 / 1000000) * 1000000;
  const values = new Uint32Array(1);
  do { crypto.getRandomValues(values); } while (values[0] >= limit);
  return String(values[0] % 1000000).padStart(6, "0");
}
async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return null;
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 4096) return null;
  try { return await request.json(); } catch { return null; }
}
async function sendOtpEmail(env, email, code) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("email_provider_not_configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: "Your Lingua AI sign-in code",
      text: "Your Lingua AI English Academy verification code is " + code + ". It expires in 10 minutes. If you did not request this code, you can ignore this email.",
      html: "<p>Your Lingua AI English Academy verification code is:</p><p style=\"font-size:28px;font-weight:700;letter-spacing:6px\">" + code + "</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>"
    })
  });
  if (!response.ok) throw new Error("email_delivery_failed");
}
async function consumeRateLimit(env, purpose, identity, limit, windowSeconds) {
  const bucket = await hmac(purpose + ":" + identity, env.OTP_PEPPER);
  await env.DB.prepare(`
    INSERT INTO auth_rate_limits (bucket_key_hash, purpose, window_started_at, request_count, updated_at)
    VALUES (?, ?, datetime('now'), 1, datetime('now'))
    ON CONFLICT(bucket_key_hash) DO UPDATE SET
      request_count = CASE WHEN datetime(auth_rate_limits.window_started_at, '+' || ? || ' seconds') <= datetime('now') THEN 1 ELSE auth_rate_limits.request_count + 1 END,
      window_started_at = CASE WHEN datetime(auth_rate_limits.window_started_at, '+' || ? || ' seconds') <= datetime('now') THEN datetime('now') ELSE auth_rate_limits.window_started_at END,
      updated_at = datetime('now')
  `).bind(bucket, purpose, windowSeconds, windowSeconds).run();
  const row = await env.DB.prepare("SELECT request_count FROM auth_rate_limits WHERE bucket_key_hash = ?").bind(bucket).first();
  return Number(row?.request_count || 0) <= limit;
}
async function requestLearnerOtp(request, env) {
  if (!env.DB || !env.OTP_PEPPER) return json({ error: "service_unavailable" }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) return json({ error: "invalid_request", message: "Enter a valid email address." }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowedEmail = await consumeRateLimit(env, "learner_otp_request", "email:" + email, 5, 900);
  const allowedIp = await consumeRateLimit(env, "learner_otp_request", "ip:" + ip, 20, 900);
  const recent = await env.DB.prepare("SELECT id FROM otp_challenges WHERE email_normalized = ? AND purpose = 'learner_login' AND created_at > datetime('now', '-60 seconds') AND consumed_at IS NULL LIMIT 1").bind(email).first();
  // Always return the same response for valid addresses to reduce account enumeration.
  if (!allowedEmail || !allowedIp || recent) return json({ status: "accepted", message: "If the address can receive a code, an email will arrive shortly." }, 202);
  const code = createOtp();
  const id = randomId();
  const digest = await hmac(email + ":" + code, env.OTP_PEPPER);
  await env.DB.prepare("INSERT INTO otp_challenges (id, email_normalized, purpose, code_hash, expires_at) VALUES (?, ?, 'learner_login', ?, datetime('now', '+10 minutes'))").bind(id, email, digest).run();
  try {
    await sendOtpEmail(env, email, code);
  } catch {
    await env.DB.prepare("DELETE FROM otp_challenges WHERE id = ? AND consumed_at IS NULL").bind(id).run();
    return json({ error: "email_delivery_unavailable", message: "Email delivery is temporarily unavailable. Please try again later." }, 503);
  }
  return json({ status: "accepted", message: "If the address can receive a code, an email will arrive shortly." }, 202);
}
async function verifyLearnerOtp(request, env) {
  if (!env.DB || !env.OTP_PEPPER || !env.SESSION_PEPPER) return json({ error: "service_unavailable" }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const code = body?.code;
  if (!email || !validOtp(code)) return json({ error: "invalid_code", message: "The code is invalid or expired." }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowedEmail = await consumeRateLimit(env, "learner_otp_verify", "email:" + email, 10, 900);
  const allowedIp = await consumeRateLimit(env, "learner_otp_verify", "ip:" + ip, 30, 900);
  if (!allowedEmail || !allowedIp) return json({ error: "rate_limited" }, 429);
  const challenge = await env.DB.prepare("SELECT id, code_hash, attempt_count FROM otp_challenges WHERE email_normalized = ? AND purpose = 'learner_login' AND consumed_at IS NULL AND datetime(expires_at) > datetime('now') ORDER BY created_at DESC LIMIT 1").bind(email).first();
  if (!challenge || Number(challenge.attempt_count) >= MAX_OTP_ATTEMPTS) return json({ error: "invalid_code", message: "The code is invalid or expired." }, 400);
  const digest = await hmac(email + ":" + code, env.OTP_PEPPER);
  if (digest !== challenge.code_hash) {
    await env.DB.prepare("UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = ? AND consumed_at IS NULL").bind(challenge.id).run();
    return json({ error: "invalid_code", message: "The code is invalid or expired." }, 400);
  }
  const userId = randomId();
  const sessionId = randomId();
  const token = randomToken();
  const tokenHash = await hmac(token, env.SESSION_PEPPER);
  const consumed = await env.DB.prepare("UPDATE otp_challenges SET consumed_at = datetime('now') WHERE id = ? AND consumed_at IS NULL AND attempt_count < ? AND datetime(expires_at) > datetime('now')").bind(challenge.id, MAX_OTP_ATTEMPTS).run();
  if (Number(consumed?.meta?.changes ?? 0) !== 1) return json({ error: "invalid_code", message: "The code is invalid or expired." }, 400);
  await env.DB.prepare("INSERT INTO users (id, email_normalized, email_verified_at, role, status) VALUES (?, ?, datetime('now'), 'learner', 'active') ON CONFLICT(email_normalized) DO UPDATE SET email_verified_at = COALESCE(users.email_verified_at, datetime('now')), updated_at = datetime('now')").bind(userId, email).run();
  const user = await env.DB.prepare("SELECT id, email_normalized, role, status FROM users WHERE email_normalized = ?").bind(email).first();
  if (!user || user.role !== "learner" || user.status !== "active") return json({ error: "account_unavailable" }, 403);
  await env.DB.prepare("INSERT INTO learner_profiles (user_id, level, teaching_language, daily_target_minutes) VALUES (?, 'pre-a1', 'si', 15) ON CONFLICT(user_id) DO NOTHING").bind(user.id).run();
  await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, auth_method, expires_at) VALUES (?, ?, ?, 'email_otp', datetime('now', '+30 days'))").bind(sessionId, user.id, tokenHash).run();
  return json({ status: "authenticated", token, expires_in: SESSION_TTL_DAYS * 86400, user: { id: user.id, email: user.email_normalized, role: user.role } });
}
async function authenticate(request, env) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/.exec(header);
  if (!match || !env.SESSION_PEPPER) return null;
  const tokenHash = await hmac(match[1], env.SESSION_PEPPER);
  return env.DB.prepare("SELECT u.id, u.email_normalized, u.role, u.status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.revoked_at IS NULL AND datetime(s.expires_at) > datetime('now') LIMIT 1").bind(tokenHash).first();
}
async function learnerMe(request, env) {
  const user = await authenticate(request, env);
  if (!user || user.status !== "active" || user.role !== "learner") return json({ error: "unauthorized" }, 401);
  const profile = await env.DB.prepare("SELECT display_name, level, teaching_language, daily_target_minutes, preferences_json FROM learner_profiles WHERE user_id = ?").bind(user.id).first();
  return json({ user: { id: user.id, email: user.email_normalized }, profile: profile || { display_name: null, level: "pre-a1", teaching_language: "si", daily_target_minutes: 15, preferences_json: "{}" } });
}
async function updateProfile(request, env) {
  const user = await authenticate(request, env);
  if (!user || user.status !== "active" || user.role !== "learner") return json({ error: "unauthorized" }, 401);
  const body = await readJson(request);
  if (!body || (body.display_name !== undefined && (typeof body.display_name !== "string" || body.display_name.length > 80)) ||
      (body.daily_target_minutes !== undefined && (!Number.isInteger(body.daily_target_minutes) || body.daily_target_minutes < 5 || body.daily_target_minutes > 120)) ||
      (body.teaching_language !== undefined && body.teaching_language !== "si")) return json({ error: "invalid_request" }, 400);
  await env.DB.prepare("UPDATE learner_profiles SET display_name = COALESCE(?, display_name), daily_target_minutes = COALESCE(?, daily_target_minutes), teaching_language = COALESCE(?, teaching_language) WHERE user_id = ?")
    .bind(body.display_name ?? null, body.daily_target_minutes ?? null, body.teaching_language ?? null, user.id).run();
  return learnerMe(request, env);
}
async function syncProgress(request, env) {
  const user = await authenticate(request, env);
  if (!user || user.status !== "active" || user.role !== "learner") return json({ error: "unauthorized" }, 401);
  const body = await readJson(request);
  if (!body || !Array.isArray(body.lessons) || body.lessons.length > 100 || !Array.isArray(body.saved_words) || body.saved_words.length > 500) return json({ error: "invalid_request" }, 400);
  const statements = [];
  for (const item of body.lessons) {
    if (!item || typeof item.lesson_id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(item.lesson_id) ||
        !["in_progress", "completed"].includes(item.status) ||
        (item.best_score !== null && item.best_score !== undefined && (!Number.isInteger(item.best_score) || item.best_score < 0 || item.best_score > 100))) return json({ error: "invalid_lesson_progress" }, 400);
    statements.push(env.DB.prepare("INSERT INTO lesson_progress (user_id, lesson_id, status, best_score, updated_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id, lesson_id) DO UPDATE SET status = CASE WHEN excluded.status = 'completed' THEN 'completed' ELSE lesson_progress.status END, best_score = CASE WHEN excluded.best_score IS NULL THEN lesson_progress.best_score WHEN lesson_progress.best_score IS NULL OR excluded.best_score > lesson_progress.best_score THEN excluded.best_score ELSE lesson_progress.best_score END, updated_at = datetime('now')").bind(user.id, item.lesson_id, item.status, item.best_score ?? null));
  }
  for (const id of body.saved_words) {
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return json({ error: "invalid_saved_word" }, 400);
    statements.push(env.DB.prepare("INSERT INTO learner_saved_words (user_id, dictionary_entry_id) VALUES (?, ?) ON CONFLICT(user_id, dictionary_entry_id) DO NOTHING").bind(user.id, id));
  }
  if (statements.length) await env.DB.batch(statements);
  const lessons = await env.DB.prepare("SELECT lesson_id, status, best_score, updated_at FROM lesson_progress WHERE user_id = ? ORDER BY updated_at DESC").bind(user.id).all();
  const saved = await env.DB.prepare("SELECT dictionary_entry_id, saved_at FROM learner_saved_words WHERE user_id = ? ORDER BY saved_at DESC").bind(user.id).all();
  return json({ synced: true, lessons: lessons.results || [], saved_words: saved.results || [] });
}
async function logout(request, env) {
  const user = await authenticate(request, env);
  if (!user) return json({ error: "unauthorized" }, 401);
  const token = (request.headers.get("Authorization") || "").slice(7);
  const tokenHash = await hmac(token, env.SESSION_PEPPER);
  await env.DB.prepare("UPDATE sessions SET revoked_at = datetime('now') WHERE token_hash = ? AND revoked_at IS NULL").bind(tokenHash).run();
  return json({ status: "signed_out" });
}

function b64ToBytes(value) {
  const raw = atob(value);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function bytesToB64(value) {
  let raw = "";
  for (const b of value) raw += String.fromCharCode(b);
  return btoa(raw);
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyPassword(password, encoded) {
  if (typeof password !== "string" || password.length < 1 || password.length > 256 || typeof encoded !== "string") return false;
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "PBKDF2-SHA256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 210000 || iterations > 1000000) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64ToBytes(parts[2]), iterations }, key, 256);
    return safeEqual(bytesToB64(new Uint8Array(bits)), parts[3]);
  } catch { return false; }
}
function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const n = alphabet.indexOf(char);
    if (n < 0) throw new Error("invalid_totp_secret");
    bits += n.toString(2).padStart(5, "0");
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(out);
}
async function decryptTotpSecret(ciphertext, env) {
  if (typeof env.TOTP_ENCRYPTION_KEY !== "string") throw new Error("totp_key_missing");
  const keyBytes = b64ToBytes(env.TOTP_ENCRYPTION_KEY);
  if (keyBytes.length !== 32) throw new Error("totp_key_invalid");
  const [ivText, dataText] = String(ciphertext || "").split(".");
  if (!ivText || !dataText) throw new Error("totp_ciphertext_invalid");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(ivText) }, key, b64ToBytes(dataText));
  return new TextDecoder().decode(plain);
}
async function totpAt(secret, counter) {
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new Uint8Array(8);
  let value = BigInt(counter);
  for (let i = 7; i >= 0; i--) { msg[i] = Number(value & 255n); value >>= 8n; }
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 15;
  const binary = ((mac[offset] & 127) << 24) | ((mac[offset + 1] & 255) << 16) | ((mac[offset + 2] & 255) << 8) | (mac[offset + 3] & 255);
  return String(binary % 1000000).padStart(6, "0");
}
async function verifyTotp(secret, code) {
  if (!validOtp(code)) return false;
  const step = Math.floor(Date.now() / 30000);
  for (const drift of [-1, 0, 1]) if (safeEqual(await totpAt(secret, step + drift), code)) return true;
  return false;
}
async function createAdminSession(user, request, env, method) {
  const token = randomToken();
  const tokenHash = await hmac(token, env.SESSION_PEPPER);
  await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, auth_method, mfa_verified_at, expires_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now', '+30 days'))")
    .bind(randomId(), user.id, tokenHash, method).run();
  await env.DB.prepare("INSERT INTO admin_audit_events (id, actor_user_id, action, safe_metadata_json) VALUES (?, ?, ?, ?)")
    .bind(randomId(), user.id, "admin_login", JSON.stringify({ method, ip_present: Boolean(request.headers.get("CF-Connecting-IP")) })).run();
  return json({ status: "authenticated", token, expires_in: SESSION_TTL_DAYS * 86400, user: { id: user.id, email: user.email_normalized, role: "admin" } });
}
async function adminPasswordTotp(request, env) {
  if (!env.DB || !env.OTP_PEPPER || !env.SESSION_PEPPER || !env.TOTP_ENCRYPTION_KEY) return json({ error: "service_unavailable" }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email || typeof body?.password !== "string" || !validOtp(body?.totp)) return json({ error: "invalid_credentials" }, 401);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!await consumeRateLimit(env, "admin_auth", "password:" + email, 8, 900) ||
      !await consumeRateLimit(env, "admin_auth", "ip:" + ip, 20, 900)) return json({ error: "rate_limited" }, 429);
  const user = await env.DB.prepare("SELECT id, email_normalized, role, status FROM users WHERE email_normalized = ?").bind(email).first();
  if (!user || user.role !== "admin" || user.status !== "active") return json({ error: "invalid_credentials" }, 401);
  const policy = await env.DB.prepare("SELECT allowed_methods_json, require_totp FROM admin_auth_policies WHERE user_id = ?").bind(user.id).first();
  const credential = await env.DB.prepare("SELECT password_hash FROM admin_credentials WHERE user_id = ?").bind(user.id).first();
  const factor = await env.DB.prepare("SELECT secret_ciphertext FROM admin_mfa_factors WHERE user_id = ? AND factor_type = 'totp' AND verified_at IS NOT NULL AND disabled_at IS NULL ORDER BY enrolled_at DESC LIMIT 1").bind(user.id).first();
  if (!policy || !credential || !factor) return json({ error: "admin_auth_not_configured" }, 503);
  let methods = [];
  try { methods = JSON.parse(policy.allowed_methods_json); } catch {}
  if (!methods.includes("password_totp") || !await verifyPassword(body.password, credential.password_hash)) return json({ error: "invalid_credentials" }, 401);
  const secret = await decryptTotpSecret(factor.secret_ciphertext, env);
  if (Number(policy.require_totp) === 1 && !await verifyTotp(secret, body.totp)) return json({ error: "invalid_credentials" }, 401);
  return createAdminSession(user, request, env, "password_totp");
}
async function requestAdminOtp(request, env) {
  if (!env.DB || !env.OTP_PEPPER) return json({ error: "service_unavailable" }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) return json({ error: "invalid_request" }, 400);
  const user = await env.DB.prepare("SELECT id, role, status FROM users WHERE email_normalized = ?").bind(email).first();
  if (!user || user.role !== "admin" || user.status !== "active") return json({ status: "accepted" }, 202);
  const policy = await env.DB.prepare("SELECT allowed_methods_json FROM admin_auth_policies WHERE user_id = ?").bind(user.id).first();
  let methods = [];
  try { methods = JSON.parse(policy?.allowed_methods_json || "[]"); } catch {}
  if (!methods.includes("email_otp")) return json({ status: "accepted" }, 202);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!await consumeRateLimit(env, "admin_auth", "otp:" + email, 5, 900) ||
      !await consumeRateLimit(env, "admin_auth", "ip:" + ip, 20, 900)) return json({ status: "accepted" }, 202);
  const recent = await env.DB.prepare("SELECT id FROM otp_challenges WHERE email_normalized = ? AND purpose = 'admin_login' AND created_at > datetime('now', '-60 seconds') AND consumed_at IS NULL LIMIT 1").bind(email).first();
  if (recent) return json({ status: "accepted" }, 202);
  const code = createOtp();
  const id = randomId();
  const digest = await hmac(email + ":" + code, env.OTP_PEPPER);
  await env.DB.prepare("INSERT INTO otp_challenges (id, email_normalized, purpose, code_hash, expires_at) VALUES (?, ?, 'admin_login', ?, datetime('now', '+10 minutes'))").bind(id, email, digest).run();
  try { await sendOtpEmail(env, email, code); }
  catch {
    await env.DB.prepare("DELETE FROM otp_challenges WHERE id = ? AND consumed_at IS NULL").bind(id).run();
    return json({ error: "email_delivery_unavailable" }, 503);
  }
  return json({ status: "accepted" }, 202);
}
async function verifyAdminOtp(request, env) {
  if (!env.DB || !env.OTP_PEPPER || !env.SESSION_PEPPER) return json({ error: "service_unavailable" }, 503);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email || !validOtp(body?.code)) return json({ error: "invalid_code" }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!await consumeRateLimit(env, "admin_auth", "verify:" + email, 10, 900) ||
      !await consumeRateLimit(env, "admin_auth", "ip:" + ip, 20, 900)) return json({ error: "rate_limited" }, 429);
  const challenge = await env.DB.prepare("SELECT id, code_hash, attempt_count FROM otp_challenges WHERE email_normalized = ? AND purpose = 'admin_login' AND consumed_at IS NULL AND datetime(expires_at) > datetime('now') ORDER BY created_at DESC LIMIT 1").bind(email).first();
  if (!challenge || Number(challenge.attempt_count) >= MAX_OTP_ATTEMPTS) return json({ error: "invalid_code" }, 400);
  if (!safeEqual(await hmac(email + ":" + body.code, env.OTP_PEPPER), challenge.code_hash)) {
    await env.DB.prepare("UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = ? AND consumed_at IS NULL").bind(challenge.id).run();
    return json({ error: "invalid_code" }, 400);
  }
  const user = await env.DB.prepare("SELECT id, email_normalized, role, status FROM users WHERE email_normalized = ?").bind(email).first();
  if (!user || user.role !== "admin" || user.status !== "active") return json({ error: "invalid_code" }, 400);
  const policy = await env.DB.prepare("SELECT allowed_methods_json FROM admin_auth_policies WHERE user_id = ?").bind(user.id).first();
  let methods = [];
  try { methods = JSON.parse(policy?.allowed_methods_json || "[]"); } catch {}
  if (!methods.includes("email_otp")) return json({ error: "invalid_code" }, 400);
  const consumed = await env.DB.prepare("UPDATE otp_challenges SET consumed_at = datetime('now') WHERE id = ? AND consumed_at IS NULL AND attempt_count < ? AND datetime(expires_at) > datetime('now')").bind(challenge.id, MAX_OTP_ATTEMPTS).run();
  if (Number(consumed?.meta?.changes ?? 0) !== 1) return json({ error: "invalid_code" }, 400);
  return createAdminSession(user, request, env, "email_otp");
}
async function adminMe(request, env) {
  const user = await authenticate(request, env);
  if (!user || user.role !== "admin" || user.status !== "active") return json({ error: "unauthorized" }, 401);
  return json({ user: { id: user.id, email: user.email_normalized, role: user.role } });
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  const origin = allowedOrigin(request, env);
  const cors = origin ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "vary": "Origin"
  } : {};
  if (request.method === "OPTIONS") {
    if (request.headers.has("Origin") && !origin) return json({ error: "origin_not_allowed" }, 403);
    return new Response(null, { status: 204, headers: { ...cors, ...JSON_HEADERS } });
  }
  if (url.pathname === "/api/v1/health" && request.method === "GET")
    return json({ status: "ok", service: "lingua-academy-api", version: "1" }, 200, cors);
  if (url.pathname === "/api/v1/health/database" && request.method === "GET") {
    if (!env.DB || typeof env.DB.prepare !== "function") return json({ status: "unavailable", database: "not_configured" }, 503, cors);
    try {
      const result = await env.DB.prepare("SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV'").first();
      return json({ status: "ok", database: "connected", application_tables: Number(result?.table_count ?? 0) }, 200, cors);
    } catch { return json({ status: "unavailable", database: "query_failed" }, 503, cors); }
  }

  if (url.pathname === "/api/v1/admin/auth/password-totp" && request.method === "POST") {
    try { return withCors(await adminPasswordTotp(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/admin/auth/otp/request" && request.method === "POST") {
    try { return withCors(await requestAdminOtp(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/admin/auth/otp/verify" && request.method === "POST") {
    try { return withCors(await verifyAdminOtp(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/admin/me" && request.method === "GET") {
    try { return withCors(await adminMe(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/auth/learner/otp/request" && request.method === "POST") {
    try { return withCors(await requestLearnerOtp(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/auth/learner/otp/verify" && request.method === "POST") {
    try { return withCors(await verifyLearnerOtp(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/learner/me" && request.method === "GET") {
    try { return withCors(await learnerMe(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/learner/profile" && request.method === "PUT") {
    try { return withCors(await updateProfile(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/learner/progress/sync" && request.method === "POST") {
    try { return withCors(await syncProgress(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname === "/api/v1/auth/logout" && request.method === "POST") {
    try { return withCors(await logout(request, env), cors); } catch { return json({ error: "service_unavailable" }, 503, cors); }
  }
  if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404, cors);
  return json({ error: "not_found" }, 404);
}
export default { fetch(request, env) { return handleRequest(request, env); } };
