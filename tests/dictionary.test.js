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

test("dictionary displays only reviewed, word-specific bilingual examples", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /Try saying it in English \/ ඉංග්‍රීසියෙන් කියන්න උත්සාහ කරන්න/);
  assert.match(html, /return Array\.isArray\(entry\.examples\)\?entry\.examples:\[\]/);
  assert.doesNotMatch(html, /Use this word – 5 practice sentences/);
  assert.ok(entries.find((entry) => entry.id === "cat").examples.some((x) => x.en === "I see a cat." && x.si === "මට පූසෙක් පේනවා."));
  assert.ok(entries.find((entry) => entry.id === "water").examples.some((x) => x.en === "I drink water." && x.si === "මම වතුර බොනවා."));
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

test("AI-reviewed Sinhala corrections remain in the dictionary", () => {
  const byId = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  assert.ok(byId.no.examples.some((x) => x.en === "No, thank you." && x.si === "නැහැ, ස්තුතියි."));
  assert.ok(byId.dog.si.includes("බල්ලෙක්"));
  assert.ok(!byId.dog.si.includes("බල්ලි"));
  assert.ok(byId["good-morning"].si.includes("සුබ උදෑසනක්"));
  assert.ok(byId["thank-you"].si.includes("ස්තුතියි"));
  assert.ok(byId.cousin.si.includes("ඥාති සහෝදරයා / සහෝදරිය"));
  assert.ok(byId.thirsty.si.includes("පිපාසය ඇති"));
  assert.ok(byId.sunny.examples[0].si.includes("අව්ව පායනවා"));
});

test("AI QA corrections keep Sinhala and English examples aligned", () => {
  const byId = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  assert.ok(byId.food.examples.some((x) => x.en === "The food is good." && x.si === "කෑම හොඳයි."));
  assert.ok(byId.love.examples.some((x) => x.en === "I love my mother." && x.si === "මම මගේ අම්මාට ආදරෙයි."));
  assert.ok(byId.slow.examples.some((x) => x.en === "The bus is slow." && x.si === "බස් රථය මන්දගාමීයි."));
  assert.ok(byId.stand.examples.some((x) => x.en === "Please stand here." && x.si === "කරුණාකර මෙතැන හිටගන්න."));
  assert.ok(byId.morning.examples.some((x) => x.si === "සුබ උදෑසනක්."));
  assert.ok(byId.night.examples.some((x) => x.si === "සුබ රාත්‍රියක්."));
  assert.ok(byId.day.examples.some((x) => x.si === "සුබ දවසක් වේවා."));
  assert.ok(byId.soap.examples.some((x) => x.si === "සබන් ගා ඔබේ අත් සෝදන්න."));
  assert.ok(byId.potato.examples.some((x) => x.si === "අර්තාපල් ගෙඩිය බෑගයේ තියෙනවා."));
  assert.ok(byId.onion.examples.some((x) => x.si === "ලූනු ගෙඩිය පරිස්සමින් කපන්න."));
});

test("dictionary practice uses Sinhala prompts with revealable English and audio actions", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /Try saying it in English \/ ඉංග්‍රීසියෙන් කියන්න උත්සාහ කරන්න/);
  assert.match(html, /data-example-reveal/);
  assert.match(html, /data-example-speak/);
  assert.match(html, /function wireExamplePractice/);
  assert.match(html, /if\(example\)speak\(example\.en\)/);
  assert.match(html, /data-example-answer/);
});
