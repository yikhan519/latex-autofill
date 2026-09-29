// Node smoke tests for dictionary parsing, aliases, templates, and ranking.
// Not loaded by Obsidian. Run: node test/smoke.js
const assert = require("assert");
const Module = require("module");
const path = require("path");

const mocks = {
  obsidian: {
    Plugin: class {},
    SuggestModal: class {},
    EditorSuggest: class {},
    MarkdownView: class {},
    Notice: class {},
    prepareFuzzySearch: () => () => null,
    moment: null,
  },
  "@codemirror/state": {
    StateField: { define: () => ({}) },
    StateEffect: { define: () => ({}) },
    Prec: { highest: (x) => x },
  },
  "@codemirror/view": {
    EditorView: {
      decorations: { from: () => [] },
      findFromDOM: () => null,
    },
    Decoration: {
      mark: () => ({ range: (from, to) => ({ from, to }) }),
      widget: () => ({ range: (from) => ({ from, to: from }) }),
      none: null,
      set: () => null,
    },
    WidgetType: class {},
    keymap: { of: () => ({}) },
  },
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
  return originalRequire.apply(this, arguments);
};

const api = require(path.join(__dirname, "..", "main.js"));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok  ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }
}

function make(partial) {
  return api.finalizeEntry({
    cat: "测试",
    name: "名称",
    en: "Name",
    keys: "keyword",
    tex: "\\x",
    aliases: [],
    ...partial,
  });
}

