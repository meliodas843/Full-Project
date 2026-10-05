import express from "express";

import pool from "../db.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function parseCategories(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value)
      .split(",")

      .map((item) => item.trim())

      .filter(Boolean);
  }
}

function normalizeOrganization(row) {
  if (!row) {
    return null;
  }

  const categories = parseCategories(row.categories);

  return {
    id: row.id,

    user_id: row.user_id,

    userId: row.user_id,

    name: row.name || "",

    registrationNumber: row.registration_number || "",

    registration_number: row.registration_number || "",

    establishedYear: row.established_year || "",

    established_year: row.established_year || "",

    categories,

    category: categories[0] || "",

    description: row.description || "",

    website: row.website || "",

    email: row.email || "",

    phone: row.phone || "",

    address: row.address || "",

    facebook: row.facebook || "",

    linkedin: row.linkedin || "",

    contact_person: row.contact_person || "",

    contactPerson: row.contact_person || "",

    industry: row.industry || "",

    employee_count: row.employee_count || "",

    employeeCount: row.employee_count || "",

    logo: row.logo_url || "",

    logo_url: row.logo_url || "",

    cover: row.cover_url || "",

    cover_url: row.cover_url || "",

    verified: Boolean(row.is_verified),

    is_verified: Boolean(row.is_verified),

    followers: Number(row.followers_count || 0),

    followers_count: Number(row.followers_count || 0),

    activeEvents: Number(row.active_events_count || 0),

    active_events_count: Number(row.active_events_count || 0),

    totalEvents: Number(row.total_events_count || 0),

    total_events_count: Number(row.total_events_count || 0),

    following: Boolean(row.is_following),

    is_following: Boolean(row.is_following),

    created_at: row.created_at,

    updated_at: row.updated_at,
  };
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    req.user = null;

    return next();
  }

  return authMiddleware(req, res, next);
}

router.get(
  "/",

  optionalAuth,

  async (req, res) => {
    try {
      const userId = Number(req.user?.id) || 0;

      const [rows] = await pool.query(
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

        [userId],
      );

      return res.json({
        organizations: rows.map(normalizeOrganization),
      });
    } catch (err) {
      console.error("GET ORGANIZATIONS ERROR:", err);

      return res.status(500).json({
        message: err.message || "Failed to load organizations",
      });
    }
  },
);

router.get(
  "/public",

  optionalAuth,

  async (req, res) => {
    try {
      const userId = Number(req.user?.id) || 0;

      const [rows] = await pool.query(
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

        [userId],
      );

      return res.json({
        organizations: rows.map(normalizeOrganization),
      });
    } catch (err) {
      console.error("GET PUBLIC ORGANIZATIONS ERROR:", err);

      return res.status(500).json({
        message: err.message || "Failed to load organizations",
      });
    }
  },
);

