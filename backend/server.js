import "dotenv/config";
import path from "path";
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
  express.static(
    path.join(
      process.cwd(),
      "uploads"
    )
  )
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/news",
  newsRoutes
);

app.use(
  "/api/news",
  newsBodyImageRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
  "/api/projects",
  projectsRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/password",
  passwordRoutes
);

app.use(
  "/api/events",
  eventFilesRouter
);

app.use(
  "/api/events",
  eventsRoutes
);

app.use(
  "/api/meetings",
  meetingsRouter
);

app.use(
  "/api/companies",
  companiesRouter
);

app.use(
  "/api/organizations",
  organizationRoutes
);

app.use(
  "/api/zoom",
  zoomRoutes
);

app.get(
  "/",
  (req, res) => {
    res.send(
      "API is running..."
    );
  }
);

app.use(
  (req, res) => {
    res.status(404).json({
      message:
        "Route not found",
    });
  }
);

const PORT =
  process.env.PORT ||
  5000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);