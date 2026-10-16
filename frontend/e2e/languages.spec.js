import { test, expect } from "@playwright/test";
import { tools } from "../src/catalog.js";
import { de, ur } from "../src/locales/messages.js";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
async function contextFor(browser, locale, options = {}) {
  const context = await browser.newContext({ locale, baseURL, ...options });
  const code = locale.split("-")[0];
  if (["de", "ur"].includes(code))
    await context.addInitScript((code) => {
      try {
        if (!localStorage.getItem("toolmavo.language"))
          localStorage.setItem("toolmavo.language", code);
      } catch {}
    }, code);
  return context;
}

test("German saved selection, translated search, results and saved override", async ({
  browser,
}) => {
  const context = await contextFor(browser, "de-DE");
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("h1")).toContainText(
    "Alle Tools, die du brauchst.",
  );
  await page.getByRole("searchbox").fill("Gewinnmargenrechner");
  await page.getByRole("button", { name: "Suchen →", exact: true }).click();
  await expect(page.locator(".tool-grid .tool")).toHaveCount(1);
  await page.locator(".tool-grid .tool").click();
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(page.locator(".output")).toContainText("40,00%");
  await expect(page.locator(".output")).toContainText("Gewinn: 40,00");
  await page.getByLabel("Verkaufspreis", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Berechnen", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Der Verkaufspreis muss größer als null sein.",
  );
  await page.getByTestId("language-select").selectOption("en");
  await expect(page.getByRole("alert")).toHaveText(
    "Selling price must be greater than zero.",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("language-select")).toHaveValue("en");
  await context.close();
});

test("Urdu saved selection, RTL, mobile layouts and localized tool output", async ({
  browser,
}) => {
  const context = await contextFor(browser, "ur-PK");
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("h1")).toContainText("آپ کی ضرورت کا ہر ٹول۔");
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/home-urdu-mobile.png",
    fullPage: true,
  });
  await page.goto("/#tool/word-counter");
  await page
    .getByLabel("تحریر درج کریں", { exact: true })
    .fill("یہ اردو متن ہے");
  await page.getByRole("button", { name: "ٹول چلائیں", exact: true }).click();
  await expect(page.locator(".output")).toContainText("الفاظ");
  await page.getByTestId("language-select").selectOption("de");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("#input")).toHaveValue("یہ اردو متن ہے");
  await expect(page.locator(".output")).toContainText("Wörter");
  await context.close();
});

test("unsupported browser language falls back to English", async ({
  browser,
}) => {
  const context = await contextFor(browser, "fr-FR");
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText("Every tool you need.");
  await context.close();
});

test("blocked local storage keeps English default and permits manual switching", async ({
  browser,
}) => {
  const context = await contextFor(browser, "de-DE");
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw Error("blocked");
    };
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByTestId("language-select").selectOption("ur");
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  await context.close();
});

test("switching language preserves user content, file selections and generated encodings", async ({
  page,
}) => {
  await page.goto("/#tool/base64-encoder-decoder");
  await page.getByLabel("Input text", { exact: true }).fill("Hello 世界");
  await page.getByRole("button", { name: "Encode", exact: true }).click();
  const encoded = await page.locator(".output").textContent();
  await page.getByTestId("language-select").selectOption("ur");
  await expect(page.locator("#input")).toHaveValue("Hello 世界");
  await expect(page.locator(".output")).toHaveText(encoded);
  await page.goto("/#tool/image-resizer");
  await page.locator("#files").setInputFiles({
    name: "my-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from("fixture"),
  });
  await page.getByTestId("language-select").selectOption("de");
  await expect(page.locator("ol")).toContainText("my-photo.png");
  expect(await page.locator("#files").evaluate((e) => e.files.length)).toBe(1);
});

test("all 30 tool pages have translated headings in German and Urdu", async ({
  browser,
}) => {
  for (const [locale, code, messages] of [
    ["de-DE", "de", de],
    ["ur-PK", "ur", ur],
  ]) {
    const context = await contextFor(browser, locale);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const tool of tools) {
      await page.goto("/#tool/" + tool.slug);
      await expect(page.locator("h1")).toHaveText(messages[tool.name]);
      await expect(page.locator(".workspace")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", code);
    }
    expect(errors).toEqual([]);
    await context.close();
  }
});

