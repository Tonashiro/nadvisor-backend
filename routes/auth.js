// routes/auth.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { authenticate } = require("../middlewares/auth");

router.get("/discord", (req, res) => {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
  const scope = "identify email guilds.members.read";

  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=${encodeURIComponent(scope)}`;

  res.json({ url });
});

router.get("/discord/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: "Authorization code required" });
    }

    // Exchange the code for a Discord token
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Retrieve Discord user information
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Retrieve member status in the Monad server
    let hasMonadRole = false;
    let monadRole = null;
    try {
      const memberResponse = await axios.get(
        `https://discord.com/api/users/@me/guilds/${process.env.MONAD_SERVER_ID}/member`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      // Check if the user has the MON role
      hasMonadRole = memberResponse.data.roles.includes(
        process.env.MONAD_ROLE_ID
      );

      // Stocker le rôle exact
      monadRole = memberResponse.data.roles[0] || null;
    } catch (error) {
      console.log(
        "User is not a member of the Monad server or Discord API error"
      );
    }

    // Check if the user is an admin
    const isAdmin = process.env.ADMIN_DISCORD_IDS.split(",").includes(
      userResponse.data.id
    );

    // Find or create the user in Supabase
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("discord_id", userResponse.data.id)
      .maybeSingle();

    let user;

    if (existingUser) {
      // Update the existing user
      const { data: updatedUser } = await supabase
        .from("users")
        .update({
          username: userResponse.data.username,
          avatar: userResponse.data.avatar,
          is_admin: isAdmin,
          has_monad_role: hasMonadRole,
          monad_role: monadRole,
        })
        .eq("discord_id", userResponse.data.id)
        .select()
        .single();

      user = updatedUser;
    } else {
      // Create a new user
      const { data: newUser } = await supabase
        .from("users")
        .insert({
          discord_id: userResponse.data.id,
          username: userResponse.data.username,
          avatar: userResponse.data.avatar,
          is_admin: isAdmin,
          has_monad_role: hasMonadRole,
          monad_role: monadRole,
        })
        .select()
        .single();

      user = newUser;
    }

    // Generate JWT for authentication
    const token = jwt.sign(
      {
        id: user.id,
        discord_id: user.discord_id,
        is_admin: user.is_admin,
        has_monad_role: user.has_monad_role,
        monad_role: user.monad_role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        is_admin: user.is_admin,
        has_monad_role: user.has_monad_role,
        monad_role: user.monad_role,
      },
    });
  } catch (error) {
    console.error("Discord authentication error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
});

// Retrieve the currently logged-in user
router.get("/me", authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    avatar: req.user.avatar,
    is_admin: req.user.is_admin,
    has_monad_role: req.user.has_monad_role,
    monad_role: req.user.monad_role,
  });
});

module.exports = router;
