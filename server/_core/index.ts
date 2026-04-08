import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import Stripe from "stripe";
import { markSeasonEntrantPaid, getSeasonEntrantById } from "../tournament.db";
import { notifyOwner } from "./notification";
import { runSchemaHealthCheck } from "../schemaHealthCheck";
import { runAdminSeed } from "../adminSeed";
import { runMigrations } from "../runMigrations";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Stripe webhook (must be BEFORE express.json) ───────────────────────────
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" });
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Webhook] Signature verification failed:", msg);
      res.status(400).send(`Webhook Error: ${msg}`);
      return;
    }

    // Test event passthrough
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const entrantId = session.metadata?.entrant_id;
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? "";
      if (entrantId) {
        try {
          const eid = parseInt(entrantId);
          await markSeasonEntrantPaid(eid, paymentIntentId);
          console.log(`[Webhook] Season entrant ${entrantId} marked as paid`);
          // Send confirmation notification
          const entrant = await getSeasonEntrantById(eid);
          const customerEmail = session.metadata?.customer_email;
          const customerName = session.metadata?.customer_name ?? entrant?.displayName ?? "Player";
          if (customerEmail) {
            console.log(`[Email] Sending confirmation to ${customerEmail}`);
          }
          await notifyOwner({
            title: `New tournament entry: ${customerName}`,
            content: `**${customerName}** (${customerEmail ?? "no email"}) has paid the £10 entry fee and joined the BPLTC Men's Doubles Ladder 2026.\n\nEntrant ID: ${entrantId}`,
          });
        } catch (e) {
          console.error("[Webhook] Failed to mark entrant paid:", e);
        }
      }
    }

    res.json({ received: true });
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Run pending DB migrations on startup (idempotent)
    runMigrations().catch((e) =>
      console.warn("[Migrations] Unexpected error:", e)
    );
    // Non-fatal schema health check — warns in logs if columns are missing
    runSchemaHealthCheck().catch((e) =>
      console.warn("[SchemaHealthCheck] Unexpected error:", e)
    );
    // Promote hardcoded admin email addresses on every startup (idempotent)
    runAdminSeed().catch((e) =>
      console.warn("[AdminSeed] Unexpected error:", e)
    );
  });
}

startServer().catch(console.error);
