import app from "./app";
import { logger } from "./lib/logger";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";

async function startServer() {
  const port = 3000;

  // Set environment variables required by vite.config.ts
  process.env.PORT = "3000";
  process.env.BASE_PATH = process.env.BASE_PATH || "/";

  if (process.env.NODE_ENV !== "production") {
    logger.info("Setting up Vite dev server in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      configFile: path.resolve(process.cwd(), "artifacts/sus-tabagismo/vite.config.ts"),
    });
    app.use(vite.middlewares);
  } else {
    logger.info("Serving production static files...");
    const distPath = path.resolve(process.cwd(), "artifacts/sus-tabagismo/dist/public");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening on port");
  });
}

startServer().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
