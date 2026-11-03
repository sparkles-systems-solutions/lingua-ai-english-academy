const test = require("node:test");
const assert = require("node:assert/strict");
const { handleRequest } = require("../backend/src/index.js");

test("API health endpoint returns a minimal service status", async () => {
  const response = await handleRequest(new Request("https://example.test/api/v1/health"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "lingua-academy-api",
    version: "1"
  });
});

test("database health endpoint reports missing D1 binding safely", async () => {
  const response = await handleRequest(new Request("https://example.test/api/v1/health/database"));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: "unavailable",
    database: "not_configured"
  });
});

test("database health endpoint queries D1 and returns application table count", async () => {
  let query = "";
  const env = {
    DB: {
      prepare(sql) {
        query = sql;
        return { first: async () => ({ table_count: 17 }) };
      }
    }
  };
  const response = await handleRequest(
    new Request("https://example.test/api/v1/health/database"),
    env
  );
  assert.equal(response.status, 200);
  assert.match(query, /sqlite_master/);
  assert.deepEqual(await response.json(), {
    status: "ok",
    database: "connected",
    application_tables: 17
  });
});

test("database health endpoint hides database errors", async () => {
  const env = { DB: { prepare: () => ({ first: async () => { throw new Error("private detail"); } }) } };
  const response = await handleRequest(
    new Request("https://example.test/api/v1/health/database"),
    env
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: "unavailable",
    database: "query_failed"
  });
});

test("unknown API routes do not expose implementation details", async () => {
  const response = await handleRequest(new Request("https://example.test/api/v1/private"));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
});

test("CORS rejects origins that are not explicitly allowlisted", async () => {
  const response = await handleRequest(
    new Request("https://example.test/api/v1/health", { headers: { Origin: "https://attacker.test" } }),
    { ALLOWED_ORIGINS: "https://academy.example" }
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("CORS only reflects an explicitly allowlisted origin", async () => {
  const response = await handleRequest(
    new Request("https://example.test/api/v1/health", { headers: { Origin: "https://academy.example" } }),
    { ALLOWED_ORIGINS: "https://academy.example" }
  );
  assert.equal(response.headers.get("access-control-allow-origin"), "https://academy.example");
});


test("Pages origin is allowed for browser API requests", async () => {
  const response = await handleRequest(
    new Request("https://example.test/api/v1/health", {
      headers: { Origin: "https://sparkles-systems-solutions.github.io" }
    }),
    { ALLOWED_ORIGINS: "https://sparkles-systems-solutions.github.io" }
  );
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://sparkles-systems-solutions.github.io"
  );
});

test("CORS preflight accepts only the configured Pages origin", async () => {
  const response = await handleRequest(
    new Request("https://example.test/api/v1/health", {
      method: "OPTIONS",
      headers: {
        Origin: "https://sparkles-systems-solutions.github.io",
        "Access-Control-Request-Method": "GET"
      }
    }),
    { ALLOWED_ORIGINS: "https://sparkles-systems-solutions.github.io" }
  );
  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://sparkles-systems-solutions.github.io"
  );
  assert.match(response.headers.get("access-control-allow-methods"), /GET/);
});
