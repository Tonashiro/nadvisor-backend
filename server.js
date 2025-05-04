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

// Initialisation de l'application
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet()); // Sécurité
app.use(cors()); // CORS pour les requêtes du frontend
app.use(express.json()); // Parser JSON
app.use(morgan("dev")); // Logging
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/votes", votesRoutes);
app.use("/api/health", healthRoute);

// Route racine
app.get("/", (req, res) => {
  res.json({
    message:
      "API de vote pour projets - Documentation disponible sur /api/docs",
  });
});

// Documentation simple
app.get("/api/docs", (req, res) => {
  res.json({
    endpoints: [
      {
        path: "/api/auth/discord",
        method: "GET",
        description: "Obtenir l'URL d'authentification Discord",
      },
      {
        path: "/api/auth/discord/callback",
        method: "GET",
        description: "Callback pour authentification Discord",
      },
      {
        path: "/api/auth/me",
        method: "GET",
        description: "Obtenir les informations de l'utilisateur connecté",
      },
      {
        path: "/api/projects",
        method: "GET",
        description: "Récupérer tous les projets avec filtres",
      },
      {
        path: "/api/projects/:id",
        method: "GET",
        description: "Récupérer un projet par ID",
      },
      {
        path: "/api/projects",
        method: "POST",
        description: "Créer un nouveau projet (admin uniquement)",
      },
      {
        path: "/api/projects/:id",
        method: "PUT",
        description: "Mettre à jour un projet (admin uniquement)",
      },
      {
        path: "/api/projects/:id",
        method: "DELETE",
        description: "Supprimer un projet (admin uniquement)",
      },
      {
        path: "/api/votes/:projectId",
        method: "POST",
        description:
          "Voter pour un projet (utilisateurs avec rôle MON uniquement)",
      },
      {
        path: "/api/votes/:projectId",
        method: "DELETE",
        description: "Annuler un vote",
      },
      {
        path: "/api/votes/me",
        method: "GET",
        description: "Obtenir tous les votes de l'utilisateur connecté",
      },
      {
        path: "/api/health",
        method: "GET",
        description: "Database health check",
      },
    ],
  });
});

// Middleware de gestion d'erreur
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Erreur serveur, veuillez réessayer plus tard" });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
