const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sandbox = { window: {} };
const source = fs.readFileSync(path.join(__dirname, "..", "dictionary-data.js"), "utf8");
vm.runInNewContext(source, sandbox);
const entries = sandbox.window.LINGUA_DICTIONARY;

function search(query, direction = "auto") {
  const q = query.normalize("NFC").trim().toLocaleLowerCase();
  return entries.filter((entry) => {
    const en = entry.en.toLocaleLowerCase();
    const si = entry.si.join(" ").normalize("NFC").toLocaleLowerCase();
    if (direction === "en-si") return en.includes(q);
    if (direction === "si-en") return si.includes(q);
    return en.includes(q) || si.includes(q);
  });
}

test("starter dictionary exists and has unique stable IDs", () => {
  assert.ok(Array.isArray(entries));
  assert.ok(entries.length >= 40);
  const ids = entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every entry has bilingual meanings and a usable example", () => {
  for (const entry of entries) {
    assert.ok(entry.id && entry.en && entry.pos);
    assert.ok(Array.isArray(entry.si) && entry.si.length > 0);
    assert.ok(Array.isArray(entry.examples) && entry.examples.length > 0);
    for (const example of entry.examples) {
      assert.ok(example.en && example.si);
    }
  }
});

test("English-to-Sinhala search finds an English headword", () => {
  assert.ok(search("water", "en-si").some((entry) => entry.id === "water"));
});

test("Sinhala-to-English search supports Sinhala Unicode", () => {
  assert.ok(search("ආදරය", "si-en").some((entry) => entry.id === "love"));
  assert.ok(search("පොත", "si-en").some((entry) => entry.id === "book"));
});

test("automatic search accepts either language", () => {
  assert.ok(search("hello").some((entry) => entry.id === "hello"));
  assert.ok(search("වතුර").some((entry) => entry.id === "water"));
});

test("entries can contain multiple contextual meanings and examples", () => {
  const right = entries.find((entry) => entry.id === "right");
  assert.ok(right.si.length >= 2);
  assert.ok(right.examples.length >= 2);
});
