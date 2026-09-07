import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import crypto from "crypto";
import nodemailer from "nodemailer";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "events"
);

fs.mkdirSync(UPLOAD_DIR, {
  recursive: true,
});

const setupTransporter =
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user:
        process.env
          .RESET_EMAIL_USER,
      pass:
        process.env
          .RESET_EMAIL_PASS,
    },
  });

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

async function sendWelcomeEmail({
  userId,
  email,
  firstName,
  eventName,
}) {
  if (
    !process.env.FRONTEND_URL ||
    !process.env.RESET_EMAIL_USER ||
    !process.env.RESET_EMAIL_PASS
  ) {
    throw new Error(
      "FRONTEND_URL, RESET_EMAIL_USER or RESET_EMAIL_PASS is missing"
    );
  }

  const rawToken =
    crypto
      .randomBytes(32)
      .toString("hex");

  const tokenHash =
    sha256(rawToken);

  const expiresAt =
    new Date(
      Date.now() +
        24 *
          60 *
          60 *
          1000
    );

  await pool.query(
    `
    INSERT INTO password_resets
    (
      user_id,
      token_hash,
      expires_at,
      used
    )
    VALUES (?, ?, ?, 0)
    `,
    [
      userId,
      tokenHash,
      expiresAt,
    ]
  );

  const frontendUrl =
    String(
      process.env.FRONTEND_URL
    ).replace(/\/+$/, "");

  const setupUrl =
    `${frontendUrl}/reset-password?token=${rawToken}`;

  const name =
    String(
      firstName || ""
    ).trim() || "User";

  const eventTitle =
    String(
      eventName || "Event"
    ).trim();

  await setupTransporter.sendMail({
    from:
      `"Registra" <${process.env.RESET_EMAIL_USER}>`,

    to: email,

    subject:
      `You've been added to ${eventTitle}`,

    text:
      `Welcome to Registra\n\n` +
      `Hello ${name},\n\n` +
      `You have been added to "${eventTitle}".\n\n` +
      `Your account has been created.\n\n` +
      `Set your password:\n${setupUrl}\n\n` +
      `This link expires in 24 hours.`,

    html: `
      <div
        style="
          max-width:560px;
          margin:0 auto;
          padding:32px;
          font-family:Arial,sans-serif;
          color:#172033;
          line-height:1.6;
        "
      >
        <h1
          style="
            margin:0 0 24px;
            font-size:26px;
            color:#172033;
          "
        >
          Welcome to Registra
        </h1>

        <p>
          Hello ${name},
        </p>

        <p>
          You have been added to
          <strong>"${eventTitle}"</strong>.
        </p>

        <p>
          Your account has been created.
        </p>

        <p>
          Set your password to access your
          Registra account.
        </p>

        <div
          style="
            margin:28px 0;
          "
        >
          <a
            href="${setupUrl}"
            style="
              display:inline-block;
              padding:13px 24px;
              background:#6247ef;
              color:#ffffff;
              text-decoration:none;
              border-radius:10px;
              font-size:14px;
              font-weight:700;
            "
          >
            Set Password
          </a>
        </div>

        <p
          style="
            color:#667085;
            font-size:13px;
          "
        >
          This link expires in 24 hours.
        </p>

        <p
          style="
            color:#667085;
            font-size:13px;
          "
        >
          If the button does not work,
          copy and paste this link into
          your browser:
        </p>

        <p
          style="
            word-break:break-all;
            font-size:12px;
            color:#6247ef;
          "
        >
          ${setupUrl}
        </p>
      </div>
    `,
  });

  return true;
}

function normalizeDateTime(dt) {
  if (!dt) return null;

  if (
    typeof dt !== "string"
  ) {
    return dt;
  }

  if (dt.includes("T")) {
    return dt;
  }

  return dt.replace(
    " ",
    "T"
  );
}

function toMs(dt) {
  if (!dt) {
    return NaN;
  }

  const t =
    new Date(
      normalizeDateTime(dt)
    ).getTime();

  return Number.isFinite(t)
    ? t
    : NaN;
}

