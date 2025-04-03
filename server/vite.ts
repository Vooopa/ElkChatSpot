import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

// Livelli di logging supportati
type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Funzione di logging migliorata con supporto per diversi livelli
 * e formattazione consistente
 */
export function log(
    message: string | Error,
    source = "express",
    level: LogLevel = "info"
) {
  try {
    // Gestione degli oggetti Error
    const formattedMessage = message instanceof Error ? message.message : message;

    // Formattazione dell'orario con supporto localizzazione
    const timestamp = new Date().toISOString();

    // Diversi metodi di console in base al livello
    const logMethod = {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }[level] || console.log;

    // Output formattato
    logMethod(`${timestamp} [${source}] [${level.toUpperCase()}] ${formattedMessage}`);

    // Stack trace per errori quando necessario
    if (level === "error" && message instanceof Error && message.stack) {
      console.error(message.stack);
    }
  } catch (err) {
    // Failsafe per errori nella funzione di logging stessa
    console.error("Errore nel sistema di logging:", err);
  }
}

/**
 * Configura Vite in modalità sviluppo
 */
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: [],
  };

  try {
    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          log(`Errore critico Vite: ${msg}`, "vite", "error");
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
            __dirname,
            "..",
            "client",
            "index.html",
        );

        if (!fs.existsSync(clientTemplate)) {
          throw new Error(`Template non trovato: ${clientTemplate}`);
        }

        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        // Aggiunta di un parametro di versione per evitare il caching
        template = template.replace(
            `src="/src/main.tsx"`,
            `src="/src/main.tsx?v=${nanoid()}"`,
        );

        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        log(e as Error, "vite", "error");
        next(e);
      }
    });

    log("Vite configurato in modalità sviluppo", "vite", "info");
  } catch (error) {
    log(error as Error, "vite", "error");
    throw error;
  }
}

/**
 * Serve contenuti statici in modalità produzione
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    const error = new Error(
        `Directory di build non trovata: ${distPath}, assicurati di compilare il client prima`
    );
    log(error, "static", "error");
    throw error;
  }

  // Serve file statici
  app.use(express.static(distPath, {
    maxAge: '1d', // Cache per un giorno
    etag: true,
  }));

  // Fallback a index.html per SPA routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  log("Server configurato per servire contenuti statici dalla cartella: " + distPath, "static", "info");
}