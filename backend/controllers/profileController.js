import pool from "../db.js";

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
    .map((item) => String(item ?? "").trim())
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
    company_name: user.company_name || "",
    job_title: user.job_title || "",
    interests: parseInterests(user.interests),
    email: user.email || "",
    role: user.role || "user",
    phone: user.phone || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    avatar_url: user.avatar_url || null,
    created_at: user.created_at || null,
  };
}

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `
      SELECT
        id,
        company_name,
        job_title,
        interests,
        email,
        role,
        phone,
        first_name,
        last_name,
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
    console.error("GET PROFILE ERROR:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      firstName,
      first_name,
      lastName,
      last_name,
      company_name,
      phone,
      job_title,
      interests,
    } = req.body;

    const normalizedFirstName = normalizeText(
      firstName ?? first_name
    );

    const normalizedLastName = normalizeText(
      lastName ?? last_name
    );

    const normalizedCompanyName = normalizeText(
      company_name
    );

    const normalizedPhone = normalizePhone(phone);

    const normalizedJobTitle = normalizeText(
      job_title
    );

    const normalizedInterests =
      normalizeInterests(interests);

    if (!normalizedFirstName) {
      return res.status(400).json({
        message: "First name is required",
      });
    }

    if (!normalizedLastName) {
      return res.status(400).json({
        message: "Last name is required",
      });
    }

    if (!/^\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({
        message: "Phone number must contain 8 digits",
      });
    }

    if (!normalizedCompanyName) {
      return res.status(400).json({
        message: "Organization is required",
      });
    }

    if (!normalizedJobTitle) {
      return res.status(400).json({
        message: "Job title is required",
      });
    }

    if (!normalizedInterests.length) {
      return res.status(400).json({
        message:
          "Select at least one professional interest",
      });
    }

    const [existing] = await pool.query(
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
        first_name = ?,
        last_name = ?,
        company_name = ?,
        phone = ?,
        job_title = ?,
        interests = ?
      WHERE id = ?
      `,
      [
        normalizedFirstName,
        normalizedLastName,
        normalizedCompanyName,
        normalizedPhone,
        normalizedJobTitle,
        JSON.stringify(normalizedInterests),
        userId,
      ]
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        company_name,
        job_title,
        interests,
        email,
        role,
        phone,
        first_name,
        last_name,
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
      message: "Profile updated successfully",
      user: formatUser(rows[0]),
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};