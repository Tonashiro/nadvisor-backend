// middlewares/auth.js
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

// Basic authentication middleware
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user from Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("discord_id", decoded.discord_id)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Add the user to the request
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Check if the user is an admin
exports.isAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Check if the user can vote (MON role)
exports.canVote = (req, res, next) => {
  if (!req.user.can_vote) {
    return res.status(403).json({ message: "At least FullAccess role required" });
  }
  next();
};
