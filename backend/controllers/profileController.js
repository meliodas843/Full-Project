import pool from "../db.js";

function getUserId(req) {
  const userId = Number(req.user?.id ?? req.user?.userId ?? req.user?.user_id);

  return Number.isFinite(userId) ? userId : null;
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
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
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

    interests: parseInterests(user.interests),

    professional_interests: parseInterests(user.interests),

    professionalInterests: parseInterests(user.interests),

    role: user.role || "user",

    avatar_url: user.avatar_url || "",
    avatar: user.avatar_url || "",
    profile_image: user.avatar_url || "",
    profile_image_url: user.avatar_url || "",

    created_at: user.created_at || null,
  };
}

async function getUserById(userId) {
  const [rows] = await pool.query(
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
    [userId],
  );

  return rows[0] || null;
}

export const getMyProfile = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: formatUser(user),
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
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    const firstName = normalizeText(
      req.body?.firstName ?? req.body?.first_name,
    );

    const lastName = normalizeText(req.body?.lastName ?? req.body?.last_name);

    const companyName = normalizeText(
      req.body?.company_name ?? req.body?.company ?? req.body?.organization,
    );

    const phone = normalizePhone(req.body?.phone);

    const jobTitle = normalizeText(req.body?.job_title ?? req.body?.jobTitle);

    const interests = normalizeInterests(
      req.body?.interests ??
        req.body?.professional_interests ??
        req.body?.professionalInterests,
    );

    if (!firstName) {
      return res.status(400).json({
        message: "First name is required",
      });
    }

    if (!lastName) {
      return res.status(400).json({
        message: "Last name is required",
      });
    }

    if (!companyName) {
      return res.status(400).json({
        message: "Organization is required",
      });
    }

    if (!/^\d{8}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone number must contain 8 digits",
      });
    }

    if (!jobTitle) {
      return res.status(400).json({
        message: "Job title is required",
      });
    }

    if (!interests.length) {
      return res.status(400).json({
        message: "Select at least one professional interest",
      });
    }

    const existingUser = await getUserById(userId);

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    let avatarUrl = existingUser.avatar_url || "";

    if (req.file) {
      avatarUrl = `/uploads/profile/${req.file.filename}`;
    } else {
      const bodyAvatar = normalizeText(
        req.body?.avatar_url ??
          req.body?.avatar ??
          req.body?.profile_image ??
          req.body?.profile_image_url,
      );

      if (bodyAvatar) {
        avatarUrl = bodyAvatar;
      }
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
        interests = ?,
        avatar_url = ?
      WHERE id = ?
      `,
      [
        firstName,
        lastName,
        companyName,
        phone,
        jobTitle,
        JSON.stringify(interests),
        avatarUrl,
        userId,
      ],
    );

    const updatedUser = await getUserById(userId);

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: formatUser(updatedUser),
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
