import express from "express";
import crypto from "crypto";
import cookieParser from "cookie-parser";

// Routes
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import adminRouter from "./routes/admin.route.js";
import restaurantRouter from "./routes/restaurant.routes.js";
import categoryRouter from "./routes/category.route.js";
import menuRouter from "./routes/menu.route.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import reviewRoutes from "./routes/review.route.js";

// API Versioning
import v1Routes from "./routes/v1/index.js";

import { swaggerSpec, swaggerUiHandler } from "./docs/swagger.js";

// Import new middlewares
import createRequestLogger from "./middlewares/requestLogger.js";
import { createErrorHandler, createNotFoundHandler } from "./middlewares/errorHandler.js";
import { createHealthCheck, createLivenessProbe, createReadinessProbe } from "./middlewares/healthCheck.js";
import { metricsMiddleware, createMetricsEndpoint } from "./middlewares/metrics.js";
import { createIdempotencyMiddleware } from "./utils/idempotency.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Request logging middleware (at the top)
app.use(createRequestLogger());

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  const origin = req.headers.origin;
  if (
    origin &&
    (allowedOrigins.length === 0 || allowedOrigins.includes(origin))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.header("X-Content-Type-Options", "nosniff");
  res.header("Referrer-Policy", "no-referrer");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check endpoints
app.get("/api/health", createHealthCheck());
app.get("/api/live", createLivenessProbe());
app.get("/api/ready", createReadinessProbe());

// Metrics endpoint (Prometheus-style)
app.use(metricsMiddleware);
app.get("/api/metrics", createMetricsEndpoint());

app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/restaurants", restaurantRouter);
app.use("/api/admin", adminRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/menus", menuRouter);
app.use("/api/auditlogs", auditLogRoutes);
app.use("/api/reviews", reviewRoutes);

// API v1 routes (for future versioning)
app.use("/api/v1", v1Routes);

app.use(
  "/api/docs",
  swaggerUiHandler.serve,
  swaggerUiHandler.setup(swaggerSpec),
);

// 404 handler
app.use(createNotFoundHandler());

// Centralized error handler
app.use(createErrorHandler());

export default app;
