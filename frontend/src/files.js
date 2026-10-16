import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { pageIndices } from "./tools";
export function download(data, name, type) {
  const url = URL.createObjectURL(
    data instanceof Blob ? data : new Blob([data], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function image(file) {
  if (!file.type.startsWith("image/"))
    throw Error("Choose a supported image file.");
  return createImageBitmap(file);
}
function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("Unable to create image."))),
      type,
      quality,
    ),
  );
}
export async function processImage(slug, file, options) {
  const img = await image(file);
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const w = Number(options.width),
      h = Number(options.height);
    if (
      ["image-resizer", "image-cropper"].includes(slug) &&
      (!Number.isInteger(w) ||
        !Number.isInteger(h) ||
        w < 1 ||
        h < 1 ||
        w > 8192 ||
        h > 8192)
    )
      throw Error("Dimensions must be whole numbers between 1 and 8192.");
    c.width = ["image-resizer", "image-cropper"].includes(slug) ? w : img.width;
    c.height = ["image-resizer", "image-cropper"].includes(slug)
      ? h
      : img.height;
    if (c.width * c.height > 32000000)
      throw Error("Image is too large; use a smaller source.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, c.width, c.height);
    if (slug === "image-cropper") {
      const scale = Math.max(w / img.width, h / img.height);
      const sw = w / scale,
        sh = h / scale;
      ctx.drawImage(
        img,
        (img.width - sw) / 2,
        (img.height - sh) / 2,
        sw,
        sh,
        0,
        0,
        w,
        h,
      );
    } else ctx.drawImage(img, 0, 0, c.width, c.height);
    const type = slug === "jpg-to-webp" ? "image/webp" : "image/jpeg";
    return await canvasBlob(c, type, Number(options.quality) / 100);
  } finally {
    img.close();
  }
}
export async function processPdf(slug, files, options) {
  if (slug === "pdf-to-jpg") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await files[0].arrayBuffer()),
      isEvalSupported: false,
    });
    try {
      const pdf = await loadingTask.promise;
      const pages = pageIndices(options.pages, pdf.numPages);
      if (pages.length > 30) throw Error("Export up to 30 pages at a time.");
      const results = [];
      for (const n of pages) {
        const page = await pdf.getPage(n + 1);
        const viewport = page.getViewport({ scale: 1.5 });
        if (viewport.width * viewport.height > 32000000)
          throw Error("Page is too large to render safely.");
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
        results.push({
          blob: await canvasBlob(canvas, "image/jpeg", 0.9),
          name: `page-${n + 1}.jpg`,
        });
      }
      return results;
    } finally {
      await loadingTask.destroy();
    }
  }
  const output = await PDFDocument.create();
  if (slug === "images-to-pdf") {
    for (const file of files) {
      const img = await image(file);
      try {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        const embedded = await output.embedJpg(
          await (await canvasBlob(c, "image/jpeg", 0.92)).arrayBuffer(),
        );
        const scale = Math.min(1, 595 / embedded.width, 842 / embedded.height);
        const page = output.addPage([
          embedded.width * scale,
          embedded.height * scale,
        ]);
        page.drawImage(embedded, {
          x: 0,
          y: 0,
          width: page.getWidth(),
          height: page.getHeight(),
        });
      } finally {
        img.close();
      }
    }
  } else {
    for (const file of files) {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      const selected = ["split-pdf", "reorder-pdf-pages"].includes(slug)
        ? pageIndices(options.pages, doc.getPageCount())
        : doc.getPageIndices();
      const pages = await output.copyPages(doc, selected);
      pages.forEach((p) => output.addPage(p));
    }
    if (slug === "pdf-watermark") {
      if (!options.watermark.trim()) throw Error("Enter watermark text.");
      const font = await output.embedFont(StandardFonts.Helvetica);
      for (const p of output.getPages())
        p.drawText(options.watermark, {
          x: 35,
          y: p.getHeight() / 2,
          size: Math.min(
            40,
            p.getWidth() / Math.max(options.watermark.length, 0.1),
          ),
          font,
          color: rgb(0.2, 0.4, 0.4),
          opacity: 0.35,
          rotate: degrees(30),
        });
    }
  }
  return [
    {
      blob: new Blob([await output.save()], { type: "application/pdf" }),
      name: `${slug}.pdf`,
    },
  ];
}
