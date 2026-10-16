import { createDatabase } from "./db.js";
import { createApp } from "./app.js";

const db = createDatabase();
await db.initialize();
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0)
  throw Error("Invalid TRUST_PROXY_HOPS");
const app = createApp(db, { trustProxy: proxyHops || false });
const server = app.listen(Number(process.env.PORT || 8080), "0.0.0.0", () =>
  console.log("ToolMavo is listening. Database: MySQL."),
);
async function shutdown() {
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
