import express from "express";
import { getNews, createNews } from "../controllers/news.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/", getNews);
router.post("/", authMiddleware, roleMiddleware(["super_admin"]), createNews);

export default router;
