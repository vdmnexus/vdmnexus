import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { waitlistRouter } from "./routes/waitlist.js";
import { authRouter } from "./routes/auth.js";
import { employeesRouter } from "./routes/employees.js";
import { skillsRouter } from "./routes/skills.js";
import { chatRouter } from "./routes/chat.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "https://vdmnexus.com",
      "https://www.vdmnexus.com",
      "https://vdmvastgoed.vdmnexus.com",
      "https://deparmentier.vdmnexus.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check
app.get("/", (c) => c.json({ name: "VDM Nexus API", version: "0.1.0", status: "ok" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/auth", authRouter);
app.route("/waitlist", waitlistRouter);
app.route("/employees", employeesRouter);
app.route("/skills", skillsRouter);
app.route("/chat", chatRouter);

// Start
const port = parseInt(process.env.PORT ?? "4000");

console.log(`VDM Nexus API running on port ${port}`);
serve({ fetch: app.fetch, port });
