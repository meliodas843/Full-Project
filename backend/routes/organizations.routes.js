import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function normalizeOrganization(row) {
  let categories = [];

  if (Array.isArray(row.categories)) {
    categories = row.categories;
  } else if (row.categories) {
    try {
      const parsed = JSON.parse(row.categories);

      categories = Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      categories = String(row.categories)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    registrationNumber:
      row.registration_number,
    establishedYear:
      row.established_year,
    categories,
    category:
      categories[0] || "",
    description:
      row.description || "",
    website:
      row.website || "",
    phone:
      row.phone || "",
    address:
      row.address || "",
    logo:
      row.logo_url || "",
    logo_url:
      row.logo_url || "",
    cover:
      row.cover_url || "",
    cover_url:
      row.cover_url || "",
    verified:
      Boolean(row.is_verified),
    is_verified:
      Boolean(row.is_verified),
    followers:
      Number(row.followers_count || 0),
    followers_count:
      Number(row.followers_count || 0),
    activeEvents:
      Number(row.active_events_count || 0),
    active_events_count:
      Number(row.active_events_count || 0),
    following:
      Boolean(row.is_following),
    is_following:
      Boolean(row.is_following),
    created_at:
      row.created_at,
    updated_at:
      row.updated_at,
  };
}

function optionalAuth(req, res, next) {
  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  return authMiddleware(
    req,
    res,
    next
  );
}

router.get(
  "/",
  optionalAuth,
  async (req, res) => {
    try {
      const userId =
        req.user?.id || 0;

      const [rows] =
        await pool.query(
          `
          SELECT
            o.*,

            (
              SELECT COUNT(*)
              FROM organization_followers ofl
              WHERE ofl.organization_id = o.id
            ) AS followers_count,

            (
              SELECT COUNT(*)
              FROM events e
              WHERE e.organization_id = o.id
              AND (
                e.end_time IS NULL
                OR e.end_time >= NOW()
              )
            ) AS active_events_count,

            EXISTS(
              SELECT 1
              FROM organization_followers ofl2
              WHERE ofl2.organization_id = o.id
              AND ofl2.user_id = ?
            ) AS is_following

          FROM organizations o

          ORDER BY
            o.is_verified DESC,
            o.created_at DESC
          `,
          [userId]
        );

      return res.json({
        organizations:
          rows.map(
            normalizeOrganization
          ),
      });
    } catch (err) {
      console.error(
        "GET ORGANIZATIONS ERROR:",
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  "/public",
  optionalAuth,
  async (req, res) => {
    try {
      const userId =
        req.user?.id || 0;

      const [rows] =
        await pool.query(
          `
          SELECT
            o.*,

            (
              SELECT COUNT(*)
              FROM organization_followers ofl
              WHERE ofl.organization_id = o.id
            ) AS followers_count,

            (
              SELECT COUNT(*)
              FROM events e
              WHERE e.organization_id = o.id
              AND (
                e.end_time IS NULL
                OR e.end_time >= NOW()
              )
            ) AS active_events_count,

            EXISTS(
              SELECT 1
              FROM organization_followers ofl2
              WHERE ofl2.organization_id = o.id
              AND ofl2.user_id = ?
            ) AS is_following

          FROM organizations o

          ORDER BY
            o.is_verified DESC,
            o.created_at DESC
          `,
          [userId]
        );

      return res.json({
        organizations:
          rows.map(
            normalizeOrganization
          ),
      });
    } catch (err) {
      console.error(
        "GET PUBLIC ORGANIZATIONS ERROR:",
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  "/:id",
  optionalAuth,
  async (req, res) => {
    try {
      const organizationId =
        Number(req.params.id);

      const userId =
        req.user?.id || 0;

      if (!organizationId) {
        return res.status(400).json({
          message:
            "Invalid organization id",
        });
      }

      const [rows] =
        await pool.query(
          `
          SELECT
            o.*,

            (
              SELECT COUNT(*)
              FROM organization_followers ofl
              WHERE ofl.organization_id = o.id
            ) AS followers_count,

            (
              SELECT COUNT(*)
              FROM events e
              WHERE e.organization_id = o.id
            ) AS total_events_count,

            (
              SELECT COUNT(*)
              FROM events e
              WHERE e.organization_id = o.id
              AND (
                e.end_time IS NULL
                OR e.end_time >= NOW()
              )
            ) AS active_events_count,

            EXISTS(
              SELECT 1
              FROM organization_followers ofl2
              WHERE ofl2.organization_id = o.id
              AND ofl2.user_id = ?
            ) AS is_following

          FROM organizations o

          WHERE o.id = ?

          LIMIT 1
          `,
          [
            userId,
            organizationId,
          ]
        );

      if (!rows.length) {
        return res.status(404).json({
          message:
            "Organization not found",
        });
      }

      const organization =
        normalizeOrganization(
          rows[0]
        );

      organization.totalEvents =
        Number(
          rows[0]
            .total_events_count || 0
        );

      return res.json({
        organization,
      });
    } catch (err) {
      console.error(
        "GET ORGANIZATION ERROR:",
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  "/:id/events",
  optionalAuth,
  async (req, res) => {
    try {
      const organizationId =
        Number(req.params.id);

      if (!organizationId) {
        return res.status(400).json({
          message:
            "Invalid organization id",
        });
      }

      const [organizationRows] =
        await pool.query(
          `
          SELECT id
          FROM organizations
          WHERE id = ?
          LIMIT 1
          `,
          [organizationId]
        );

      if (
        !organizationRows.length
      ) {
        return res.status(404).json({
          message:
            "Organization not found",
        });
      }

      const [events] =
        await pool.query(
          `
          SELECT *
          FROM events
          WHERE organization_id = ?
          ORDER BY start_time DESC
          `,
          [organizationId]
        );

      return res.json({
        events,
      });
    } catch (err) {
      console.error(
        "GET ORGANIZATION EVENTS ERROR:",
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.post(
  "/:id/follow",
  authMiddleware,
  async (req, res) => {
    try {
      const organizationId =
        Number(req.params.id);

      const userId =
        Number(req.user.id);

      if (!organizationId) {
        return res.status(400).json({
          message:
            "Invalid organization id",
        });
      }

      const [organizations] =
        await pool.query(
          `
          SELECT id
          FROM organizations
          WHERE id = ?
          LIMIT 1
          `,
          [organizationId]
        );

      if (!organizations.length) {
        return res.status(404).json({
          message:
            "Organization not found",
        });
      }

      await pool.query(
        `
        INSERT IGNORE INTO organization_followers
        (
          organization_id,
          user_id
        )
        VALUES (?, ?)
        `,
        [
          organizationId,
          userId,
        ]
      );

      const [countRows] =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM organization_followers
          WHERE organization_id = ?
          `,
          [organizationId]
        );

      return res.json({
        message:
          "Organization followed",
        following: true,
        followers:
          Number(
            countRows[0]?.total || 0
          ),
      });
    } catch (err) {
      console.error(
        "FOLLOW ORGANIZATION ERROR:",
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.delete(
  "/:id/follow",
  authMiddleware,
  async (req, res) => {
    try {
      const organizationId =
        Number(req.params.id);

      const userId =
        Number(req.user.id);

      if (!organizationId) {
        return res.status(400).json({
          message:
            "Invalid organization id",
        });
      }

      await pool.query(
        `
        DELETE FROM organization_followers
        WHERE organization_id = ?
        AND user_id = ?
        `,
        [
          organizationId,
          userId,
        ]
      );

      const [countRows] =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM organization_followers
          WHERE organization_id = ?
          `,
          [organizationId]
        );

      return res.json({
        message:
          "Organization unfollowed",
        following: false,
        followers:
          Number(
            countRows[0]?.total || 0
          ),
      });
    } catch (err) {
      console.error(
        "UNFOLLOW ORGANIZATION ERROR:",
        err
      );

      return res.status(500).json({
        message: err.message,
      });
    }
  }
);

export default router;