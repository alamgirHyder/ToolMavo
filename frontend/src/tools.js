export function calculate(slug, a, b, d, e) {
  for (const n of [a, b, d, e].filter((n) => n !== undefined))
    if (!Number.isFinite(n) || n < 0)
      throw Error("Enter valid non-negative numbers.");
  switch (slug) {
    case "profit-margin-calculator":
      if (a <= 0) throw Error("Selling price must be greater than zero.");
      return {
        value: (((a - b) / a) * 100).toFixed(2) + "%",
        note: `Profit: ${(a - b).toFixed(2)}`,
      };
    case "markup-calculator":
      return {
        value: (a * (1 + b / 100)).toFixed(2),
        note: `Markup: ${((a * b) / 100).toFixed(2)}`,
      };
    case "vat-calculator":
      if (b > 100) throw Error("VAT must be between 0 and 100%.");
      return {
        value: (a * (1 + b / 100)).toFixed(2),
        note: `VAT: ${((a * b) / 100).toFixed(2)}`,
      };
    case "discount-calculator":
      if (b > 100) throw Error("Discount must be between 0 and 100%.");
      return {
        value: (a * (1 - b / 100)).toFixed(2),
        note: `Savings: ${((a * b) / 100).toFixed(2)}`,
      };
    case "break-even-calculator":
      if (b <= d) throw Error("Selling price must exceed variable cost.");
      return {
        value: Math.ceil(a / (b - d)) + " units",
        note: "Rounded up to whole units",
      };
    case "freelance-rate-calculator":
      if (d <= 0 || e <= 0)
        throw Error("Billable hours and working weeks must exceed zero.");
      return {
        value: ((a + b) / (d * e)).toFixed(2) + "/hour",
        note: "Pre-tax rate; include overhead in annual expenses.",
      };
    default:
      throw Error("Unknown calculator");
  }
}
export function transform(slug, text, action = "encode", second = "") {
  switch (slug) {
    case "word-counter": {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return `${words} words · ${[...text].length} characters · ${Math.ceil(words / 200)} min reading time`;
    }
    case "character-counter":
      return `${[...text].length} characters · ${[...text.replace(/\s/g, "")].length} without whitespace`;
    case "case-converter":
      return action === "lower"
        ? text.toLowerCase()
        : action === "title"
          ? text.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())
          : text.toUpperCase();
    case "remove-duplicate-lines":
      return [...new Set(text.split(/\r?\n/))].join("\n");
    case "text-difference-checker": {
      const a = text.split("\n"),
        b = second.split("\n");
      return a.join("\n") === b.join("\n")
        ? "Texts are identical."
        : Array.from({ length: Math.max(a.length, b.length) }, (_, i) =>
            a[i] === b[i] ? `  ${a[i]}` : `− ${a[i] ?? ""}\n+ ${b[i] ?? ""}`,
          ).join("\n");
    }
    case "json-formatter":
      return JSON.stringify(JSON.parse(text), null, 2);
    case "url-encoder-decoder":
      return action === "decode"
        ? decodeURIComponent(text)
        : encodeURIComponent(text);
    case "base64-encoder-decoder":
      return action === "decode"
        ? new TextDecoder("utf-8", { fatal: true }).decode(
            Uint8Array.from(atob(text), (c) => c.charCodeAt(0)),
          )
        : btoa(
            Array.from(new TextEncoder().encode(text), (c) =>
              String.fromCharCode(c),
            ).join(""),
          );
    case "uuid-generator":
      return crypto.randomUUID();
    default:
      throw Error("Unknown text tool");
  }
}
export function trackingUrl(url, source, medium, campaign) {
  const u = new URL(url);
  if (!["http:", "https:"].includes(u.protocol))
    throw Error("Enter an HTTP or HTTPS URL.");
  for (const [k, v] of Object.entries({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
  }))
    if (v.trim()) u.searchParams.set(k, v.trim());
  return u.toString();
}
export function pageIndices(input, count) {
  if (!input.trim()) throw Error("Enter page numbers, for example 1,3-5.");
  const pages = [];
  for (const part of input.split(",")) {
    if (!/^\s*\d+(\s*-\s*\d+)?\s*$/.test(part))
      throw Error("Use page numbers or ascending ranges, for example 1,3-5.");
    const [a, b = a] = part.split("-").map(Number);
    if (a < 1 || b < a || b > count)
      throw Error(`Pages must be between 1 and ${count}.`);
    for (let p = a; p <= b; p++) pages.push(p - 1);
  }
  return pages;
}
