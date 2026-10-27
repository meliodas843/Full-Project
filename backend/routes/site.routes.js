// Public site settings read by the home page.
import express from "express";
import { HERO_IMAGE_KEY, getSiteSetting } from "../utils/siteSettings.js";

const router = express.Router();

router.get("/home", async (req, res, next) => {
  try {
    return res.json({ heroImage: await getSiteSetting(HERO_IMAGE_KEY) });
  } catch (error) {
    next(error);
  }
});

export default router;
