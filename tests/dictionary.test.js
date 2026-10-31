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
  assert.ok(entries.length >= 171);
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

test("dictionary page reacts while the learner types and offers suggestions", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /dictQuery"\)\.addEventListener\("input"/);
  assert.match(html, /renderDictSuggestions/);
  assert.match(html, /data-dict-suggest/);
});

test("dictionary results include five bilingual word-practice prompts", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /buildWordUsage\(entry\)/);
  assert.match(html, /Use this word – 5 practice sentences/);
  assert.match(html, /I use \+word\+ every day/);
  assert.match(html, /Where is the \+word\+/);
});

test("lesson exam has five questions, an 80 percent pass mark and retry question variation", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /startLessonExam\(i\)/);
  assert.match(html, /exam\.position<4/);
  assert.match(html, /exam\.score>=4/);
  assert.match(html, /signature!==previous/);
  assert.match(html, /Retry with new questions/);
});

test("common animal headwords dog and cat are searchable", () => {
  assert.ok(search("dog", "en-si").some((entry) => entry.id === "dog"));
  assert.ok(search("cat", "en-si").some((entry) => entry.id === "cat"));
  assert.ok(search("බල්ලා", "si-en").some((entry) => entry.id === "dog"));
});

test("expanded beginner vocabulary includes common everyday words", () => {
  for (const word of ["dog", "cat", "family", "mother", "house", "school", "food", "go", "eat", "speak", "happy", "difficult"]) {
    assert.ok(entries.some((entry) => entry.id === word), "missing headword: " + word);
  }
});

test("expanded entries include category metadata for grouped learning", () => {
  const categorized = entries.filter((entry) => entry.category);
  assert.ok(categorized.length >= 70);
  for (const entry of categorized) {
    assert.ok(entry.si.length > 0);
    assert.ok(entry.examples.length > 0);
  }
});

test("latest categorized vocabulary batch is searchable in both languages", () => {
  for (const word of ["grandfather", "grandmother", "husband", "vegetable", "price", "train", "station", "early", "wait", "tired", "rainy", "sunny"]) {
    assert.ok(entries.some((entry) => entry.id === word), "missing headword: " + word);
  }
  assert.ok(search("සීයා", "si-en").some((entry) => entry.id === "grandfather"));
  assert.ok(search("දුම්රිය", "si-en").some((entry) => entry.id === "train"));
});
