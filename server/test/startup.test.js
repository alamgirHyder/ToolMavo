import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

const cwd = new URL("../../", import.meta.url);
async function freePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
async function waitForHealth(port, child, output) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error(output());
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return await response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error("Startup timed out: " + output());
}
for (const [name, args] of [
  ["Hostinger require() loader", ["-e", "require('./server/index.js')"]],
  ["standard Node entry", ["server/index.js"]],
]) {
  test(`${name} starts against MySQL without top-level-await errors`, async () => {
    const port = await freePort();
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (output += data));
    try {
      assert.deepEqual(await waitForHealth(port, child, () => output), {
        status: "UP",
        database: "MySQL",
      });
      assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200);
      assert.doesNotMatch(output, /ERR_REQUIRE_ASYNC_MODULE/);
    } finally {
      if (child.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGTERM");
        await exited;
      }
    }
  });
}
test("require() reports missing configuration and exits unsuccessfully", async () => {
  const env = { ...process.env };
  for (const key of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"])
    delete env[key];
  const child = spawn(
    process.execPath,
    ["-e", "require('./server/index.js')"],
    { cwd, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stderr.on("data", (data) => (output += data));
  const [code] = await once(child, "exit");
  assert.notEqual(code, 0);
  assert.match(output, /Missing DB_HOST/);
  assert.doesNotMatch(output, /ERR_REQUIRE_ASYNC_MODULE/);
});
