import express from "express";
import {
  google,
  signin,
  signup,
  signout,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// ===============================================================================
// 🔐 Auth Routes
// ===============================================================================
// Scope:
// - User authentication & session management
// - Public signup and login
// - Secure token-based authentication
//
// Security:
// - JWT-based authentication
// - HTTP-only cookies
//
// ===============================================================================

// ===============================================================================
// 🔷 POST /api/auth/signup
// 🔷 POST /api/auth/signin
// 🔷 POST /api/auth/google
// 🔷 POST /api/auth/signout
// ===============================================================================
// Purpose:
// - Handle all authentication-related actions
//
// ===============================================================================

// ===============================================================================
// 🔷 POST /api/auth/signup
// ===============================================================================

router.post("/signup", signup);

// ===============================================================================
// 🔷 POST /api/auth/signin
// ===============================================================================
router.post("/signin", signin);

// ===============================================================================
// 🔷 POST /api/auth/google
// ===============================================================================
router.post("/google", google);

// ===============================================================================
// 🔷 POST /api/auth/signout
// ===============================================================================
router.post("/signout", verifyToken, signout);

export default router;
