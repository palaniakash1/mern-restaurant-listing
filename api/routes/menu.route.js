import express from "express";
import { createMenu } from "../controllers/menu.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.post("/create", verifyToken, createMenu); // create new category
// router.get("/", getCategories); // get all categories

export default router;
