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

  res.redirect(url);
});

router.get("/discord/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ message: "Code d'autorisation requis" });
    }

    // Échanger le code contre un token Discord
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        return_to: process.env.DISCORD_RETURN_TO,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Récupérer les infos de l'utilisateur Discord
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Récupérer le statut du membre dans le serveur Monad
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

      // Vérifier si l'utilisateur a le rôle MON
      hasMonadRole = memberResponse.data.roles.includes(
        process.env.MONAD_ROLE_ID
      );

      // Stocker le rôle exact
      monadRole = memberResponse.data.roles[0] || null;
    } catch (error) {
      console.log(
        "Utilisateur pas membre du serveur Monad ou erreur API Discord"
      );
    }

    // Vérifier si c'est un admin
    const isAdmin = process.env.ADMIN_DISCORD_IDS.split(",").includes(
      userResponse.data.id
    );

    // Rechercher ou créer l'utilisateur dans Supabase
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("discord_id", userResponse.data.id)
      .maybeSingle();

    let user;

    if (existingUser) {
      // Mettre à jour l'utilisateur existant
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
      // Créer un nouvel utilisateur
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

    // Générer JWT pour l'authentification
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

    res.cookie("discord", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // or "strict"
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    res.redirect(process.env.DISCORD_RETURN_TO);
  } catch (error) {
    console.error("Erreur d'authentification Discord:", error);
    res.status(500).json({ message: "Échec de l'authentification" });
  }
});

// Récupérer l'utilisateur actuellement connecté
router.get("/me", authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    discord_id: req.user.discord_id,
    username: req.user.username,
    avatar: req.user.avatar,
    is_admin: req.user.is_admin,
    has_monad_role: req.user.has_monad_role,
    monad_role: req.user.monad_role,
  });
});

module.exports = router;
