import express from "express";
import pool from "../db.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const router = express.Router();

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isStrongPassword(password) {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

/*
|--------------------------------------------------------------------------
| VERIFY 6-DIGIT RESET CODE
|--------------------------------------------------------------------------
|
| POST /api/password/verify-code
|
| body:
| {
|   "email": "user@example.com",
|   "code": "482917"
| }
|
*/

router.post("/verify-code", async (req, res) => {
  const email = normalizeEmail(
    req.body?.email
  );

  const code = String(
    req.body?.code || ""
  ).trim();

  if (!email) {
    return res.status(400).json({
      message:
        "Имэйл хаяг шаардлагатай.",
    });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      message:
        "6 оронтой баталгаажуулах код оруулна уу.",
    });
  }

  try {
    const [users] =
      await pool.query(
        `
        SELECT
          id,
          email
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
        `,
        [email]
      );

    if (users.length === 0) {
      return res.status(404).json({
        message:
          "Энэ имэйл хаяг бүртгэлгүй байна.",
      });
    }

    const user = users[0];

    /*
     * Find newest active reset code.
     *
     * We intentionally find the newest active
     * row first, then compare the hash in Node.
     *
     * This allows us to increment attempts even
     * when the entered code itself is incorrect.
     */

    const [rows] =
      await pool.query(
        `
        SELECT
          id,
          code_hash,
          expires_at,
          used,
          attempts
        FROM password_reset_codes
        WHERE user_id = ?
          AND used = 0
        ORDER BY id DESC
        LIMIT 1
        `,
        [user.id]
      );

    if (rows.length === 0) {
      return res.status(400).json({
        message:
          "Идэвхтэй баталгаажуулах код олдсонгүй. Шинэ код авна уу.",
      });
    }

    const resetRow = rows[0];

    if (
      Number(resetRow.attempts || 0) >=
      5
    ) {
      await pool.query(
        `
        UPDATE password_reset_codes
        SET used = 1
        WHERE id = ?
        `,
        [resetRow.id]
      );

      return res.status(429).json({
        message:
          "Код оруулах оролдлогын хязгаар хэтэрсэн байна. Шинэ код авна уу.",
      });
    }

    const expiresAt =
      new Date(
        resetRow.expires_at
      ).getTime();

    if (
      !Number.isFinite(expiresAt) ||
      expiresAt < Date.now()
    ) {
      await pool.query(
        `
        UPDATE password_reset_codes
        SET used = 1
        WHERE id = ?
        `,
        [resetRow.id]
      );

      return res.status(400).json({
        message:
          "Баталгаажуулах кодын хугацаа дууссан байна. Шинэ код авна уу.",
      });
    }

    const codeHash =
      sha256(code);

    if (
      codeHash !==
      resetRow.code_hash
    ) {
      await pool.query(
        `
        UPDATE password_reset_codes
        SET attempts = attempts + 1
        WHERE id = ?
        `,
        [resetRow.id]
      );

      const attempts =
        Number(
          resetRow.attempts || 0
        ) + 1;

      const remaining =
        Math.max(
          0,
          5 - attempts
        );

      if (remaining === 0) {
        await pool.query(
          `
          UPDATE password_reset_codes
          SET used = 1
          WHERE id = ?
          `,
          [resetRow.id]
        );

        return res.status(429).json({
          message:
            "Код оруулах оролдлогын хязгаар хэтэрсэн байна. Шинэ код авна уу.",
        });
      }

      return res.status(400).json({
        message:
          `Баталгаажуулах код буруу байна. ${remaining} оролдлого үлдлээ.`,
      });
    }

    return res.json({
      verified: true,
      message:
        "Код амжилттай баталгаажлаа.",
    });
  } catch (err) {
    console.error(
      "POST /api/password/verify-code error:",
      err
    );

    return res.status(500).json({
      message: "Server error",
      error: String(
        err?.message || err
      ),
    });
  }
});

/*
|--------------------------------------------------------------------------
| RESET PASSWORD WITH VERIFIED CODE
|--------------------------------------------------------------------------
|
| POST /api/password/reset-with-code
|
| body:
| {
|   "email": "user@example.com",
|   "code": "482917",
|   "newPassword": "Example@123"
| }
|
*/

