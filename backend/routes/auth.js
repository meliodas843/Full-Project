import express from "express";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import pool from "../db.js";

import { OAuth2Client } from "google-auth-library";

const router = express.Router();

const DEFAULT_ORGANIZATION_LOGOS = [
  "/registra-default-images/logos/logo-color-1-example.svg",

  "/registra-default-images/logos/logo-color-2-example.svg",

  "/registra-default-images/logos/logo-color-3-example.svg",

  "/registra-default-images/logos/logo-color-4-example.svg",

  "/registra-default-images/logos/logo-color-5-example.svg",

  "/registra-default-images/logos/logo-color-6-example.svg",
];

const DEFAULT_ORGANIZATION_COVERS = [
  "/registra-default-images/org-covers/org-cover-1.svg",

  "/registra-default-images/org-covers/org-cover-2.svg",

  "/registra-default-images/org-covers/org-cover-3.svg",
];

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDefaultOrganizationLogo() {
  return randomFrom(DEFAULT_ORGANIZATION_LOGOS);
}

function randomDefaultOrganizationCover() {
  return randomFrom(DEFAULT_ORGANIZATION_COVERS);
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    },
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

    lastName: user.last_name ?? null,

    position: user.job_title ?? null,

    job_title: user.job_title ?? null,

    gender: user.gender ?? null,

    accountType: user.account_type ?? "individual",

    account_type: user.account_type ?? "individual",

    avatar_url: user.avatar_url ?? null,

    interests: parseInterests(user.interests),
  };
}

router.post(
  "/register",

  async (req, res) => {
    let connection = null;

    try {
      const email = String(req.body?.email || "")
        .trim()

        .toLowerCase();

      const password = String(req.body?.password || "");

      const accountType =
        req.body?.accountType === "organization" ||
        req.body?.account_type === "organization"
          ? "organization"
          : "individual";

      const firstName = String(
        req.body?.firstName || req.body?.first_name || "",
      ).trim();

      const lastName = String(
        req.body?.lastName || req.body?.last_name || "",
      ).trim();

      const phone = String(req.body?.phone || "").trim();

      const jobTitle = String(
        req.body?.position || req.body?.jobTitle || req.body?.job_title || "",
      ).trim();

      const gender = String(req.body?.gender || "").trim();

      const companyName = String(
        req.body?.companyName ||
          req.body?.company_name ||
          req.body?.organization?.name ||
          "",
      ).trim();

      const interests = Array.isArray(req.body?.interests)
        ? req.body.interests

            .map((item) => String(item).trim())

            .filter(Boolean)
        : [];

      const organization =
        req.body?.organization && typeof req.body.organization === "object"
          ? req.body.organization
          : null;

      if (!email || !password) {
        return res

          .status(400)

          .json({
            message: "Email and password required",
          });
      }

      if (password.length < 10) {
        return res

          .status(400)

          .json({
            message: "Password must be at least 10 characters",
          });
      }

      if (!/[A-Z]/.test(password)) {
        return res

          .status(400)

          .json({
            message: "Password must contain an uppercase letter",
          });
      }

      if (!/[a-z]/.test(password)) {
        return res

          .status(400)

          .json({
            message: "Password must contain a lowercase letter",
          });
      }

      if (!/[0-9]/.test(password)) {
        return res

          .status(400)

          .json({
            message: "Password must contain a number",
          });
      }

      if (!/[^A-Za-z0-9]/.test(password)) {
        return res

          .status(400)

          .json({
            message: "Password must contain a special character",
          });
      }

      if (
        accountType === "organization" &&
        !String(organization?.name || companyName || "").trim()
      ) {
        return res

          .status(400)

          .json({
            message: "Organization name required",
          });
      }

      connection = await pool.getConnection();

      await connection.beginTransaction();

      const [existingUsers] = await connection.query(
        `

          SELECT id

          FROM users

          WHERE LOWER(email) = ?

          LIMIT 1

          `,

        [email],
      );

      if (existingUsers.length) {
        await connection.rollback();

        return res

          .status(400)

          .json({
            message: "User already exists",
          });
      }

      const hashedPassword = await bcrypt.hash(
        password,

        10,
      );

      const [userResult] = await connection.query(
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
        ],
      );

      const userId = userResult.insertId;

      let createdOrganization = null;

      if (accountType === "organization") {
        const organizationName = String(
          organization?.name || companyName || "",
        ).trim();

        const registrationNumber = String(
          organization?.registrationNumber ||
            organization?.registration_number ||
            "",
        ).trim();

        const establishedYear = String(
          organization?.establishedYear || organization?.established_year || "",
        ).trim();

        const description = String(organization?.description || "").trim();

        const website = String(organization?.website || "").trim();

        const organizationPhone = String(
          organization?.phone || phone || "",
        ).trim();

        const address = String(organization?.address || "").trim();

        const categories = Array.isArray(organization?.categories)
          ? organization.categories

              .map((item) => String(item).trim())

              .filter(Boolean)
          : [];

        const defaultOrganizationLogo = randomDefaultOrganizationLogo();

        const defaultOrganizationCover = randomDefaultOrganizationCover();

        const [organizationResult] = await connection.query(
          `

            INSERT INTO organizations

            (

              user_id,

              name,

              registration_number,

              established_year,

              categories,

              description,

              website,

              phone,

              address,

              logo_url,

              cover_url,

              is_verified

            )

            VALUES

            (

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              0

            )

            `,

          [
            userId,

            organizationName,

            registrationNumber || null,

            establishedYear || null,

            JSON.stringify(categories),

            description || null,

            website || null,

            organizationPhone || null,

            address || null,

            defaultOrganizationLogo,

            defaultOrganizationCover,
          ],
        );

        createdOrganization = {
          id: organizationResult.insertId,

          user_id: userId,

          name: organizationName,

          registrationNumber: registrationNumber || null,

          registration_number: registrationNumber || null,

          establishedYear: establishedYear || null,

          established_year: establishedYear || null,

          categories,

          description: description || "",

          website: website || "",

          phone: organizationPhone || "",

          logo: defaultOrganizationLogo,

          logo_url: defaultOrganizationLogo,

          cover: defaultOrganizationCover,

          cover_url: defaultOrganizationCover,

          address: address || "",

          logo_url: null,

          cover_url: null,

          is_verified: false,
        };
      }

      await connection.commit();

      const [userRows] = await pool.query(
        `

          SELECT *

          FROM users

          WHERE id = ?

          LIMIT 1

          `,

        [userId],
      );

      const user = userRows[0];

      return res

        .status(201)

        .json({
          user: toClientUser(user),

          token: signToken(user),

          organization: createdOrganization,
        });
    } catch (err) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {}
      }

      console.error(
        "REGISTER ERROR:",

        err,
      );

      return res

        .status(500)

        .json({
          message: err.message || "Internal Server Error",
        });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
);

