const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY"
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowlist = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  return allowlist.includes(origin) ? origin : null;
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  const origin = allowedOrigin(request, env);
  const cors = origin ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin"
  } : {};

  if (request.method === "OPTIONS") {
    if (request.headers.has("Origin") && !origin) return json({ error: "origin_not_allowed" }, 403);
    return new Response(null, { status: 204, headers: { ...cors, ...JSON_HEADERS } });
  }

  if (url.pathname === "/api/v1/health" && request.method === "GET") {
    return json({ status: "ok", service: "lingua-academy-api", version: "1" }, 200, cors);
  }

  if (url.pathname === "/api/v1/health/database" && request.method === "GET") {
    if (!env.DB || typeof env.DB.prepare !== "function") {
      return json({ status: "unavailable", database: "not_configured" }, 503, cors);
    }

    try {
      const result = await env.DB.prepare(
        "SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV'"
      ).first();
      return json({
        status: "ok",
        database: "connected",
        application_tables: Number(result?.table_count ?? 0)
      }, 200, cors);
    } catch {
      return json({ status: "unavailable", database: "query_failed" }, 503, cors);
    }
  }

  if (url.pathname.startsWith("/api/")) {
    return json({ error: "not_found" }, 404, cors);
  }

  return json({ error: "not_found" }, 404);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
