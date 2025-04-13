// middlewares/auth.js
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

// Middleware d'authentification de base
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentification requise" });
    }

    // Vérifier le JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Chercher l'utilisateur dans Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("discord_id", decoded.discord_id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

// Vérifier si l'utilisateur est admin
exports.isAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ message: "Accès administrateur requis" });
  }
  next();
};

// Vérifier si l'utilisateur peut voter (rôle MON)
exports.canVote = (req, res, next) => {
  if (!req.user.has_monad_role) {
    return res.status(403).json({ message: "Rôle MON requis pour voter" });
  }
  next();
};
