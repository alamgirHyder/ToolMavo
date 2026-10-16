import { createApp } from "./app.js";

export function startServer(
  db,
  {
    port = 8080,
    host = "0.0.0.0",
    trustProxy = false,
    retryDelay = 10000,
    logger = console,
  } = {},
) {
  let ready = false,
    stopped = false,
    retryTimer;
  const app = createApp(db, { trustProxy, isReady: () => ready });
  // Hostinger requires listen() immediately, not after a database/DNS request.
  const server = app.listen(port, host, () =>
    logger.log("ToolMavo HTTP server is listening."),
  );
  async function initialize() {
    try {
      await db.initialize();
      if (stopped) return;
      ready = true;
      logger.log("ToolMavo database ready: MySQL.");
    } catch (error) {
      if (stopped) return;
      ready = false;
      const code = error.code || "INITIALIZATION_FAILED";
      logger.error("ToolMavo database unavailable:", code);
      if (code === "ENOTFOUND")
        logger.error(
          "Check DB_HOST: use the MySQL hostname from hPanel, without https://, paths or spaces.",
        );
      if (code === "ER_ACCESS_DENIED_ERROR")
        logger.error(
          "Check DB_USER, DB_PASSWORD and database user permissions in hPanel.",
        );
      retryTimer = setTimeout(initialize, retryDelay);
      retryTimer.unref();
    }
  }
  initialize();
  async function close() {
    stopped = true;
    clearTimeout(retryTimer);
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
  return { server, close };
}