router.post(
  "/login",

  async (req, res) => {
    try {
      const email = String(req.body?.email || "")
        .trim()

        .toLowerCase();

      const password = String(req.body?.password || "");

      if (!email || !password) {
        return res

          .status(400)

          .json({
            message: "Email and password required",
          });
      }

      const [rows] = await pool.query(
        `

          SELECT *

          FROM users

          WHERE LOWER(email) = ?

          LIMIT 1

          `,

        [email],
      );

      if (!rows.length) {
        return res

          .status(401)

          .json({
            message: "Invalid credentials",
          });
      }

      const user = rows[0];

      if (!user.password) {
        return res

          .status(403)

          .json({
            code: "PASSWORD_NOT_SET",

            message:
              "Your account was created by an event organizer. Please set your password first.",

            email: user.email,
          });
      }

      const passwordMatches = await bcrypt.compare(
        password,

        user.password,
      );

      if (!passwordMatches) {
        return res

          .status(401)

          .json({
            message: "Invalid credentials",
          });
      }

      return res.json({
        user: toClientUser(user),

        token: signToken(user),
      });
    } catch (err) {
      console.error(
        "LOGIN ERROR:",

        err,
      );

      return res

        .status(500)

        .json({
          message: err.message || "Internal Server Error",
        });
    }
  },
);

router.post(
  "/google",

  async (req, res) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res

          .status(500)

          .json({
            message: "GOOGLE_CLIENT_ID not set",
          });
      }

      const googleToken = req.body?.token;

      if (!googleToken) {
        return res

          .status(400)

          .json({
            message: "Google token required",
          });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,

        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      const email = String(payload?.email || "")
        .trim()

        .toLowerCase();

      const googleId = String(payload?.sub || "").trim();

      const googleFirstName = String(payload?.given_name || "").trim();

      const googleLastName = String(payload?.family_name || "").trim();

      const googleAvatar = String(payload?.picture || "").trim();

      if (!email || !googleId) {
        return res

          .status(400)

          .json({
            message: "Invalid Google token",
          });
      }

      const [rows] = await pool.query(
        `

          SELECT *

          FROM users

          WHERE google_id = ?

          OR LOWER(email) = ?

          LIMIT 1

          `,

        [googleId, email],
      );

      let user;

      if (rows.length) {
        user = rows[0];

        await pool.query(
          `

          UPDATE users

          SET

            google_id = ?,

            first_name =

              COALESCE(

                first_name,

                ?

              ),

            last_name =

              COALESCE(

                last_name,

                ?

              ),

            avatar_url =

              COALESCE(

                avatar_url,

                ?

              )

          WHERE id = ?

          `,

          [
            googleId,

            googleFirstName || null,

            googleLastName || null,

            googleAvatar || null,

            user.id,
          ],
        );

        const [updatedRows] = await pool.query(
          `

            SELECT *

            FROM users

            WHERE id = ?

            LIMIT 1

            `,

          [user.id],
        );

        user = updatedRows[0];
      } else {
        const [result] = await pool.query(
          `

            INSERT INTO users

            (

              email,

              google_id,

              role,

              first_name,

              last_name,

              avatar_url,

              interests,

              account_type

            )

            VALUES

            (

              ?,

              ?,

              'user',

              ?,

              ?,

              ?,

              ?,

              'individual'

            )

            `,

          [
            email,

            googleId,

            googleFirstName || null,

            googleLastName || null,

            googleAvatar || null,

            JSON.stringify([]),
          ],
        );

        const [createdRows] = await pool.query(
          `

            SELECT *

            FROM users

            WHERE id = ?

            LIMIT 1

            `,

          [result.insertId],
        );

        user = createdRows[0];
      }

      return res.json({
        user: toClientUser(user),

        token: signToken(user),
      });
    } catch (err) {
      console.error(
        "GOOGLE LOGIN ERROR:",

        err,
      );

      return res

        .status(500)

        .json({
          message: err.message || "Google login failed",
        });
    }
  },
);

export default router;