function isFinished(
  end_time
) {
  if (!end_time) {
    return false;
  }

  const endMs =
    toMs(end_time);

  return (
    Number.isFinite(endMs) &&
    endMs < Date.now()
  );
}

function isAllowedMime(
  mime
) {
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  return allowed.includes(
    mime
  );
}

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        UPLOAD_DIR
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const ext =
        path
          .extname(
            file.originalname ||
              ""
          )
          .slice(
            0,
            10
          );

      const unique =
        `${Date.now()}-${Math.round(
          Math.random() *
            1e9
        )}${ext}`;

      cb(
        null,
        unique
      );
    },
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        20 *
        1024 *
        1024,
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {
      if (
        !isAllowedMime(
          file.mimetype
        )
      ) {
        return cb(
          new Error(
            "File type not allowed"
          )
        );
      }

      cb(
        null,
        true
      );
    },
  });

function makePublicUrl(
  req,
  storedName
) {
  const proto =
    req.headers[
      "x-forwarded-proto"
    ] ||
    req.protocol ||
    "http";

  const host =
    req.get("host");

  return `${proto}://${host}/uploads/events/${storedName}`;
}

router.get(
  "/:id/participants",
  authMiddleware,
  async (
    req,
    res
  ) => {
    try {
      const eventId =
        Number(
          req.params.id
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
              "Invalid event id",
          });
      }

      const [
        eventRows,
      ] =
        await pool.query(
          `
          SELECT id
          FROM events
          WHERE id = ?
          LIMIT 1
          `,
          [
            eventId,
          ]
        );

      if (
        !eventRows.length
      ) {
        return res
          .status(404)
          .json({
            message:
              "Event not found",
          });
      }

      const [
        rows,
      ] =
        await pool.query(
          `
          SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.avatar_url AS profile_image
          FROM event_bookings eb
          JOIN users u
            ON u.id = eb.user_id
          WHERE eb.event_id = ?
          ORDER BY
            u.first_name ASC,
            u.last_name ASC
          `,
          [
            eventId,
          ]
        );

      return res.json(
        rows
      );
    } catch (err) {
      console.error(
        "GET /api/events/:id/participants error:",
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
  "/:id/participants",
  authMiddleware,
  async (
    req,
    res
  ) => {
    const eventId =
      Number(
        req.params.id
      );

    const currentUserId =
      Number(
        req.user?.id
      );

    const currentUserEmail =
      String(
        req.user?.email ||
          ""
      )
        .trim()
        .toLowerCase();

    const email =
      String(
        req.body?.email ||
          ""
      )
        .trim()
        .toLowerCase();

    const firstName =
      String(
        req.body
          ?.first_name ||
          ""
      ).trim();

    const lastName =
      String(
        req.body
          ?.last_name ||
          ""
      ).trim();

    const phone =
      String(
        req.body?.phone ||
          ""
      ).trim();

    if (
      !Number.isFinite(
        eventId
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid event id",
        });
    }

    if (
      !Number.isFinite(
        currentUserId
      ) ||
      !currentUserEmail
    ) {
      return res
        .status(401)
        .json({
          message:
            "Invalid token",
        });
    }

    if (
      !email ||
      !firstName ||
      !lastName ||
      !phone
    ) {
      return res
        .status(400)
        .json({
          message:
            "Email, name, family name and phone number are required",
        });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid email address",
        });
    }

    const connection =
      await pool
        .getConnection();

    let userId = null;
    let created = false;

    try {
      await connection
        .beginTransaction();

      const [
        eventRows,
      ] =
        await connection.query(
          `
          SELECT
            id,
            title,
            created_by_email,
            max_participants
          FROM events
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
          `,
          [
            eventId,
          ]
        );

      if (
        !eventRows.length
      ) {
        await connection
          .rollback();

        return res
          .status(404)
          .json({
            message:
              "Event not found",
          });
      }

      const event =
        eventRows[0];

      const creatorEmail =
        String(
          event
            .created_by_email ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        !creatorEmail ||
        creatorEmail !==
          currentUserEmail
      ) {
        await connection
          .rollback();

        return res
          .status(403)
          .json({
            message:
              "Only the event organizer can add people",
          });
      }

      const [
        userRows,
      ] =
        await connection.query(
          `
          SELECT
            id,
            email,
            first_name,
            last_name,
            phone,
            password
          FROM users
          WHERE LOWER(email) = ?
          LIMIT 1
          `,
          [
            email,
          ]
        );

      if (
        userRows.length
      ) {
        userId =
          Number(
            userRows[0].id
          );
      } else {
        const [
          result,
        ] =
          await connection.query(
            `
            INSERT INTO users
            (
              email,
              password,
              role,
              first_name,
              last_name,
              phone
            )
            VALUES
            (
              ?,
              NULL,
              'user',
              ?,
              ?,
              ?
            )
            `,
            [
              email,
              firstName,
              lastName,
              phone,
            ]
          );

        userId =
          Number(
            result.insertId
          );

        created = true;
      }

      if (
        !Number.isFinite(
          userId
        )
      ) {
        throw new Error(
          "Failed to resolve user id"
        );
      }

      const [
        existingBookingRows,
      ] =
        await connection.query(
          `
          SELECT
            event_id,
            user_id
          FROM event_bookings
          WHERE event_id = ?
            AND user_id = ?
          LIMIT 1
          `,
          [
            eventId,
            userId,
          ]
        );

      if (
        existingBookingRows
          .length
      ) {
        await connection
          .rollback();

        return res.json({
          message:
            "This user is already added to the event.",

          created:
            false,

          already_joined:
            true,

          setup_email_sent:
            false,
        });
      }

      const maxParticipants =
        Number(
          event
            .max_participants ||
            0
        );

      if (
        maxParticipants >
        0
      ) {
        const [
          countRows,
        ] =
          await connection.query(
            `
            SELECT
              COUNT(*) AS total
            FROM event_bookings
            WHERE event_id = ?
            `,
            [
              eventId,
            ]
          );

        const total =
          Number(
            countRows[0]
              ?.total ||
              0
          );

        if (
          total >=
          maxParticipants
        ) {
          await connection
            .rollback();

          return res
            .status(400)
            .json({
              message:
                "Event is full",
            });
        }
      }

      await connection.query(
        `
        INSERT INTO event_bookings
        (
          event_id,
          user_id
        )
        VALUES (?, ?)
        `,
        [
          eventId,
          userId,
        ]
      );

      await connection
        .commit();

      let setupEmailSent =
        false;

      let setupEmailError =
        null;

      if (created) {
        try {
          await sendWelcomeEmail({
            userId,
            email,
            firstName,
            eventName:
              event.title,
          });

          setupEmailSent =
            true;
        } catch (
          mailError
        ) {
          console.error(
            "WELCOME EMAIL ERROR:",
            mailError
          );

          setupEmailError =
            String(
              mailError
                ?.message ||
                mailError
            );
        }
      }

      const [
        createdUserRows,
      ] =
        await pool.query(
          `
          SELECT
            id,
            email,
            first_name,
            last_name,
            phone,
            avatar_url AS profile_image
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [
            userId,
          ]
        );

      let message;

      if (created) {
        if (
          setupEmailSent
        ) {
          message =
            "User created and added. Password setup email sent.";
        } else {
          message =
            "User created and added, but password setup email could not be sent.";
        }
      } else {
        message =
          "Existing user added to the event.";
      }

      return res
        .status(201)
        .json({
          message,

          created,

          already_joined:
            false,

          requires_password:
            created,

          setup_email_sent:
            setupEmailSent,

          setup_email_error:
            setupEmailError,

          user:
            createdUserRows[0] ||
            null,
        });
    } catch (err) {
      try {
        await connection
          .rollback();
      } catch {}

      console.error(
        "POST /api/events/:id/participants error:",
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
    } finally {
      connection
        .release();
    }
  }
);

router.get(
  "/:id/files",
  authMiddleware,
  async (
    req,
    res
  ) => {
    try {
      const eventId =
        Number(
          req.params.id
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
              "Invalid event id",
          });
      }

      const [
        rows,
      ] =
        await pool.query(
          `
          SELECT
            id,
            event_id,
            uploaded_by_email,
            original_name,
            stored_name,
            mime_type,
            size_bytes,
            note,
            created_at
          FROM event_files
          WHERE event_id = ?
          ORDER BY created_at DESC
          `,
          [
            eventId,
          ]
        );

      const files =
        rows.map(
          (file) => ({
            ...file,

            url:
              makePublicUrl(
                req,
                file.stored_name
              ),
          })
        );

      return res.json(
        files
      );
    } catch (err) {
      console.error(
        "GET /api/events/:id/files error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

router.post(
  "/:id/files",
  authMiddleware,
  (
    req,
    res
  ) => {
    upload.array(
      "files",
      10
    )(
      req,
      res,
      async (
        multerErr
      ) => {
        if (
          multerErr
        ) {
          console.error(
            "MULTER ERROR:",
            multerErr
          );

          if (
            multerErr.code ===
            "LIMIT_FILE_SIZE"
          ) {
            return res
              .status(400)
              .json({
                message:
                  "File too large (max 20MB each)",
              });
          }

          if (
            multerErr.code ===
            "LIMIT_UNEXPECTED_FILE"
          ) {
            return res
              .status(400)
              .json({
                message:
                  "Unexpected field. Use form-data key: files",
              });
          }

          return res
            .status(400)
            .json({
              message:
                multerErr
                  .message ||
                "Upload error",
            });
        }

        try {
          const eventId =
            Number(
              req.params.id
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
                  "Invalid event id",
              });
          }

          const userEmail =
            req.user?.email;

          const userId =
            Number(
              req.user?.id
            );

          if (
            !userEmail
          ) {
            return res
              .status(401)
              .json({
                message:
                  "Invalid token (no email)",
              });
          }

          if (
            !Number.isFinite(
              userId
            )
          ) {
            return res
              .status(401)
              .json({
                message:
                  "Invalid token (no user id)",
              });
          }

          const [
            evRows,
          ] =
            await pool.query(
              `
              SELECT
                id,
                end_time,
                created_by_email
              FROM events
              WHERE id = ?
              LIMIT 1
              `,
              [
                eventId,
              ]
            );

          if (
            !evRows.length
          ) {
            return res
              .status(404)
              .json({
                message:
                  "Event not found",
              });
          }

          const ev =
            evRows[0];

          if (
            !ev.end_time
          ) {
            return res
              .status(400)
              .json({
                message:
                  "Event has no end_time, cannot upload as 'finished'.",
              });
          }

          if (
            !isFinished(
              ev.end_time
            )
          ) {
            return res
              .status(400)
              .json({
                message:
                  "You can upload files only after the event is finished.",
              });
          }

          const isCreator =
            String(
              ev
                .created_by_email ||
                ""
            ).toLowerCase() ===
            String(
              userEmail
            ).toLowerCase();

          const [
            bookRows,
          ] =
            await pool.query(
              `
              SELECT 1
              FROM event_bookings
              WHERE event_id = ?
                AND user_id = ?
              LIMIT 1
              `,
              [
                eventId,
                userId,
              ]
            );

          const isBooked =
            bookRows.length >
            0;

          if (
            !isCreator &&
            !isBooked
          ) {
            return res
              .status(403)
              .json({
                message:
                  "Only event creator or booked users can upload files.",
              });
          }

          const files =
            req.files ||
            [];

          if (
            !files.length
          ) {
            return res
              .status(400)
              .json({
                message:
                  "No files uploaded",
              });
          }

          const note =
            String(
              req.body?.note ||
                ""
            ).slice(
              0,
              255
            ) || null;

          const inserted =
            [];

          for (
            const file of
            files
          ) {
            const {
              originalname,
              filename,
              mimetype,
              size,
            } = file;

            const [
              result,
            ] =
              await pool.query(
                `
                INSERT INTO event_files
                (
                  event_id,
                  uploaded_by_email,
                  original_name,
                  stored_name,
                  mime_type,
                  size_bytes,
                  note
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                  eventId,
                  userEmail,
                  originalname,
                  filename,
                  mimetype,
                  size,
                  note,
                ]
              );

            inserted.push({
              id:
                result.insertId,

              event_id:
                eventId,

              uploaded_by_email:
                userEmail,

              original_name:
                originalname,

              stored_name:
                filename,

              mime_type:
                mimetype,

              size_bytes:
                size,

              note,

              url:
                makePublicUrl(
                  req,
                  filename
                ),
            });
          }

          return res
            .status(201)
            .json({
              message:
                "Files uploaded ✅",

              files:
                inserted,
            });
        } catch (err) {
          console.error(
            "POST /api/events/:id/files error:",
            err
          );

          if (
            String(
              err.message ||
                ""
            ).includes(
              "File type not allowed"
            )
          ) {
            return res
              .status(400)
              .json({
                message:
                  "File type not allowed",
              });
          }

          return res
            .status(500)
            .json({
              message:
                "Server error",
            });
        }
      }
    );
  }
);

