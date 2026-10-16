import { createDatabase } from "./db.js";
import { startServer } from "./runtime.js";

let db;
// Hostinger loads this module with require(): no top-level await in this graph.
function start() {
  db = createDatabase();
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0)
    throw Error("Invalid TRUST_PROXY_HOPS");
  const runtime = startServer(db, {
    port: Number(process.env.PORT || 8080),
    trustProxy: proxyHops || false,
  });
  runtime.server.on("error", failStartup);
  function shutdown() {
    runtime
      .close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
async function failStartup(error) {
  console.error("ToolMavo startup failed:", error.code || error.message);
  await db?.close().catch(() => {});
  process.exitCode = 1;
}
try {
  start();
} catch (error) {
  failStartup(error);
}
