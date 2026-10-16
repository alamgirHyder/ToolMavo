import test from "node:test";
import assert from "node:assert/strict";
import {
  detectLanguage,
  supportedLanguage,
  translate,
  formatNumber,
  localeInfo,
  preferenceKey,
} from "./localization.js";
import { de, ur } from "./locales/messages.js";
import { cats, tools } from "./catalog.js";
import { calculate, transform } from "./tools.js";
const storage = (value) => ({
  getItem: (key) => (key === preferenceKey ? value : null),
});
test("browser locales select German and Urdu, with English fallback", () => {
  assert.equal(detectLanguage(storage(null), ["de-DE", "en-US"]), "de");
  assert.equal(detectLanguage(storage(null), ["ur-PK"]), "ur");
  assert.equal(detectLanguage(storage(null), ["fr-FR", "de-AT"]), "de");
  assert.equal(detectLanguage(storage(null), ["en-PK"]), "en");
  assert.equal(detectLanguage(storage(null), ["fr-FR"]), "en");
  assert.equal(detectLanguage(null, []), "en");
});
test("saved preference wins and unavailable storage remains usable", () => {
  assert.equal(detectLanguage(storage("ur"), ["de-DE"]), "ur");
  assert.equal(detectLanguage(storage("bad"), ["de-DE"]), "de");
  assert.equal(
    detectLanguage(
      {
        getItem() {
          throw Error("blocked");
        },
      },
      ["ur-PK"],
    ),
    "ur",
  );
  assert.equal(supportedLanguage(undefined), null);
  assert.equal(supportedLanguage("DE_ch"), "de");
});
test("dictionaries cover identical keys and parameter placeholders", () => {
  assert.deepEqual(Object.keys(de).sort(), Object.keys(ur).sort());
  for (const [key, value] of Object.entries(de)) {
    assert.ok(value.trim());
    assert.ok(ur[key].trim());
    const placeholders = (text) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(placeholders(value), placeholders(key), key);
    assert.deepEqual(placeholders(ur[key]), placeholders(key), key);
  }
});
test("all tool and category names and descriptions have both translations", () => {
  for (const item of [...cats, ...tools])
    for (const key of [item.name, item.desc]) {
      assert.ok(de[key], key);
      assert.ok(ur[key], key);
    }
});
test("translation interpolation preserves user content and has English fallback", () => {
  const name = "<script>hello</script>";
  assert.equal(
    translate("de", "How to use {tool}", { tool: name }),
    "So verwendest du " + name,
  );
  assert.equal(translate("fr", "Home"), "Home");
  assert.equal(
    translate("ur", "Untranslated future message"),
    "Untranslated future message",
  );
  assert.equal(translate("de", "  Home\n"), "Startseite");
});
test("language directions and locale number formatting", () => {
  assert.equal(localeInfo("ur").dir, "rtl");
  assert.equal(localeInfo("de").dir, "ltr");
  assert.equal(localeInfo("bad").code, "en");
  assert.equal(
    formatNumber("de", 1234.5, { minimumFractionDigits: 2 }),
    "1.234,50",
  );
});
test("generated tool results translate while entered text and JSON remain unchanged", () => {
  const presentation = {
    t: (key, params) => translate("de", key, params),
    n: (value, decimals = 2) =>
      formatNumber("de", value, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
  };
  const profit = calculate(
    "profit-margin-calculator",
    100,
    60,
    0,
    0,
    presentation,
  );
  assert.equal(profit.value, "40,00%");
  assert.equal(profit.note, "Gewinn: 40,00");
  assert.match(
    transform("word-counter", "hello world", "encode", "", presentation),
    /2 Wörter/,
  );
  assert.equal(
    transform(
      "remove-duplicate-lines",
      "Hello\nHello",
      "encode",
      "",
      presentation,
    ),
    "Hello",
  );
  assert.equal(
    transform(
      "json-formatter",
      '{"message":"Hello"}',
      "encode",
      "",
      presentation,
    ),
    '{\n  "message": "Hello"\n}',
  );
});

test("Vue interface text and literal translation keys remain covered", async () => {
  const { readFile } = await import("node:fs/promises");
  const { parse } = await import("@vue/compiler-sfc");
  const exemptions = new Set(["tool", "mavo", "USD", "EUR", "GBP", "PKR"]);
  for (const file of ["App.vue", "ToolWorkspace.vue"]) {
    const source = await readFile(
      new URL("./" + file, import.meta.url),
      "utf8",
    );
    const ast = parse(source).descriptor.template.ast;
    const walk = (node) => {
      if (node.type === 2) {
        const text = node.content.trim();
        if (/[A-Za-z]/.test(text))
          assert.ok(
            exemptions.has(text),
            `${file}: untranslated template text: ${text}`,
          );
      }
      if (node.type === 1)
        for (const prop of node.props || []) {
          if (
            prop.type === 6 &&
            ["aria-label", "placeholder", "alt"].includes(prop.name) &&
            prop.value &&
            /[A-Za-z]/.test(prop.value.content)
          )
            assert.fail(`${file}: untranslated ${prop.name}`);
        }
      for (const child of node.children || []) walk(child);
    };
    walk(ast);
    for (const match of source.matchAll(/\bt\(\s*(["'])(.*?)\1/g)) {
      assert.ok(de[match[2]], `${file}: missing ${match[2]}`);
      assert.ok(ur[match[2]]);
    }
  }
});

test("API and native failures map to localized safe messages", async () => {
  const { apiFailure, errorKey } = await import("./localization.js");
  for (const [code, expected] of [
    ["VALIDATION_ERROR", "Check the form fields and try again."],
    ["RATE_LIMITED", "Too many submissions. Please try again in 15 minutes."],
    ["PAYLOAD_TOO_LARGE", "Request exceeds 32 KB."],
  ]) {
    const error = apiFailure({}, { code, message: "Private server details" });
    assert.equal(errorKey(error), expected);
    assert.notEqual(translate("ur", expected), expected);
  }
  assert.equal(
    errorKey(new SyntaxError("private input")),
    "Invalid JSON. Check your input.",
  );
  assert.equal(
    errorKey(new Error("private database details")),
    "Operation failed. Please check your input.",
  );
});
