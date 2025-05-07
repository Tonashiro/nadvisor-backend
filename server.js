// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// Routes
const authRoutes = require("./routes/auth");
const projectsRoutes = require("./routes/projects");
const votesRoutes = require("./routes/votes");
const healthRoute = require("./routes/health");
const uploadRoutes = require("./routes/uploads");

// Application initialization
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet()); // Security
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true })); // CORS for frontend requests
app.use(express.json()); // JSON parser
app.use(morgan("dev")); // Logging
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/votes", votesRoutes);
app.use("/api/health", healthRoute);
app.use("/api/upload", uploadRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Project voting API - Documentation available at /api/docs",
  });
});

// Simple documentation
app.get("/api/docs", (req, res) => {
  res.json({
    endpoints: [
      {
        path: "/api/auth/discord",
        method: "GET",
        description: "Get the Discord authentication URL",
      },
      {
        path: "/api/auth/discord/callback",
        method: "GET",
        description: "Callback for Discord authentication",
      },
      {
        path: "/api/auth/me",
        method: "GET",
        description: "Get information about the logged-in user",
      },
      {
        path: "/api/projects",
        method: "GET",
        description: "Retrieve all projects with filters",
      },
      {
        path: "/api/projects/:id",
        method: "GET",
        description: "Retrieve a project by ID",
      },
      {
        path: "/api/projects",
        method: "POST",
        description: "Create a new project (admin only)",
      },
      {
        path: "/api/projects/:id",
        method: "PUT",
        description: "Update a project (admin only)",
      },
      {
        path: "/api/projects/:id",
        method: "DELETE",
        description: "Delete a project (admin only)",
      },
      {
        path: "/api/votes/:projectId",
        method: "POST",
        description: "Vote for a project (users with MON role only)",
      },
      {
        path: "/api/votes/:projectId",
        method: "DELETE",
        description: "Cancel a vote",
      },
      {
        path: "/api/votes/me",
        method: "GET",
        description: "Get all votes of the logged-in user",
      },
      {
        path: "/api/health",
        method: "GET",
        description: "Database health check",
      },
    ],
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error, please try again later" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
