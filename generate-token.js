// generate-token.js
require("dotenv").config();
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not defined in the .env file!");
  process.exit(1);
}

// Use the actual ID of an existing user in your users table
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