test("localized API failures, successful submissions and invoice currency stay correct", async ({
  browser,
}) => {
  const context = await contextFor(browser, "de-DE");
  const page = await context.newPage();
  await page.goto("/#contact");
  await page.getByLabel("Name", { exact: true }).fill("Sprachtest");
  await page.getByLabel("E-Mail", { exact: true }).fill("language@example.com");
  await page
    .getByLabel("Nachricht", { exact: true })
    .fill("Eine Testnachricht für ToolMavo.");
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        code: "RATE_LIMITED",
        message: "Too many submissions.",
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Nachricht senden", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Zu viele Anfragen.");
  await page.unroute("**/api/contact");
  await page
    .getByRole("button", { name: "Nachricht senden", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Deine Nachricht wurde gespeichert.",
  );
  await page.getByTestId("language-select").selectOption("ur");
  await expect(page.getByRole("status")).toContainText(
    "آپ کا پیغام محفوظ ہوگیا ہے۔",
  );
  await page.goto("/#tool/invoice-generator");
  await page.locator("#client").fill("زبان ٹیسٹ");
  await page.locator("#email").fill("language@example.com");
  await page.locator("#qty").fill("2.5");
  await page.locator("#rate").fill("10.25");
  await page.locator("#currency").selectOption("EUR");
  await page
    .getByRole("button", { name: "انوائس محفوظ کریں", exact: true })
    .click();
  await expect(page.locator(".invoice")).toContainText("25.63");
  await page.getByTestId("language-select").selectOption("de");
  await expect(page.locator("#client")).toHaveValue("زبان ٹیسٹ");
  await expect(page.locator(".invoice")).toContainText("25,63");
  await expect(page.locator(".invoice")).toContainText("EUR");
  await context.close();
});

test("German desktop and Urdu desktop screenshots", async ({ browser }) => {
  for (const [locale, file] of [
    ["de-DE", "home-german-desktop.png"],
    ["ur-PK", "home-urdu-desktop.png"],
  ]) {
    const context = await contextFor(browser, locale);
    const page = await context.newPage();
    await page.goto("/");
    await page.screenshot({ path: "test-results/" + file, fullPage: true });
    await context.close();
  }
});

test("user text is escaped and never translated as interface HTML", async ({
  page,
}) => {
  await page.goto("/#tool/remove-duplicate-lines");
  const text = '<img src=x onerror="window.__toolmavoXss=1">';
  await page.getByLabel("Input text", { exact: true }).fill(text + "\n" + text);
  await page.getByRole("button", { name: "Run tool", exact: true }).click();
  await expect(page.locator(".output")).toHaveText(text);
  await page.getByTestId("language-select").selectOption("ur");
  await expect(page.locator(".output")).toHaveText(text);
  await expect(page.locator(".output img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__toolmavoXss)).toBeUndefined();
});

test("new visitors always start in English, including German and Urdu browsers", async ({
  browser,
}) => {
  for (const locale of ["de-DE", "ur-PK", "ar-SA", "zh-CN"]) {
    const context = await browser.newContext({ locale, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("language-select")).toHaveValue("en");
    await page.getByTestId("language-select").selectOption("fr");
    await page.reload();
    await expect(page.getByTestId("language-select")).toHaveValue("fr");
    await context.close();
  }
});

test("all twelve languages select, persist, format results and fit responsive screens", async ({
  browser,
}) => {
  const { languages } = await import("../src/localization.js");
  const { dictionaries } = await import("../src/locales/messages.js");
  for (const language of languages) {
    const context = await browser.newContext({ locale: "en-US", baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByTestId("language-select").selectOption(language.code);
    await expect(page.locator("html")).toHaveAttribute("lang", language.code);
    await expect(page.locator("html")).toHaveAttribute("dir", language.dir);
    await expect(page.locator("h1")).toContainText(
      dictionaries[language.code]?.["Every tool you need."] ||
        "Every tool you need.",
    );
    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        language.code + " " + width,
      ).toBe(true);
    }
    await page.reload();
    await expect(page.getByTestId("language-select")).toHaveValue(
      language.code,
    );
    await page.goto("/#tool/profit-margin-calculator");
    await page.locator(".workspace button.primary").click();
    await expect(page.locator(".output")).toContainText(
      new Intl.NumberFormat(language.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(40),
    );
    await page.goto("/#all-tools");
    await page
      .getByRole("textbox")
      .fill(dictionaries[language.code]?.["Word Counter"] || "Word Counter");
    await expect(page.locator(".tool-grid .tool")).toHaveCount(1);
    await context.close();
  }
});
