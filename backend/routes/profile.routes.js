import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function getUserId(req) {
  const userId = Number(
    req.user?.id ??
      req.user?.userId ??
      req.user?.user_id
  );

  return Number.isFinite(userId)
    ? userId
    : null;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizePhone(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

function normalizeInterests(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      String(item ?? "").trim()
    )
    .filter(Boolean);
}

function parseInterests(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function formatUser(user) {
  return {
    id: user.id,
    email: user.email || "",
    company_name: user.company_name || "",
    company: user.company_name || "",
    organization: user.company_name || "",
    phone: user.phone || "",
    firstName: user.first_name || "",
    first_name: user.first_name || "",
    lastName: user.last_name || "",
    last_name: user.last_name || "",
    job_title: user.job_title || "",
    jobTitle: user.job_title || "",
    interests: parseInterests(
      user.interests
    ),
    professional_interests:
      parseInterests(
        user.interests
      ),
    professionalInterests:
      parseInterests(
        user.interests
      ),
    role: user.role || "",
    avatar_url:
      user.avatar_url || null,
    created_at:
      user.created_at || null,
  };
}

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            "Invalid token payload",
        });
      }

      const [rows] =
        await pool.query(
          `
          SELECT
            id,
            email,
            company_name,
            phone,
            first_name,
            last_name,
            job_title,
            interests,
            role,
            avatar_url,
            created_at
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [userId]
        );

      if (!rows.length) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.status(200).json({
        user: formatUser(rows[0]),
      });
    } catch (err) {
      console.error(
        "GET PROFILE ERROR:",
        err
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

router.put(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            "Invalid token payload",
        });
      }

      const firstName =
        normalizeText(
          req.body?.firstName ??
            req.body?.first_name
        );

      const lastName =
        normalizeText(
          req.body?.lastName ??
            req.body?.last_name
        );

      const companyName =
        normalizeText(
          req.body?.company_name ??
            req.body?.company ??
            req.body?.organization
        );

      const phone =
        normalizePhone(
          req.body?.phone
        );

      const jobTitle =
        normalizeText(
          req.body?.job_title ??
            req.body?.jobTitle
        );

      const interests =
        normalizeInterests(
          req.body?.interests ??
            req.body
              ?.professional_interests ??
            req.body
              ?.professionalInterests
        );

      if (!firstName) {
        return res.status(400).json({
          message:
            "First name is required",
        });
      }

      if (!lastName) {
        return res.status(400).json({
          message:
            "Last name is required",
        });
      }

      if (!companyName) {
        return res.status(400).json({
          message:
            "Organization is required",
        });
      }

      if (
        !/^\d{8}$/.test(phone)
      ) {
        return res.status(400).json({
          message:
            "Phone number must contain 8 digits",
        });
      }

      if (!jobTitle) {
        return res.status(400).json({
          message:
            "Job title is required",
        });
      }

      if (!interests.length) {
        return res.status(400).json({
          message:
            "Select at least one professional interest",
        });
      }

      const [existing] =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [userId]
        );

      if (!existing.length) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      await pool.query(
        `
        UPDATE users
        SET
          company_name = ?,
          phone = ?,
          first_name = ?,
          last_name = ?,
          job_title = ?,
          interests = ?
        WHERE id = ?
        `,
        [
          companyName,
          phone,
          firstName,
          lastName,
          jobTitle,
          JSON.stringify(interests),
          userId,
        ]
      );

      const [rows] =
        await pool.query(
          `
          SELECT
            id,
            email,
            company_name,
            phone,
            first_name,
            last_name,
            job_title,
            interests,
            role,
            avatar_url,
            created_at
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [userId]
        );

      if (!rows.length) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.status(200).json({
        message:
          "Profile updated successfully",
        user: formatUser(rows[0]),
      });
    } catch (err) {
      console.error(
        "UPDATE PROFILE ERROR:",
        err
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

export default router;