router.delete(
  "/:eventId/files/:fileId",
  authMiddleware,
  async (
    req,
    res
  ) => {
    try {
      const eventId =
        Number(
          req.params
            .eventId
        );

      const fileId =
        Number(
          req.params
            .fileId
        );

      if (
        !Number.isFinite(
          eventId
        ) ||
        !Number.isFinite(
          fileId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid id",
          });
      }

      const userEmail =
        req.user?.email;

      if (
        !userEmail
      ) {
        return res
          .status(401)
          .json({
            message:
              "Invalid token (no email)",
          });
      }

      const [
        evRows,
      ] =
        await pool.query(
          `
          SELECT
            id,
            created_by_email
          FROM events
          WHERE id = ?
          LIMIT 1
          `,
          [
            eventId,
          ]
        );

      if (
        !evRows.length
      ) {
        return res
          .status(404)
          .json({
            message:
              "Event not found",
          });
      }

      const [
        fileRows,
      ] =
        await pool.query(
          `
          SELECT
            id,
            event_id,
            uploaded_by_email,
            stored_name
          FROM event_files
          WHERE id = ?
            AND event_id = ?
          LIMIT 1
          `,
          [
            fileId,
            eventId,
          ]
        );

      if (
        !fileRows.length
      ) {
        return res
          .status(404)
          .json({
            message:
              "File not found",
          });
      }

      const ev =
        evRows[0];

      const file =
        fileRows[0];

      const isCreator =
        String(
          ev
            .created_by_email ||
            ""
        ).toLowerCase() ===
        String(
          userEmail
        ).toLowerCase();

      const isUploader =
        String(
          file
            .uploaded_by_email ||
            ""
        ).toLowerCase() ===
        String(
          userEmail
        ).toLowerCase();

      if (
        !isCreator &&
        !isUploader
      ) {
        return res
          .status(403)
          .json({
            message:
              "Not allowed to delete this file",
          });
      }

      await pool.query(
        `
        DELETE FROM event_files
        WHERE id = ?
          AND event_id = ?
        `,
        [
          fileId,
          eventId,
        ]
      );

      const diskPath =
        path.join(
          UPLOAD_DIR,
          file.stored_name
        );

      fs.promises
        .unlink(
          diskPath
        )
        .catch(
          () => {}
        );

      return res.json({
        message:
          "File deleted ✅",
      });
    } catch (err) {
      console.error(
        "DELETE file error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

export default router;