test("built-in ids are unique, including duplicate tex", () => {
  const entries = api.buildEntries();
  const ids = entries.map((e) => e.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  const shared = entries.filter((e) => e.tex === "\\mathbb{R}");
  assert.ok(shared.length >= 2);
  assert.strictEqual(new Set(shared.map((e) => e.id)).size, shared.length);
  assert.ok(shared.some((e) => e.id === "builtin:集合/实数集"));
});

test("existing queries keep their top hit when usage is empty", () => {
  const entries = api.buildEntries();
  assert.strictEqual(api.searchEntries(entries, "求和", { allowFuzzy: false })[0].name, "求和");
  assert.strictEqual(api.searchEntries(entries, "偏导数", { allowFuzzy: false })[0].name, "偏导数");
  assert.strictEqual(
    api.searchEntries(entries, "partial derivative", { allowFuzzy: false })[0].name,
    "偏导数",
  );
  const noUsage = api.searchEntries(entries, "integral", { allowFuzzy: false }).map((e) => e.id);
  const zeroUsage = api.searchEntries(entries, "integral", { allowFuzzy: false, usage: {} }).map((e) => e.id);
  assert.deepStrictEqual(noUsage, zeroUsage);
  const withoutExtra = api.searchEntries(entries, "backepsilon", { includeExtra: false, allowFuzzy: false });
  assert.ok(withoutExtra.every((e) => !e.extra));
  const withExtra = api.searchEntries(entries, "backepsilon", { includeExtra: true, allowFuzzy: false });
  assert.ok(withExtra.some((e) => e.extra));
});

test("dictionary template is comments only and documents both languages", () => {
  const built = api.rebuildFromDictionary(api.DICT_TEMPLATE);
  assert.deepStrictEqual(built.errors, []);
  assert.strictEqual(built.entries.filter((e) => e.user).length, 0);
  assert.ok(api.DICT_TEMPLATE.includes("个人词典"));
  assert.ok(api.DICT_TEMPLATE.includes("Personal dictionary"));
  assert.ok(api.DICT_TEMPLATE.includes("${1:a}"));
  assert.ok(api.DICT_TEMPLATE.includes("+求和"));
  assert.strictEqual(api.DICT_PATH, "LaTeX Autofill/dictionary.md");
});

test("parses entries, reports line numbers, and keeps going", () => {
  const text = [
    "# comment",
    "",
    "名字 ;; kw word ;; \\alpha ;; Alpha",
    "bad ;; only-two",
    "This prose is ignored.",
    "+没有这条目 ;; zz",
  ].join("\n");
  const parsed = api.parseDictionary(text);
  assert.strictEqual(parsed.entries.length, 1);
  assert.strictEqual(parsed.entries[0].name, "名字");
  assert.strictEqual(parsed.entries[0].en, "Alpha");
  assert.strictEqual(parsed.entries[0].tex, "\\alpha");
  assert.strictEqual(parsed.entries[0].user, true);
  assert.strictEqual(parsed.entries[0].cat, "自定义");
  assert.ok(parsed.errors.some((e) => e.line === 4 && e.code === "bad-entry"));
  assert.doesNotThrow(() => api.parseDictionary("\0\n;;;\n+\nnot an entry\n"));

  const built = api.rebuildFromDictionary(text);
  assert.ok(built.errors.some((e) => e.line === 6 && e.code === "alias-not-found"));
  assert.ok(built.entries.some((e) => e.name === "名字"));
  assert.ok(built.entries.some((e) => e.name === "求和"));
  const zh = api.formatDictionaryProblem({ line: 4, code: "bad-entry" }, "zh");
  const en = api.formatDictionaryProblem({ line: 6, code: "alias-not-found", target: "没有这条目" }, "en");
  assert.ok(zh.includes("第 4 行"));
  assert.ok(en.includes("Line 6"));
  assert.ok(en.includes("没有这条目"));
});

test("optional english name, five-field category, and unclosed placeholders", () => {
  const three = api.parseDictionary("名字 ;; My Op 中文 ;; \\alpha\n");
  assert.strictEqual(three.errors.length, 0);
  assert.strictEqual(three.entries[0].en, "My Op");
  const five = api.parseDictionary("运算 ;; 名字 ;; kw ;; \\alpha ;; Alpha\n");
  assert.strictEqual(five.entries[0].cat, "运算");
  assert.strictEqual(five.entries[0].name, "名字");
  const bad = api.parseDictionary("坏 ;; k ;; ${1:abc\n");
  assert.ok(bad.errors.some((e) => e.line === 1 && e.code === "bad-placeholder"));
  assert.strictEqual(bad.entries.length, 0);
  const fence = api.parseDictionary("```\n名字 ;; k ;; \\alpha\n");
  assert.ok(fence.errors.some((e) => e.code === "unclosed-fence"));
  assert.strictEqual(fence.entries.length, 0);
});

test("appends aliases to one built-in entry and refuses ambiguous tex", () => {
  const aliased = api.rebuildFromDictionary("+求和 ;; 连加符号 | running total\n");
  assert.deepStrictEqual(aliased.errors, []);
  const sum = aliased.entries.find((e) => e.name === "求和");
  assert.ok(sum.aliases.includes("连加符号"));
  assert.ok(sum.aliases.includes("running total"));
  assert.strictEqual(
    api.searchEntries(aliased.entries, "连加符号", { allowFuzzy: false })[0].name,
    "求和",
  );
  assert.strictEqual(
    api.searchEntries(aliased.entries, "running total", { allowFuzzy: false })[0].name,
    "求和",
  );
  assert.strictEqual(api.searchEntries(aliased.entries, "求和", { allowFuzzy: false })[0].name, "求和");

  const ambiguous = api.rebuildFromDictionary("+\\mathbb{R} ;; reals\n");
  assert.ok(ambiguous.errors.some((e) => e.line === 1 && e.code === "ambiguous"));
  for (const entry of ambiguous.entries.filter((e) => e.tex === "\\mathbb{R}")) {
    assert.strictEqual(entry.aliases.length, 0);
  }

  const byName = api.rebuildFromDictionary("+实数集 ;; 实数轴\n");
  assert.deepStrictEqual(byName.errors, []);
  assert.ok(byName.entries.find((e) => e.name === "实数集").aliases.includes("实数轴"));
  assert.strictEqual(byName.entries.find((e) => e.name === "黑板粗体").aliases.length, 0);
  assert.strictEqual(api.searchEntries(byName.entries, "实数轴", { allowFuzzy: false })[0].name, "实数集");

  const byId = api.rebuildFromDictionary("+builtin:集合/实数集 ;; 实数轴\n");
  assert.deepStrictEqual(byId.errors, []);
  assert.ok(byId.entries.find((e) => e.id === "builtin:集合/实数集").aliases.includes("实数轴"));
  assert.strictEqual(byId.entries.find((e) => e.name === "黑板粗体").aliases.length, 0);

  const own = api.rebuildFromDictionary("我的 ;; k ;; \\alpha ;; Mine\n+mine ;; 我的阿尔法\n");
  assert.deepStrictEqual(own.errors, []);
  assert.ok(own.entries.find((e) => e.name === "我的").aliases.includes("我的阿尔法"));
  const hits = api.searchEntries(
    api.rebuildFromDictionary("我的算子 ;; myop ;; \\operatorname{T}\n").entries,
    "myop",
    { includeExtra: false, allowFuzzy: false },
  );
  assert.ok(hits.some((e) => e.name === "我的算子" && !e.extra));
});

test("numbered placeholders, defaults, $0, and literal # ~ $", () => {
  const reversed = api.expandSnippet("\\frac{${2:num}}{${1:den}}$0", false, true);
  assert.strictEqual(reversed.text, "\\frac{num}{den}");
  assert.deepStrictEqual(reversed.stops, [[11, 14], [6, 9]]);
  assert.strictEqual(reversed.exit, 15);

  const defaults = api.expandSnippet("\\frac{${1:a}}{${2:b}}", false, true);
  assert.strictEqual(defaults.text, "\\frac{a}{b}");
  assert.deepStrictEqual(defaults.stops, [[6, 7], [9, 10]]);

  const nested = api.expandSnippet("${1:\\frac{a\\}{b\\}}", false, true);
  assert.strictEqual(nested.text, "\\frac{a}{b}");
  assert.deepStrictEqual(nested.stops, [[0, nested.text.length]]);

  const escaped = api.expandSnippet("\\$ ${1:a}", false, true);
  assert.strictEqual(escaped.text, "\\$ a");
  assert.deepStrictEqual(escaped.stops, [[3, 4]]);

  const latexDollar = api.expandSnippet("${1:\\$}", false, true);
  assert.strictEqual(latexDollar.text, "\\$");

  const literal = api.expandSnippet("a # b ~ c", false, true);
  assert.strictEqual(literal.text, "a # b ~ c");
  assert.deepStrictEqual(literal.stops, []);

  const mixed = api.expandSnippet("${1:a # b} ~ $0", false, true);
  assert.strictEqual(mixed.text, "a # b ~ ");
  assert.deepStrictEqual(mixed.stops, [[0, 5]]);
  assert.strictEqual(mixed.exit, mixed.text.length);

  const exitOnly = api.expandSnippet("\\alpha$0", false, true);
  assert.strictEqual(exitOnly.text, "\\alpha");
  assert.deepStrictEqual(exitOnly.stops, []);
  assert.strictEqual(exitOnly.exit, 6);

  const curated = api.expandSnippet("\\frac{a}{b}", false, false);
  assert.deepStrictEqual(curated.stops, [[6, 7], [9, 10]]);
  assert.strictEqual(curated.exit, curated.text.length);
  const userBraces = api.expandSnippet("\\frac{a}{b}", false, true);
  assert.deepStrictEqual(userBraces.stops, curated.stops);

  const extra = api.expandSnippet("\\frac{#}{#}~", true, false);
  assert.strictEqual(extra.text, "\\frac{}{}");
  assert.deepStrictEqual(extra.stops, [[6, 6], [8, 8]]);
  assert.strictEqual(extra.exit, extra.text.length);

  const fromFile = api.rebuildFromDictionary("带默认 ;; def ;; \\frac{${1:a}}{${2:b}}$0\n");
  assert.deepStrictEqual(fromFile.errors, []);
  const entry = fromFile.entries.find((e) => e.name === "带默认");
  const snip = api.expandSnippet(entry.tex, entry.extra, entry.user);
  assert.strictEqual(snip.text, "\\frac{a}{b}");
  assert.deepStrictEqual(snip.stops, [[6, 7], [9, 10]]);
  assert.strictEqual(snip.exit, snip.text.length);

  const flat = api.snippetFor({ tex: "a\nb", extra: false, user: false }, null);
  assert.strictEqual(flat.text, "a b");
  const displayed = api.snippetFor({ tex: "a\nb", extra: false, user: false }, "display");
  assert.strictEqual(displayed.text, "a\nb");
});

test("usage boost is capped and cannot outrank an exact name", () => {
  assert.strictEqual(api.usageBonus(0), 0);
  assert.strictEqual(api.usageBonus(1), 10);
  assert.strictEqual(api.usageBonus(1e9), api.USAGE_BONUS_CAP);
  assert.ok(api.USAGE_BONUS_CAP < 50);

  const exact = make({ name: "Summation", en: "Summation", keys: "other", tex: "S", id: "exact" });
  const popular = make({ name: "Other", en: "Nope", keys: "summation extra", tex: "X", id: "popular" });
  const buried = api.searchEntries([exact, popular], "summation", {
    allowFuzzy: false,
    usage: { popular: 1000 },
  });
  assert.strictEqual(buried[0].id, "exact");

  const ahead = make({ name: "summation", en: "summation", keys: "sum rest", tex: "\\sum", id: "ahead" });
  const named = make({ name: "sum", en: "sum", keys: "zz", tex: "zzzz", id: "named" });
  const before = api.searchEntries([named, ahead], "sum", { allowFuzzy: false });
  assert.strictEqual(before[0].id, "ahead");
  const frequentExact = api.searchEntries([named, ahead], "sum", {
    allowFuzzy: false,
    usage: { named: 100 },
  });
  assert.strictEqual(frequentExact[0].id, "named");
  const frequentOther = api.searchEntries([named, ahead], "sum", {
    allowFuzzy: false,
    usage: { ahead: 100 },
  });
  assert.strictEqual(frequentOther[0].id, "ahead");

  const alpha = make({ name: "甲", en: "Alpha", keys: "widget", tex: "A", id: "a" });
  const beta = make({ name: "乙", en: "Beta", keys: "widget", tex: "B", id: "b" });
  const plain = api.searchEntries([alpha, beta], "widget", { allowFuzzy: false });
  assert.deepStrictEqual(plain.map((e) => e.id), ["a", "b"]);
  const used = api.searchEntries([alpha, beta], "widget", { allowFuzzy: false, usage: { b: 5 } });
  assert.strictEqual(used[0].id, "b");
  const empty = api.searchEntries([alpha, beta], "", { allowFuzzy: false, usage: { b: 3 } });
  assert.deepStrictEqual(empty.map((e) => e.id), ["b", "a"]);
});

test("usage map stays bounded and does not mutate the previous map", () => {
  let counts = Object.create(null);
  for (let i = 0; i < 450; i++) counts = api.bumpUsage(counts, `id${i}`, 400);
  assert.strictEqual(Object.keys(counts).length, 400);

  const full = Object.create(null);
  for (let i = 0; i < 400; i++) full[`k${String(i).padStart(3, "0")}`] = 5;
  const next = api.bumpUsage(full, "new", 400);
  assert.strictEqual(next.new, 1);
  assert.strictEqual(Object.keys(next).length, 400);
  assert.strictEqual(full.new, undefined);
  assert.strictEqual(full.k000, 5);
  assert.strictEqual(api.bumpUsage({ id: 100000 }, "id", 10).id, 100000);
});

if (failed) {
  console.error(`\n${failed} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`\n${passed} passed`);