router.get(
  "/me",

  authMiddleware,

  async (req, res) => {
    try {
      const userId = Number(req.user?.id);

      if (!userId) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      const [rows] = await pool.query(
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



            ) AS active_events_count



          FROM organizations o



          WHERE o.user_id = ?



          LIMIT 1



          `,

        [userId],
      );

      if (!rows.length) {
        return res.json({ organization: null });
      }

      const organization = normalizeOrganization(rows[0]);

      return res.json({
        organization,
      });
    } catch (err) {
      console.error("GET MY ORGANIZATION ERROR:", err);

      return res.status(500).json({
        message: err.message || "Failed to load organization",
      });
    }
  },
);

router.put("/me", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const body = req.body || {};

    const name = String(
      body.name ?? body.organizationName ?? body.organization_name ?? "",
    ).trim();

    if (!name)
      return res.status(400).json({ message: "Organization name is required" });

    const registrationNumber = String(
      body.registrationNumber ?? body.registration_number ?? "",
    ).trim();

    const yearRaw = body.establishedYear ?? body.established_year ?? null;

    const establishedYear =
      yearRaw === "" || yearRaw == null ? null : Number(yearRaw);

    if (
      establishedYear !== null &&
      (!Number.isInteger(establishedYear) ||
        establishedYear < 1000 ||
        establishedYear > 9999)
    ) {
      return res.status(400).json({ message: "Invalid established year" });
    }

    let categories = body.categories ?? body.category ?? [];

    if (!Array.isArray(categories))
      categories = String(categories || "")
        .split(",")

        .map((v) => v.trim())

        .filter(Boolean);

    categories = categories.map((v) => String(v).trim()).filter(Boolean);

    const description = String(body.description ?? "").trim();

    const website = String(body.website ?? "").trim();

    const email = String(body.email ?? "").trim();

    const phone = String(body.phone ?? "").trim();

    const address = String(body.address ?? "").trim();

    const facebook = String(body.facebook ?? "").trim();

    const linkedin = String(body.linkedin ?? "").trim();

    const contactPerson = String(
      body.contact_person ?? body.contactPerson ?? "",
    ).trim();

    const industry = String(body.industry ?? "").trim();

    const employeeCount = String(
      body.employee_count ?? body.employeeCount ?? "",
    ).trim();

    const logoUrl = String(
      body.logo_url ?? body.logo ?? body.logoUrl ?? "",
    ).trim();

    const coverUrl = String(
      body.cover_url ?? body.cover ?? body.coverUrl ?? "",
    ).trim();

    const [existing] = await pool.query(
      "SELECT id FROM organizations WHERE user_id=? LIMIT 1",

      [userId],
    );

    let organizationId;

    if (existing.length) {
      organizationId = existing[0].id;

      await pool.query(
        `UPDATE organizations SET
    name=?,
    registration_number=?,
    established_year=?,
    categories=?,
    description=?,
    website=?,
    email=?,
    phone=?,
    address=?,
    facebook=?,
    linkedin=?,
    contact_person=?,
    industry=?,
    employee_count=?,
    logo_url=?,
    cover_url=?
   WHERE id=? AND user_id=?`,
        [
          name,
          registrationNumber || null,
          establishedYear,
          JSON.stringify(categories),
          description || null,
          website || null,
          email || null,
          phone || null,
          address || null,
          facebook || null,
          linkedin || null,
          contactPerson || null,
          industry || null,
          employeeCount || null,
          logoUrl || null,
          coverUrl || null,
          organizationId,
          userId,
        ],
      );
    } else {
      const [result] = await pool.query(
        `INSERT INTO organizations
   (
     user_id,
     name,
     registration_number,
     established_year,
     categories,
     description,
     website,
     email,
     phone,
     address,
     facebook,
     linkedin,
     contact_person,
     industry,
     employee_count,
     logo_url,
     cover_url
   )
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          userId,
          name,
          registrationNumber || null,
          establishedYear,
          JSON.stringify(categories),
          description || null,
          website || null,
          email || null,
          phone || null,
          address || null,
          facebook || null,
          linkedin || null,
          contactPerson || null,
          industry || null,
          employeeCount || null,
          logoUrl || null,
          coverUrl || null,
        ],
      );

      organizationId = result.insertId;
    }

    const [rows] = await pool.query(
      `SELECT o.*,

       (SELECT COUNT(*) FROM organization_followers f WHERE f.organization_id=o.id) followers_count,

       (SELECT COUNT(*) FROM events e WHERE e.organization_id=o.id) total_events_count,

       (SELECT COUNT(*) FROM events e WHERE e.organization_id=o.id AND (e.end_time IS NULL OR e.end_time>=NOW())) active_events_count

       FROM organizations o WHERE o.id=? AND o.user_id=? LIMIT 1`,

      [organizationId, userId],
    );

    return res.json({
      message: existing.length
        ? "Organization updated"
        : "Organization created",

      organization: normalizeOrganization(rows[0]),
    });
  } catch (err) {
    console.error("SAVE MY ORGANIZATION ERROR:", err);

    return res

      .status(500)

      .json({ message: err.message || "Failed to save organization" });
  }
});

