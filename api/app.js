import express from "express";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import adminRouter from "./routes/admin.route.js";
import restaurantRouter from "./routes/restaurant.routes.js";
import categoryRouter from "./routes/category.route.js";
import menuRouter from "./routes/menu.route.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import reviewRoutes from "./routes/review.route.js";
import { swaggerSpec, swaggerUiHandler } from "./docs/swagger.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

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

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.get("/api/live", (req, res) => {
  res.status(200).json({ success: true, status: "alive" });
});

app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/restaurants", restaurantRouter);
app.use("/api/admin", adminRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/menus", menuRouter);
app.use("/api/auditlogs", auditLogRoutes);
app.use("/api/reviews", reviewRoutes);
app.use(
  "/api/docs",
  swaggerUiHandler.serve,
  swaggerUiHandler.setup(swaggerSpec),
);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "internal server error";

  return res.status(statusCode).json({
    success: false,
    requestId: req.requestId,
    statusCode,
    message,
  });
});

export default app;
