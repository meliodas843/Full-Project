import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { sendMail, getFrontendUrl } from "../services/mailer.js";
import {
  existingParticipantEmail,
  newParticipantEmail,
  galleryPublishedEmail,
  passwordResetCodeEmail,
} from "../templates/emailTemplates.js";

const router = express.Router();

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function createResetCode() {
  return String(
    crypto.randomInt(100000, 1000000)
  );
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeName(value) {
  return String(value || "").trim();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

async function getEvent(eventId) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      category,
      image_url,
      start_time,
      end_time,
      created_by_email
    FROM events
    WHERE id = ?
    LIMIT 1
    `,
    [eventId]
  );

  return rows[0] || null;
}

async function getUserByEmail(email) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      email,
      first_name,
      last_name,
      company_name,
      phone
    FROM users
    WHERE LOWER(email) = ?
    LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
}

async function canManageEvent(
  event,
  req
) {
  const userEmail = normalizeEmail(
    req.user?.email
  );

  const role = String(
    req.user?.role || ""
  ).toLowerCase();

  if (
    role === "admin" ||
    role === "super_admin"
  ) {
    return true;
  }

  return (
    normalizeEmail(
      event?.created_by_email
    ) === userEmail
  );
}

router.post(
  "/event-invite",
  authMiddleware,
  async (req, res) => {
    try {
      const eventId = Number(
        req.body?.event_id
      );

      const email = normalizeEmail(
        req.body?.email
      );

      if (
        !Number.isFinite(eventId)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid event_id is required",
          });
      }

      if (
        !email ||
        !validEmail(email)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid email is required",
          });
      }

      const event =
        await getEvent(eventId);

      if (!event) {
        return res
          .status(404)
          .json({
            message:
              "Event not found",
          });
      }

      const allowed =
        await canManageEvent(
          event,
          req
        );

      if (!allowed) {
        return res
          .status(403)
          .json({
            message:
              "You are not allowed to send invitations for this event",
          });
      }

      const user =
        await getUserByEmail(
          email
        );

      const frontendUrl =
        getFrontendUrl();

      if (user) {
        const eventUrl =
          `${frontendUrl}/events/${event.id}`;

        await sendMail({
          to: user.email,

          subject:
            `${user.first_name || ""}, ${event.title} арга хэмжээнд таныг урьж байна`,

          text:
            `Сайн байна уу, ${user.first_name || "Хэрэглэгч"}.\n\n` +
            `Таныг "${event.title}" арга хэмжээнд урьж байна.\n\n` +
            `${eventUrl}`,

          html:
            existingParticipantEmail({
              firstName:
                user.first_name,

              eventName:
                event.title,

              eventUrl,
            }),
        });

        return res.json({
          message:
            "Invitation email sent",

          registered:
            true,

          email:
            user.email,
        });
      }

      const inviteToken =
        crypto
          .randomBytes(32)
          .toString("hex");

      const signupUrl =
        `${frontendUrl}/signup` +
        `?invite=${encodeURIComponent(inviteToken)}` +
        `&email=${encodeURIComponent(email)}` +
        `&event=${event.id}`;

      await sendMail({
        to: email,

        subject:
          `${event.title} арга хэмжээнд таныг урьж байна`,

        text:
          `"${event.title}" арга хэмжээнд таныг урьж байна.\n\n` +
          `Registra бүртгэл үүсгэж урилгаа хүлээн авна уу:\n` +
          signupUrl,

        html:
          newParticipantEmail({
            firstName:
              "Хэрэглэгч",

            eventName:
              event.title,

            setupUrl:
              signupUrl,
          }),
      });

      return res.json({
        message:
          "Guest invitation email sent",

        registered:
          false,

        email,
      });
    } catch (err) {
      console.error(
        "POST /api/email/event-invite error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Server error",

          error:
            String(
              err.message ||
                err
            ),
        });
    }
  }
);

router.post(
  "/gallery-published",
  authMiddleware,
  async (req, res) => {
    try {
      const eventId =
        Number(
          req.body?.event_id
        );

      if (
        !Number.isFinite(
          eventId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid event_id is required",
          });
      }

      const event =
        await getEvent(
          eventId
        );

      if (!event) {
        return res
          .status(404)
          .json({
            message:
              "Event not found",
          });
      }

      const allowed =
        await canManageEvent(
          event,
          req
        );

      if (!allowed) {
        return res
          .status(403)
          .json({
            message:
              "You are not allowed to send gallery emails for this event",
          });
      }

      const [
        participants,
      ] =
        await pool.query(
          `
          SELECT DISTINCT
            u.id,
            u.email,
            u.first_name
          FROM event_bookings eb
          JOIN users u
            ON u.id = eb.user_id
          WHERE eb.event_id = ?
            AND u.email IS NOT NULL
            AND u.email <> ''
          `,
          [eventId]
        );

      const [
        fileRows,
      ] =
        await pool.query(
          `
          SELECT COUNT(*) AS total
          FROM event_files
          WHERE event_id = ?
          `,
          [eventId]
        );

      const imageCount =
        Number(
          fileRows[0]
            ?.total || 0
        );

      const frontendUrl =
        getFrontendUrl();

      const albumUrl =
        `${frontendUrl}/user/events/${eventId}/gallery`;

      const results = [];

      for (
        const participant of
        participants
      ) {
        try {
          await sendMail({
            to:
              participant.email,

            subject:
              `${event.title}-ийн зургууд нийтлэгдлээ — ${imageCount} зураг`,

            text:
              `Сайн байна уу, ${participant.first_name || "оролцогч"}.\n\n` +
              `${event.title}-ийн зургууд нийтлэгдлээ.\n` +
              `${imageCount} зураг\n\n` +
              albumUrl,

            html:
              galleryPublishedEmail({
                firstName:
                  participant.first_name,

                eventName:
                  event.title,

                imageCount,

                albumUrl,
              }),
          });

          results.push({
            user_id:
              participant.id,

            email:
              participant.email,

            sent:
              true,
          });
        } catch (
          mailError
        ) {
          console.error(
            "GALLERY EMAIL ERROR:",
            participant.email,
            mailError
          );

          results.push({
            user_id:
              participant.id,

            email:
              participant.email,

            sent:
              false,

            error:
              String(
                mailError
                  ?.message ||
                  mailError
              ),
          });
        }
      }

      const sentCount =
        results.filter(
          (item) =>
            item.sent
        ).length;

      const failedCount =
        results.length -
        sentCount;

      return res.json({
        message:
          "Gallery email process completed",

        event_id:
          eventId,

        event_name:
          event.title,

        image_count:
          imageCount,

        total:
          results.length,

        sent:
          sentCount,

        failed:
          failedCount,

        results,
      });
    } catch (err) {
      console.error(
        "POST /api/email/gallery-published error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Server error",

          error:
            String(
              err.message ||
                err
            ),
        });
    }
  }
);

router.post(
  "/password-code",
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      if (
        !email ||
        !validEmail(email)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid email is required",
          });
      }

      const user =
        await getUserByEmail(
          email
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              "This email is not registered.",
          });
      }

      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS password_reset_codes
        (
          id BIGINT NOT NULL AUTO_INCREMENT,

          user_id BIGINT NOT NULL,

          code_hash CHAR(64) NOT NULL,

          expires_at DATETIME NOT NULL,

          used TINYINT(1)
            NOT NULL
            DEFAULT 0,

          attempts INT
            NOT NULL
            DEFAULT 0,

          created_at DATETIME
            NOT NULL
            DEFAULT CURRENT_TIMESTAMP,

          PRIMARY KEY (id),

          KEY idx_reset_user
            (user_id),

          KEY idx_reset_code
            (code_hash)
        )
        ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        `
      );

      await pool.query(
        `
        UPDATE password_reset_codes

        SET used = 1

        WHERE user_id = ?
          AND used = 0
        `,
        [user.id]
      );

      const code =
        createResetCode();

      const codeHash =
        sha256(code);

      const expiresAt =
        new Date(
          Date.now() +
            10 *
              60 *
              1000
        );

      await pool.query(
        `
        INSERT INTO password_reset_codes
        (
          user_id,
          code_hash,
          expires_at,
          used,
          attempts
        )

        VALUES
        (?, ?, ?, 0, 0)
        `,
        [
          user.id,
          codeHash,
          expiresAt,
        ]
      );

      const resetUrl =
        `${getFrontendUrl()}/reset-password` +
        `?email=${encodeURIComponent(user.email)}`;

      await sendMail({
        to:
          user.email,

        subject:
          `Registra нууц үг сэргээх код: ${code}`,

        text:
          `Таны Registra нууц үг сэргээх код: ${code}\n\n` +
          `Код 10 минут хүчинтэй.\n\n` +
          resetUrl,

        html:
          passwordResetCodeEmail({
            firstName:
              user.first_name,

            code,

            resetUrl,
          }),
      });

      return res.json({
        message:
          "Reset code sent to your email.",

        email:
          user.email,
      });
    } catch (err) {
      console.error(
        "POST /api/email/password-code error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Server error",

          error:
            String(
              err.message ||
                err
            ),
        });
    }
  }
);

router.post(
  "/test",
  authMiddleware,
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      if (
        !email ||
        !validEmail(email)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Valid email is required",
          });
      }

      await sendMail({
        to:
          email,

        subject:
          "Registra email test",

        text:
          "Registra email system is working.",

        html: `
          <div
            style="
              max-width:600px;
              margin:0 auto;
              padding:40px;
              font-family:Arial,sans-serif;
            "
          >
            <h1
              style="
                color:#6847ef;
                margin:0 0 16px;
              "
            >
              REGISTRA
            </h1>

            <h2>
              Email system ажиллаж байна
            </h2>

            <p>
              Энэ бол Registra backend-ээс
              илгээсэн тест имэйл.
            </p>
          </div>
        `,
      });

      return res.json({
        message:
          "Test email sent",

        email,
      });
    } catch (err) {
      console.error(
        "POST /api/email/test error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Email could not be sent",

          error:
            String(
              err.message ||
                err
            ),
        });
    }
  }
);

export default router;