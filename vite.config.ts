import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// In development, optionally load Manus-specific plugins if available
async function getDevPlugins() {
  if (process.env.NODE_ENV === "production") return [];
  try {
    const { jsxLocPlugin } = await import("@builder.io/vite-plugin-jsx-loc");
    const { vitePluginManusRuntime } = await import("vite-plugin-manus-runtime");
    return [jsxLocPlugin(), vitePluginManusRuntime()];
  } catch {
    return [];
  }
}

export default defineConfig(async () => {
  const devPlugins = await getDevPlugins();

  return {
    plugins: [react(), tailwindcss(), ...devPlugins],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      allowedHosts: [
        ".manuspre.computer",
        ".manus.computer",
        ".manus-asia.computer",
        ".manuscomputer.ai",
        ".manusvm.computer",
        "localhost",
        "127.0.0.1",
      ],
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
