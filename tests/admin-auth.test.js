const test = require("node:test");
const assert = require("node:assert/strict");
const { handleRequest } = require("../backend/src/index.js");

test("admin authentication routes exist and fail closed without secrets", async () => {
  const cases = [
    ["/api/v1/admin/auth/password-totp", { email: "admin@example.com", password: "example-password", totp: "123456" }],
    ["/api/v1/admin/auth/otp/request", { email: "admin@example.com" }],
    ["/api/v1/admin/auth/otp/verify", { email: "admin@example.com", code: "123456" }]
  ];
  for (const [path, body] of cases) {
    const response = await handleRequest(new Request("https://example.test" + path, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "service_unavailable");
  }
});

test("admin identity endpoint never accepts an unauthenticated request", async () => {
  const response = await handleRequest(new Request("https://example.test/api/v1/admin/me"));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("admin routes are not confused with learner routes", async () => {
  const response = await handleRequest(new Request("https://example.test/api/v1/admin/unknown"));
  assert.equal(response.status, 404);
});
