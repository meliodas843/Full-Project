import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import helmet from "helmet";
import {
  apiLimiter,
  authLimiter,
  corsMiddleware,
  errorHandler,
  hideServerErrors,
  lookupLimiter,
  resetCodeLimiter,
  resetEmailLimiter,
} from "./utils/security.js";
import { setUploadHeaders } from "./utils/uploadSafety.js";
import pool from "./db.js";
import { ensureSchema } from "./db/schema.js";
import { pruneAuditLogs, requestId } from "./utils/audit.js";

import authRoutes from "./routes/auth.js";
import newsRoutes from "./routes/news.routes.js";
import userRoutes from "./routes/user.routes.js";
import eventsRoutes from "./routes/event.routes.js";
import eventGalleryRoutes from "./routes/eventGallery.routes.js";
import meetingsRouter from "./routes/meetings.js";
import companiesRouter from "./routes/companies.js";
import eventFilesRouter from "./routes/eventFiles.js";
import zoomRoutes from "./routes/zoomTest.js";
import profileRoutes from "./routes/profile.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import passwordRoutes from "./routes/password.routes.js";
import emailRoutes from "./routes/email.routes.js";
import checkinRoutes from "./routes/checkin.routes.js";
import organizationRoutes from "./routes/organizations.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// nginx sits in front of the app; trust its X-Forwarded-For so rate limits
// apply per visitor rather than to the proxy as a whole.
app.set("trust proxy", 1);

app.use(requestId);

app.use(
  helmet({
    // The SPA relies on inline scripts and Google sign-in; a strict CSP would
    // need a nonce setup, so it stays off for now.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Google sign-in opens a popup that must be able to talk back.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Uploaded images are also shown in emails and shared links.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(corsMiddleware());
app.use(hideServerErrors);

app.use("/api", apiLimiter);
app.use(["/api/auth/login", "/api/auth/register", "/api/auth/google"], authLimiter);
app.use("/api/email/password-code", resetEmailLimiter);
app.use("/api/email/user-lookup", lookupLimiter);
app.use(["/api/password/verify-code", "/api/password/reset-with-code"], resetCodeLimiter);

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads"),
    { setHeaders: setUploadHeaders }
  )
);

app.use(
  "/registra-default-images",
  express.static(
    path.join(
      __dirname,
      "../public/registra-default-images"
    )
  )
);

app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/events", eventFilesRouter);
app.use("/api/events", eventsRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/email", emailRoutes);
app.use(
  "/api/event-gallery",
  eventGalleryRoutes
);
app.use("/api/meetings", meetingsRouter);
app.use("/api/companies", companiesRouter);
app.use(
  "/api/organizations",
  organizationRoutes
);
app.use("/api/zoom", zoomRoutes);
app.use("/api/admin", adminRoutes);

const frontendPath = path.resolve(
  __dirname,
  "../dist"
);

app.use(
  express.static(frontendPath)
);

app.get(
  "/{*splat}",
  (req, res, next) => {
    if (
      req.path.startsWith("/api/") ||
      req.path === "/api" ||
      req.path.startsWith("/uploads/") ||
      req.path.startsWith(
        "/registra-default-images/"
      )
    ) {
      return next();
    }

    return res.sendFile(
      path.join(
        frontendPath,
        "index.html"
      )
    );
  }
);

app.use((req, res) => {
  if (
    req.path.startsWith("/api/") ||
    req.path === "/api"
  ) {
    return res.status(404).json({
      message: "Route not found",
    });
  }

  return res
    .status(404)
    .send("Not found");
});

app.use(errorHandler);

try {
  await ensureSchema(pool);
} catch (error) {
  // Keep serving; the affected features will fail until the database is fixed.
  console.error("DATABASE SCHEMA SETUP FAILED:", error.message);
}

// Keep the admin log register to its retention window.
pruneAuditLogs();
setInterval(pruneAuditLogs, 24 * 60 * 60 * 1000).unref();

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);