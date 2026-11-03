const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const client = fs.readFileSync(path.join(root, "auth-client.js"), "utf8");

test("learner account controls are present", () => {
  for (const id of ["accountButton", "authPanel", "authEmail", "authCode", "requestOtp", "verifyOtp"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /src="auth-client.js"/);
});

test("learner client contains sign-in and cloud progress routes", () => {
  assert.match(client, /auth\/learner\/otp\/request/);
  assert.match(client, /auth\/learner\/otp\/verify/);
  assert.match(client, /learner\/progress\/sync/);
  assert.match(client, /auth\/logout/);
});

test("cloud sync preserves remote completions and saved vocabulary", () => {
  assert.match(client, /remote\.lessons/);
  assert.match(client, /remote\.saved_words/);
  assert.match(client, /lingua-progress/);
  assert.match(client, /queueLinguaCloudSync/);
});

test("external learner client JavaScript syntax is valid", () => {
  new Function(client);
});
