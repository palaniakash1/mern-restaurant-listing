import express from "express";
import {
  google,
  signin,
  signup,
  signout,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

// =================================
// POST endpoints / AUTH routes
// =================================
router.post("/signup", signup);
router.post("/signin", signin);
router.post("/google", google);
router.post("/signout", verifyToken, signout);

export default router;