router.post(
  "/reset-with-code",
  async (req, res) => {
    const email =
      normalizeEmail(
        req.body?.email
      );

    const code = String(
      req.body?.code || ""
    ).trim();

    const newPassword =
      String(
        req.body?.newPassword ||
          ""
      );

    if (!email) {
      return res
        .status(400)
        .json({
          message:
            "Имэйл хаяг шаардлагатай.",
        });
    }

    if (
      !/^\d{6}$/.test(code)
    ) {
      return res
        .status(400)
        .json({
          message:
            "6 оронтой баталгаажуулах код шаардлагатай.",
        });
    }

    if (
      !isStrongPassword(
        newPassword
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Нууц үг хамгийн багадаа 10 тэмдэгттэй бөгөөд том үсэг, жижиг үсэг, тоо, тусгай тэмдэгт агуулсан байх ёстой.",
        });
    }

    let connection = null;

    try {
      const [users] =
        await pool.query(
          `
          SELECT
            id,
            email
          FROM users
          WHERE LOWER(email) = ?
          LIMIT 1
          `,
          [email]
        );

      if (
        users.length === 0
      ) {
        return res
          .status(404)
          .json({
            message:
              "Энэ имэйл хаяг бүртгэлгүй байна.",
          });
      }

      const user =
        users[0];

      const [rows] =
        await pool.query(
          `
          SELECT
            id,
            code_hash,
            expires_at,
            used,
            attempts
          FROM password_reset_codes
          WHERE user_id = ?
            AND used = 0
          ORDER BY id DESC
          LIMIT 1
          `,
          [user.id]
        );

      if (
        rows.length === 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Баталгаажуулах код хүчингүй болсон байна. Шинэ код авна уу.",
          });
      }

      const resetRow =
        rows[0];

      if (
        Number(
          resetRow.attempts ||
            0
        ) >= 5
      ) {
        await pool.query(
          `
          UPDATE password_reset_codes
          SET used = 1
          WHERE id = ?
          `,
          [resetRow.id]
        );

        return res
          .status(429)
          .json({
            message:
              "Код оруулах оролдлогын хязгаар хэтэрсэн байна. Шинэ код авна уу.",
          });
      }

      const expiresAt =
        new Date(
          resetRow.expires_at
        ).getTime();

      if (
        !Number.isFinite(
          expiresAt
        ) ||
        expiresAt <
          Date.now()
      ) {
        await pool.query(
          `
          UPDATE password_reset_codes
          SET used = 1
          WHERE id = ?
          `,
          [resetRow.id]
        );

        return res
          .status(400)
          .json({
            message:
              "Баталгаажуулах кодын хугацаа дууссан байна. Шинэ код авна уу.",
          });
      }

      const codeHash =
        sha256(code);

      if (
        codeHash !==
        resetRow.code_hash
      ) {
        await pool.query(
          `
          UPDATE password_reset_codes
          SET attempts = attempts + 1
          WHERE id = ?
          `,
          [resetRow.id]
        );

        return res
          .status(400)
          .json({
            message:
              "Баталгаажуулах код буруу байна.",
          });
      }

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          12
        );

      connection =
        await pool.getConnection();

      await connection.beginTransaction();

      await connection.query(
        `
        UPDATE users
        SET password = ?
        WHERE id = ?
        `,
        [
          hashedPassword,
          user.id,
        ]
      );

      /*
       * Mark this code as used.
       */

      await connection.query(
        `
        UPDATE password_reset_codes
        SET used = 1
        WHERE id = ?
        `,
        [resetRow.id]
      );

      /*
       * Invalidate any other
       * active codes for this user.
       */

      await connection.query(
        `
        UPDATE password_reset_codes
        SET used = 1
        WHERE user_id = ?
          AND used = 0
        `,
        [user.id]
      );

      await connection.commit();

      return res.json({
        success: true,
        message:
          "Нууц үг амжилттай шинэчлэгдлээ.",
      });
    } catch (err) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Password reset rollback error:",
            rollbackError
          );
        }
      }

      console.error(
        "POST /api/password/reset-with-code error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Server error",
          error: String(
            err?.message ||
              err
          ),
        });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);

export default router;