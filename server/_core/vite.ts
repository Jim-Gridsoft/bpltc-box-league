import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

// setupVite is only called in development.
// It dynamically imports vite so that the production bundle (built with esbuild
// --packages=external) never references vite at all.
export async function setupVite(app: Express, server: Server) {
  // Dynamic imports keep vite out of the production bundle entirely.
  const { createServer: createViteServer } = await import("vite");
  const { nanoid } = await import("nanoid");

  const projectRoot = path.resolve(import.meta.dirname, "../..");

  const vite = await createViteServer({
    // Let vite discover vite.config.ts automatically — no static import needed.
    configFile: path.join(projectRoot, "vite.config.ts"),
    root: path.join(projectRoot, "client"),
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(projectRoot, "client", "index.html");

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production the server bundle is at dist/index.js, so import.meta.dirname === dist/
  // The client build is at dist/public/
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
