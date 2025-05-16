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
      return res.status(400).json({ message: "Authorization code required" });
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
    } catch (error) {
      console.log("User not a member of the Monad server or Discord API error");
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
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect with token in the URL
    res.redirect(`${process.env.DISCORD_RETURN_TO}?token=${token}`);
  } catch (error) {
    console.error("Discord Authentication Error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
});

router.get("/twitter", (req, res) => {
  const scope = [
    "tweet.read",
    "users.read",
    "like.write",
    "tweet.write",
    "offline.access",
  ].join(" ");

  const state = req.query.state || "xyz";

  const url = new URL("https://twitter.com/i/oauth2/authorize");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID);
  url.searchParams.set("redirect_uri", process.env.TWITTER_REDIRECT_URI);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", "challenge");
  url.searchParams.set("code_challenge_method", "plain");

  res.redirect(url.toString());
});

router.get("/twitter/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: "Missing code" });

    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.TWITTER_CLIENT_ID,
      redirect_uri: process.env.TWITTER_REDIRECT_URI,
      code_verifier: "challenge",
    });

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString(
            "base64"
          ),
      },
      body,
    });

    if (!tokenRes.ok) {
      const error = await tokenRes.text();

      console.error("Token Error:", error);

      return res.status(400).send("Failed to get Twitter token");
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token } = tokenData;

    const userRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      const error = await userRes.text();

      console.error("User Info Error:", error);

      return res.status(400).send("Failed to get Twitter user");
    }

    const userData = await userRes.json();
    const twitterUser = userData.data;

    const jwtToken = req.cookies.token;
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Save Twitter data and tokens into Supabase
    const { error } = await supabase
      .from("users")
      .update({
        twitter_id: twitterUser.id,
        twitter_username: twitterUser.username,
        twitter_access_token: access_token,
        twitter_refresh_token: refresh_token,
      })
      .eq("id", userId);

    if (error) {
      console.error("Supabase Error:", error);

      return res
        .status(500)
        .json({ message: "Failed to link Twitter account" });
    }

    res.redirect(`${process.env.TWITTER_RETURN_TO}?twitter_connect=true`);
  } catch (err) {
    console.error("Twitter Callback Error:", err);

    res.status(500).json({ message: "Twitter callback failed" });
  }
});

router.get("/twitter/tokens", authenticate, async (req, res) => {
  try {
    const { id } = req.user;

    const { data, error } = await supabase
      .from("users")
      .select("twitter_access_token, twitter_refresh_token")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ message: "Failed to retrieve tokens" });
    }

    res.json({ access_token: data.twitter_access_token });
  } catch (err) {
    console.error("Error retrieving tokens:", err);
    res.status(500).json({ message: "Server error" });
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
  });
});

module.exports = router;
