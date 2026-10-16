import test from "node:test";
import assert from "node:assert/strict";
import { calculate, transform, trackingUrl, pageIndices } from "./tools.js";
test("all six calculators return correct results", () => {
  assert.equal(calculate("profit-margin-calculator", 100, 60).value, "40.00%");
  assert.equal(calculate("markup-calculator", 50, 40).value, "70.00");
  assert.equal(calculate("vat-calculator", 100, 20).value, "120.00");
  assert.equal(calculate("discount-calculator", 100, 20).value, "80.00");
  assert.equal(
    calculate("break-even-calculator", 1000, 40, 15).value,
    "40 units",
  );
  assert.equal(
    calculate("freelance-rate-calculator", 60000, 5000, 25, 46).value,
    "56.52/hour",
  );
});
test("financial validation", () => {
  assert.throws(() => calculate("discount-calculator", 100, 120));
  assert.throws(() => calculate("profit-margin-calculator", 0, 60));
  assert.throws(() => calculate("break-even-calculator", 1000, 20, 30));
  assert.throws(() => calculate("markup-calculator", NaN, 10));
});
test("Unicode counts, case conversion, deduplication and differences", () => {
  assert.match(transform("word-counter", "hello world"), /^2 words/);
  assert.match(transform("character-counter", "😀 x"), /^3 characters/);
  assert.equal(
    transform("case-converter", "hello WORLD", "title"),
    "Hello World",
  );
  assert.equal(transform("remove-duplicate-lines", "a\nb\na"), "a\nb");
  assert.equal(
    transform("text-difference-checker", "a", "encode", "b"),
    "− a\n+ b",
  );
});
test("Unicode encoding round trips and malformed input rejection", () => {
  const value = "Hello 世界 🌍";
  assert.equal(
    transform(
      "base64-encoder-decoder",
      transform("base64-encoder-decoder", value),
      "decode",
    ),
    value,
  );
  assert.equal(
    transform(
      "url-encoder-decoder",
      transform("url-encoder-decoder", value),
      "decode",
    ),
    value,
  );
  assert.throws(() => transform("json-formatter", "{bad}"));
  assert.equal(transform("json-formatter", '{"a":1}'), '{\n  "a": 1\n}');
  assert.throws(() => transform("base64-encoder-decoder", "!", "decode"));
});
test("page selection validates ranges and preserves order", () => {
  assert.deepEqual(pageIndices("3,1-2", 3), [2, 0, 1]);
  for (const value of ["0", "4", "3-1", "x", ""])
    assert.throws(() => pageIndices(value, 3));
});
test("UTM preserves query and fragment with safe encoding", () => {
  const u = new URL(
    trackingUrl("https://example.com/?a=1#part", "a & b", "email", "sale"),
  );
  assert.equal(u.searchParams.get("a"), "1");
  assert.equal(u.searchParams.get("utm_source"), "a & b");
  assert.equal(u.hash, "#part");
  assert.throws(() => trackingUrl("javascript:alert(1)", "a", "b", "c"));
});