router.get(
  "/:id",

  optionalAuth,

  async (req, res) => {
    try {
      const organizationId = Number(req.params.id);

      const userId = Number(req.user?.id) || 0;

      if (!organizationId) {
        return res.status(400).json({
          message: "Invalid organization id",
        });
      }

      const [rows] = await pool.query(
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

        [userId, organizationId],
      );

      if (!rows.length) {
        return res.status(404).json({
          message: "Organization not found",
        });
      }

      const organization = normalizeOrganization(rows[0]);

      return res.json({
        organization,
      });
    } catch (err) {
      console.error("GET ORGANIZATION ERROR:", err);

      return res.status(500).json({
        message: err.message || "Failed to load organization",
      });
    }
  },
);

router.get(
  "/:id/events",

  optionalAuth,

  async (req, res) => {
    try {
      const organizationId = Number(req.params.id);

      if (!organizationId) {
        return res.status(400).json({
          message: "Invalid organization id",
        });
      }

      const [organizationRows] = await pool.query(
        `



          SELECT id



          FROM organizations



          WHERE id = ?



          LIMIT 1



          `,

        [organizationId],
      );

      if (!organizationRows.length) {
        return res.status(404).json({
          message: "Organization not found",
        });
      }

      const [events] = await pool.query(
        `



          SELECT *



          FROM events



          WHERE organization_id = ?



          ORDER BY start_time DESC



          `,

        [organizationId],
      );

      return res.json({
        events,
      });
    } catch (err) {
      console.error("GET ORGANIZATION EVENTS ERROR:", err);

      return res.status(500).json({
        message: err.message || "Failed to load organization events",
      });
    }
  },
);

router.post(
  "/:id/follow",

  authMiddleware,

  async (req, res) => {
    try {
      const organizationId = Number(req.params.id);

      const userId = Number(req.user?.id);

      if (!organizationId) {
        return res.status(400).json({
          message: "Invalid organization id",
        });
      }

      if (!userId) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      const [organizations] = await pool.query(
        `



          SELECT id



          FROM organizations



          WHERE id = ?



          LIMIT 1



          `,

        [organizationId],
      );

      if (!organizations.length) {
        return res.status(404).json({
          message: "Organization not found",
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

        [organizationId, userId],
      );

      const [countRows] = await pool.query(
        `



          SELECT



            COUNT(*) AS total



          FROM organization_followers



          WHERE organization_id = ?



          `,

        [organizationId],
      );

      return res.json({
        message: "Organization followed",

        following: true,

        followers: Number(countRows[0]?.total || 0),
      });
    } catch (err) {
      console.error("FOLLOW ORGANIZATION ERROR:", err);

      return res.status(500).json({
        message: err.message || "Failed to follow organization",
      });
    }
  },
);

router.delete(
  "/:id/follow",

  authMiddleware,

  async (req, res) => {
    try {
      const organizationId = Number(req.params.id);

      const userId = Number(req.user?.id);

      if (!organizationId) {
        return res.status(400).json({
          message: "Invalid organization id",
        });
      }

      if (!userId) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      await pool.query(
        `



        DELETE



        FROM organization_followers



        WHERE organization_id = ?



        AND user_id = ?



        `,

        [organizationId, userId],
      );

      const [countRows] = await pool.query(
        `



          SELECT



            COUNT(*) AS total



          FROM organization_followers



          WHERE organization_id = ?



          `,

        [organizationId],
      );

      return res.json({
        message: "Organization unfollowed",

        following: false,

        followers: Number(countRows[0]?.total || 0),
      });
    } catch (err) {
      console.error("UNFOLLOW ORGANIZATION ERROR:", err);

      return res.status(500).json({
        message: err.message || "Failed to unfollow organization",
      });
    }
  },
);

export default router;
