import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { zoomGetMe, createZoomMeeting } from "../utils/zoom.js";

const router = express.Router();

// Debug endpoints that act on the shared Zoom account: admins only.
router.use(authMiddleware, roleMiddleware(["admin", "super_admin"]));

/**
 * GET /api/zoom/test
 */
router.get("/test", async (req, res) => {
  try {
    const me = await zoomGetMe();
    res.json({ ok: true, me });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/zoom/create-meeting
 */
router.post("/create-meeting", async (req, res) => {
  try {
    const { topic, start_time, duration_min } = req.body || {};
    const meeting = await createZoomMeeting({ topic, start_time, duration_min });
    res.json({ ok: true, meeting });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
