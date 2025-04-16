// generate-token.js
require("dotenv").config();
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET n'est pas défini dans le fichier .env!");
  process.exit(1);
}

// Utilisez l'ID réel d'un utilisateur existant dans votre table users
const token = jwt.sign(
  {
    id: "692abdbb-21fa-4553-9d56-58606d8c59db",
    discord_id: "123456789",
    is_admin: true,
    has_monad_role: true,
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("Utilisez ce token dans Postman:");
console.log(token);
