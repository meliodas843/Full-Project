import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import newsRoutes from "./routes/news.routes.js";
import newsBodyImageRoutes from "./routes/newsBodyImage.routes.js";
import userRoutes from "./routes/user.routes.js";
import eventsRoutes from "./routes/event.routes.js";
import meetingsRouter from "./routes/meetings.js";
import companiesRouter from "./routes/companies.js";
import eventFilesRouter from "./routes/eventFiles.js";
import zoomRoutes from "./routes/zoomTest.js";
import profileRoutes from "./routes/profile.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import passwordRoutes from "./routes/password.routes.js";
import organizationRoutes from "./routes/organizations.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());

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
  express.static(path.join(__dirname, "uploads"))
);

app.use("/api/auth", authRoutes);

app.use("/api/news", newsRoutes);
app.use("/api/news", newsBodyImageRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/projects", projectsRoutes);

app.use("/api/users", userRoutes);

app.use("/api/password", passwordRoutes);

app.use("/api/events", eventFilesRouter);
app.use("/api/events", eventsRoutes);

app.use("/api/meetings", meetingsRouter);

app.use("/api/companies", companiesRouter);

app.use("/api/organizations", organizationRoutes);

app.use("/api/zoom", zoomRoutes);

const frontendPath = path.resolve(__dirname, "../dist");

app.use(express.static(frontendPath));

app.get("/{*splat}", (req, res, next) => {
  if (
    req.path.startsWith("/api/") ||
    req.path === "/api" ||
    req.path.startsWith("/uploads/")
  ) {
    return next();
  }

  return res.sendFile(
    path.join(frontendPath, "index.html")
  );
});

app.use((req, res) => {
  if (
    req.path.startsWith("/api/") ||
    req.path === "/api"
  ) {
    return res.status(404).json({
      message: "Route not found",
    });
  }

  return res.status(404).send("Not found");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});