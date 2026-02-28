/**
 * API Versioning - V1 Routes
 * 
 * This file organizes all v1 API routes under /api/v1 prefix
 * 
 * Versioning benefits:
 * - Backward compatibility when making breaking changes
 * - Smooth transitions for API consumers
 * - Clear deprecation path
 */

import { Router } from "express";
import authRoutes from "../auth.route.js";
import userRoutes from "../user.route.js";
import restaurantRoutes from "../restaurant.routes.js";
import categoryRoutes from "../category.route.js";
import menuRoutes from "../menu.route.js";
import reviewRoutes from "../review.route.js";
import adminRoutes from "../admin.route.js";
import auditLogRoutes from "../auditLog.routes.js";

const router = Router();

// Health check (no versioning needed)
router.get("/health", (req, res) => {
  res.json({ status: "ok", version: "v1" });
});

// Mount all v1 routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/categories", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/reviews", reviewRoutes);
router.use("/admin", adminRoutes);
router.use("/auditlogs", auditLogRoutes);

export default router;
