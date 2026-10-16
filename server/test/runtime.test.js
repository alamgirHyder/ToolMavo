import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { startServer } from "../runtime.js";
const logger = { log() {}, error() {} };
async function running(db, options = {}) {
  const runtime = startServer(db, {
    port: 0,
    host: "127.0.0.1",
    logger,
    ...options,
  });
  await once(runtime.server, "listening");
  return {
    ...runtime,
    url: `http://127.0.0.1:${runtime.server.address().port}`,
  };
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
test("listen is called immediately while database initialization remains pending", async () => {
  let finish;
  let writes = 0;
  const db = {
    initialize: () => new Promise((resolve) => (finish = resolve)),
    health: async () => {},
    close: async () => {},
    saveContact: async () => writes++,
  };
  const started = Date.now();
  const runtime = await running(db);
  try {
    assert.ok(Date.now() - started < 3000);
    assert.equal((await fetch(runtime.url + "/")).status, 200);
    const down = await fetch(runtime.url + "/api/health");
    assert.equal(down.status, 503);
    assert.equal((await down.json()).status, "DOWN");
    const rejected = await fetch(runtime.url + "/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        email: "test@example.com",
        message: "Database pending test.",
      }),
    });
    assert.equal(rejected.status, 503);
    assert.equal(writes, 0);
    finish();
    await pause(10);
    const up = await fetch(runtime.url + "/api/health");
    assert.equal(up.status, 200);
    assert.equal((await up.json()).status, "UP");
  } finally {
    finish();
    await runtime.close();
  }
});
test("DNS failure keeps database unavailable, logs guidance and recovers on retry", async () => {
  let attempts = 0,
    recover = false;
  const logs = [];
  const runtime = await running(
    {
      initialize: async () => {
        if (++attempts && !recover)
          throw Object.assign(Error("private hostname"), { code: "ENOTFOUND" });
      },
      health: async () => {},
      close: async () => {},
    },
    {
      retryDelay: 100,
      logger: {
        log() {},
        error(...parts) {
          logs.push(parts.join(" "));
        },
      },
    },
  );
  try {
    assert.equal((await fetch(runtime.url + "/api/health")).status, 503);
    assert.equal((await fetch(runtime.url + "/")).status, 200);
    assert.ok(logs.some((line) => line.includes("DB_HOST")));
    assert.ok(logs.every((line) => !line.includes("private hostname")));
    recover = true;
    for (let i = 0; i < 30; i++) {
      if ((await fetch(runtime.url + "/api/health")).status === 200) break;
      await pause(20);
    }
    assert.equal((await fetch(runtime.url + "/api/health")).status, 200);
  } finally {
    await runtime.close();
  }
});
