import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
        ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
          ),
        ]
        : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "/webpage/src": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    hmr: {
      overlay: false,
    },
    proxy: {
      // Questo è il punto importante: configura il proxy per usare il percorso personalizzato
      "/api/socket.io": {
        target: 'http://127.0.0.1:3000/api',
        ws: true,
        changeOrigin: true,
      },
      // Se hai anche altre API
      '/api': {
        target: 'http://127.0.0.1:3000/api',
        changeOrigin: true,
      },
    },
    logLevel: 'info',
    clearScreen: false,
  }
});
