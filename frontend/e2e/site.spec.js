import { test, expect } from "@playwright/test";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
async function open(page, slug) {
  await page.goto("/#tool/" + slug);
  await expect(page.locator("h1")).toBeVisible();
}
test("home, search, categories and mobile navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Every tool you need.");
  await expect(page.locator(".category")).toHaveCount(6);
  await page.getByRole("searchbox").fill("JSON");
  await page.getByRole("button", { name: "Search →" }).click();
  await expect(page.locator(".tool-grid .tool")).toHaveCount(1);
  await page.locator(".tool-grid .tool").click();
  await expect(page.locator("h1")).toHaveText("JSON Formatter");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .locator("nav")
    .getByRole("link", { name: "All Tools", exact: true })
    .click();
  await expect(page.locator(".tool-grid .tool")).toHaveCount(30);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("text, Unicode encoding, calculators, QR and tracking URL", async ({
  page,
}) => {
  await open(page, "word-counter");
  await page.getByLabel("Input text").fill("hello world");
  await page.getByRole("button", { name: "Run tool", exact: true }).click();
  await expect(page.locator(".output")).toContainText("2 words");
  await open(page, "base64-encoder-decoder");
  await page.getByLabel("Input text").fill("Hello 世界");
  await page.getByRole("button", { name: "Encode", exact: true }).click();
  const encoded = await page.locator(".output").textContent();
  await page.getByLabel("Input text").fill(encoded);
  await page.getByRole("button", { name: "Decode", exact: true }).click();
  await expect(page.locator(".output")).toHaveText("Hello 世界");
  await open(page, "profit-margin-calculator");
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator(".output")).toContainText("40.00%");
  await open(page, "json-formatter");
  await page.getByLabel("Input text").fill("{bad}");
  await page.getByRole("button", { name: "Run tool", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await open(page, "qr-code-generator");
  await page.getByLabel("Text or URL").fill("https://example.com");
  await page.getByRole("button", { name: "Run tool", exact: true }).click();
  await expect(page.getByAltText("Generated QR code")).toBeVisible();
  await open(page, "utm-link-builder");
  await page.getByRole("button", { name: "Run tool", exact: true }).click();
  await expect(page.locator(".output")).toContainText("utm_campaign=launch");
});
test("image resize produces downloadable image", async ({ page }) => {
  await open(page, "image-resizer");
  const buffer = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    c.getContext("2d").fillRect(0, 0, 20, 20);
    return Array.from(
      new Uint8Array(
        await (
          await new Promise((r) => c.toBlob(r, "image/png"))
        ).arrayBuffer(),
      ),
    );
  });
  await page.getByLabel("Choose your file").setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(buffer),
  });
  await page.getByLabel("Width (px)").fill("80");
  await page.getByLabel("Height (px)").fill("60");
  await page.getByRole("button", { name: "Process file" }).click();
  await expect(page.getByAltText("Processed result")).toBeVisible();
  const size = await page
    .getByAltText("Processed result")
    .evaluate((i) => [i.naturalWidth, i.naturalHeight]);
  expect(size).toEqual([80, 60]);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download image-resizer.jpg" })
    .click();
  expect((await download).suggestedFilename()).toBe("image-resizer.jpg");
});
test("merge, extract, reorder, watermark and render PDFs", async ({ page }) => {
  const doc = await PDFDocument.create();
  const first = doc.addPage([300, 400]);
  first.drawRectangle({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
    color: rgb(0, 0, 0),
  });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  first.drawText("ToolMavo PDF test", { x: 20, y: 300, size: 18, font });
  doc.addPage([500, 600]);
  const buffer = Buffer.from(await doc.save());
  for (const slug of [
    "merge-pdf",
    "split-pdf",
    "reorder-pdf-pages",
    "pdf-watermark",
    "pdf-to-jpg",
  ]) {
    await open(page, slug);
    await page.locator("#files").setInputFiles(
      slug === "merge-pdf"
        ? [
            { name: "one.pdf", mimeType: "application/pdf", buffer },
            { name: "two.pdf", mimeType: "application/pdf", buffer },
          ]
        : { name: "test.pdf", mimeType: "application/pdf", buffer },
    );
    if (slug === "reorder-pdf-pages")
      await page.getByLabel("Pages in desired order").fill("2,1");
    await page.getByRole("button", { name: "Process file" }).click();
    await expect(page.locator(".error")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Download .*\.(pdf|jpg)/ }),
    ).toBeVisible({ timeout: 20000 });
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download .*\.(pdf|jpg)/ }).click();
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(await (await downloading).path());
    if (slug !== "pdf-to-jpg") {
      const processed = await PDFDocument.load(bytes);
      expect(processed.getPageCount()).toBe(
        slug === "merge-pdf" ? 4 : slug === "split-pdf" ? 1 : 2,
      );
      if (slug === "reorder-pdf-pages")
        expect(processed.getPage(0).getSize()).toEqual({
          width: 500,
          height: 600,
        });
    } else {
      await expect(page.getByAltText("Processed result")).toBeVisible();
      const dimensions = await page
        .getByAltText("Processed result")
        .evaluate((image) => [image.naturalWidth, image.naturalHeight]);
      expect(dimensions).toEqual([450, 600]);
      const pixel = await page
        .getByAltText("Processed result")
        .evaluate((image) => {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0);
          return [...ctx.getImageData(30, 550, 1, 1).data];
        });
      expect(pixel[0]).toBeLessThan(30);
    }
  }
});
test("invoice and contact save through API", async ({ page }) => {
  await open(page, "invoice-generator");
  await page.getByLabel("Client name").fill("Browser Test");
  await page.getByLabel("Client email").fill("browser@example.com");
  await page.getByRole("button", { name: "Save invoice", exact: true }).click();
  await expect(
    page.getByText("Invoice saved to the database.", { exact: false }),
  ).toBeVisible();
  await page.goto("/#contact");
  await page.getByLabel("Name", { exact: true }).fill("Browser Test");
  await page.getByLabel("Email", { exact: true }).fill("browser@example.com");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Browser test contact message.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your message has been saved.",
  );
});
test("desktop and mobile screenshots", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
});

