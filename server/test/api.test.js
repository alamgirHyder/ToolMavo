import { test, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../app.js";
const contacts = [],
  invoices = [];
const db = {
  health: async () => {},
  saveContact: async (r) => contacts.push(r),
  saveInvoice: async (r) => invoices.push(r),
};
const server = createApp(db).listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((resolve) => server.close(resolve)));
const post = (route, body) =>
  fetch(base + route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const validInvoice = {
  client: "Example Client",
  email: "test@example.com",
  description: "Design work",
  quantity: 2.5,
  rate: 10.25,
  currency: "USD",
};
test("health executes database check", async () => {
  const r = await fetch(base + "/api/health");
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { status: "UP", database: "MySQL" });
});
test("invoice total uses decimal HALF_UP rounding and persists", async () => {
  const r = await post("/api/invoices", validInvoice);
  assert.equal(r.status, 201);
  const body = await r.json();
  assert.equal(body.total, "25.63");
  assert.ok(body.id);
  assert.equal(invoices.at(-1).email, "test@example.com");
  assert.equal(body.email, undefined);
});
test("invalid invoice fields, currency, precision and injected total rejected", async () => {
  for (const change of [
    { quantity: -1 },
    { rate: 1.001 },
    { currency: "XXX" },
    { total: 1 },
    { email: "invalid" },
    { client: " " },
  ]) {
    const r = await post("/api/invoices", { ...validInvoice, ...change });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).code, "VALIDATION_ERROR");
  }
});
test("contact is validated, trimmed and persisted", async () => {
  const r = await post("/api/contact", {
    name: " Test ",
    email: "test@example.com",
    message: "Please add more useful tools.",
  });
  assert.equal(r.status, 201);
  assert.ok((await r.json()).id);
  assert.equal(contacts.at(-1).name, "Test");
});
test("invalid contact never persists", async () => {
  const before = contacts.length;
  const r = await post("/api/contact", {
    name: "Test",
    email: "bad",
    message: "short",
  });
  assert.equal(r.status, 400);
  assert.equal(contacts.length, before);
});
test("private records have no public listing routes", async () => {
  for (const path of ["/api/invoices", "/api/contact"])
    assert.equal((await fetch(base + path)).status, 404);
});
test("malformed and oversized JSON rejected", async () => {
  const malformed = await fetch(base + "/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{bad",
  });
  assert.equal(malformed.status, 400);
  const large = await post("/api/contact", {
    name: "Test",
    email: "test@example.com",
    message: "x".repeat(40000),
  });
  assert.equal(large.status, 413);
});
test("static app has security headers", async () => {
  const r = await fetch(base + "/");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.match(r.headers.get("content-security-policy"), /object-src 'none'/);
  assert.match(await r.text(), /ToolMavo/);
});
test("unknown assets return 404 rather than HTML", async () => {
  assert.equal((await fetch(base + "/missing.js")).status, 404);
});

test("submission limits return a stable localizable error code", async () => {
  const limitedServer = createApp(db).listen(0, "127.0.0.1");
  await once(limitedServer, "listening");
  try {
    const url = `http://127.0.0.1:${limitedServer.address().port}/api/contact`;
    for (let i = 0; i < 30; i++) {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Rate test",
          email: "rate@example.com",
          message: "Submission rate limit test.",
        }),
      });
      assert.equal(r.status, 201);
    }
    const blocked = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rate test",
        email: "rate@example.com",
        message: "Submission rate limit test.",
      }),
    });
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).code, "RATE_LIMITED");
  } finally {
    await new Promise((resolve) => limitedServer.close(resolve));
  }
});
