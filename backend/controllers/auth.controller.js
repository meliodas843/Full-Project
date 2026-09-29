import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev_secret_change_me";

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
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
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function toClientUser(user) {
  return {
    id: user.id,
    email: user.email ?? null,
    role: user.role ?? "user",

    company_name: user.company_name ?? null,
    companyName: user.company_name ?? null,

    phone: user.phone ?? null,

    firstName: user.first_name ?? null,
    first_name: user.first_name ?? null,

    lastName: user.last_name ?? null,
    last_name: user.last_name ?? null,

    position: user.job_title ?? null,
    jobTitle: user.job_title ?? null,
    job_title: user.job_title ?? null,

    gender: user.gender ?? null,

    accountType: user.account_type ?? "individual",
    account_type: user.account_type ?? "individual",

    avatar_url: user.avatar_url ?? null,

    interests: parseInterests(user.interests),
  };
}

export const register = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    const password = String(
      req.body?.password || ""
    );

    const companyName = String(
      req.body?.company_name ||
        req.body?.companyName ||
        ""
    ).trim();

    const firstName = String(
      req.body?.first_name ||
        req.body?.firstName ||
        ""
    ).trim();

    const lastName = String(
      req.body?.last_name ||
        req.body?.lastName ||
        ""
    ).trim();

    const phone = String(
      req.body?.phone || ""
    ).trim();

    const jobTitle = String(
      req.body?.job_title ||
        req.body?.jobTitle ||
        req.body?.position ||
        ""
    ).trim();

    const gender = String(
      req.body?.gender || ""
    ).trim();

    const accountType =
      req.body?.account_type === "organization" ||
      req.body?.accountType === "organization"
        ? "organization"
        : "individual";

    const interests = Array.isArray(
      req.body?.interests
    )
      ? req.body.interests
          .map((item) =>
            String(item).trim()
          )
          .filter(Boolean)
      : [];

    if (!email) {
      return res.status(400).json({
        message: "Email required",
      });
    }

    if (!password) {
      return res.status(400).json({
        message: "Password required",
      });
    }

    if (password.length < 10) {
      return res.status(400).json({
        message:
          "Password must be at least 10 characters",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain an uppercase letter",
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain a lowercase letter",
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain a number",
      });
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain a special character",
      });
    }

    const [exists] = await pool.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [email]
    );

    if (exists.length) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const [result] = await pool.query(
      `
        INSERT INTO users
        (
          company_name,
          job_title,
          interests,
          email,
          password,
          role,
          phone,
          first_name,
          last_name,
          gender,
          account_type
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          'user',
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        companyName || null,
        jobTitle || null,
        JSON.stringify(interests),
        email,
        hashedPassword,
        phone || null,
        firstName || null,
        lastName || null,
        gender || null,
        accountType,
      ]
    );

    const [rows] = await pool.query(
      `
        SELECT *
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [result.insertId]
    );

    if (!rows.length) {
      return res.status(500).json({
        message:
          "User created but could not be loaded",
      });
    }

    const user = rows[0];

    return res.status(201).json({
      user: toClientUser(user),
      token: signToken(user),
    });
  } catch (err) {
    console.error(
      "REGISTER ERROR:",
      err
    );

    if (
      err?.code === "ER_DUP_ENTRY"
    ) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    return res.status(500).json({
      message:
        err?.sqlMessage ||
        err?.message ||
        "Internal Server Error",

      code:
        err?.code || null,
    });
  }
};