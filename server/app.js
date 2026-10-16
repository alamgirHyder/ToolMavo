import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const text = (max) => z.string().trim().min(1).max(max);
const email = z.string().trim().email().max(200);
const contact = z.strictObject({
  name: text(150),
  email,
  message: text(5000).min(10),
});
const money = (max) =>
  z
    .number()
    .finite()
    .min(0)
    .max(max)
    .refine(
      (n) => new Decimal(n).decimalPlaces() <= 2,
      "Use at most two decimal places.",
    );
const invoice = z.strictObject({
  client: text(150),
  email,
  description: text(500),
  quantity: money(100000).min(0.01),
  rate: money(1000000),
  currency: z.enum(["USD", "EUR", "GBP", "PKR"]),
});

export function createApp(
  db,
  {
    staticDir = fileURLToPath(new URL("../frontend/dist", import.meta.url)),
    trustProxy = false,
    isReady = () => true,
  } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  // Vue styles and PDF rendering need inline styles and local blob workers.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          workerSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests:
            process.env.NODE_ENV === "production" ? [] : null,
        },
      },
    }),
  );
  app.use("/api", (req, res, next) => {
    if (isReady()) return next();
    res.status(503).json({
      status: "DOWN",
      database: "MySQL",
      code: "DATABASE_NOT_READY",
      message: "Service temporarily unavailable. Please try again.",
    });
  });
  app.use("/api", express.json({ limit: "32kb" }));
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      code: "RATE_LIMITED",
      message: "Too many submissions. Please try again in 15 minutes.",
    },
  });
  app.get("/api/health", async (req, res) => {
    await db.health();
    res.json({ status: "UP", database: "MySQL" });
  });
  app.post("/api/contact", limiter, async (req, res) => {
    const data = contact.parse(req.body);
    const record = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.saveContact(record);
    res.status(201).json({ id: record.id, createdAt: record.createdAt });
  });
  app.post("/api/invoices", limiter, async (req, res) => {
    const data = invoice.parse(req.body);
    const record = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      total: new Decimal(data.quantity)
        .times(data.rate)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        .toFixed(2),
    };
    await db.saveInvoice(record);
    const { email: privateEmail, ...receipt } = record;
    res.status(201).json(receipt);
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ message: "API endpoint not found." }),
  );
  app.use(express.static(staticDir, { index: "index.html", maxAge: 0 }));
  app.get("/{*path}", (req, res, next) => {
    if (path.extname(req.path)) return res.sendStatus(404);
    res.sendFile(path.join(staticDir, "index.html"), (err) => err && next(err));
  });
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (err.type === "entity.too.large")
      return res
        .status(413)
        .json({ code: "PAYLOAD_TOO_LARGE", message: "Request exceeds 32 KB." });
    if (err.type === "entity.parse.failed")
      return res
        .status(400)
        .json({ code: "INVALID_JSON", message: "Invalid JSON request." });
    console.error("Request failed:", err.code || err.name);
    res.status(503).json({
      code: "SERVICE_UNAVAILABLE",
      message: "Service temporarily unavailable. Please try again.",
    });
  });
  return app;
}
