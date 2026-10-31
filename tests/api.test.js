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