test("all image tools export correct formats and images convert to PDF", async ({
  page,
}) => {
  await page.goto("/");
  const buffer = Buffer.from(
    await page.evaluate(async () => {
      const c = document.createElement("canvas");
      c.width = 20;
      c.height = 10;
      c.getContext("2d").fillRect(0, 0, 20, 10);
      return Array.from(
        new Uint8Array(
          await (
            await new Promise((r) => c.toBlob(r, "image/png"))
          ).arrayBuffer(),
        ),
      );
    }),
  );
  for (const slug of [
    "image-compressor",
    "image-resizer",
    "jpg-to-webp",
    "webp-to-jpg",
    "png-to-jpg",
    "image-cropper",
    "images-to-pdf",
  ]) {
    await open(page, slug);
    await page
      .locator("#files")
      .setInputFiles({ name: "test.png", mimeType: "image/png", buffer });
    await page.getByRole("button", { name: "Process file" }).click();
    const button = page.getByRole("button", {
      name: /Download .*\.(pdf|jpg|webp)/,
    });
    await expect(button).toBeVisible();
    const downloading = page.waitForEvent("download");
    await button.click();
    const downloaded = await downloading;
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(await downloaded.path());
    if (slug === "images-to-pdf")
      expect((await PDFDocument.load(content)).getPageCount()).toBe(1);
    else if (slug === "jpg-to-webp")
      expect(content.subarray(8, 12).toString()).toBe("WEBP");
    else expect([...content.subarray(0, 2)]).toEqual([255, 216]);
  }
});

test("remaining text and calculator tools run successfully", async ({
  page,
}) => {
  for (const [slug, input, expected] of [
    ["character-counter", "abc", "3 characters"],
    ["case-converter", "hello", "HELLO"],
    ["remove-duplicate-lines", "a\na", "a"],
    ["text-difference-checker", "before", "− before"],
    ["url-encoder-decoder", "a b", "a%20b"],
    ["uuid-generator", "", /^[a-f0-9]{8}-/],
  ]) {
    await open(page, slug);
    if (slug !== "uuid-generator")
      await page.getByLabel("Input text").fill(input);
    if (slug === "text-difference-checker")
      await page.getByLabel("Text to compare", { exact: true }).fill("after");
    await page
      .getByRole("button", {
        name:
          slug === "url-encoder-decoder"
            ? "Encode"
            : slug === "uuid-generator"
              ? "Generate UUID"
              : "Run tool",
        exact: true,
      })
      .click();
    await expect(page.locator(".output")).toContainText(expected);
  }
  for (const slug of [
    "freelance-rate-calculator",
    "markup-calculator",
    "vat-calculator",
    "discount-calculator",
    "break-even-calculator",
  ]) {
    await open(page, slug);
    await page.getByRole("button", { name: "Calculate", exact: true }).click();
    await expect(page.locator(".output")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});
