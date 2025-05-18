const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middlewares/auth");
const { ethers } = require("ethers");

router.post("/", authenticate, async (req, res) => {
  try {
    const { wallet_address } = req.body;

    // Validate the wallet address format
    if (!wallet_address || !ethers.isAddress(wallet_address)) {
      return res.status(400).json({ message: "Invalid wallet address format" });
    }

    const userId = req.user.id;

    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", wallet_address)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Supabase Error:", checkError);
      return res.status(500).json({ message: "Failed to check wallet address" });
    }

    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ message: "Wallet address already in use" });
    }

    // Update the user's wallet address in the database
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ wallet_address })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase Error:", updateError);
      return res
        .status(500)
        .json({ message: "Failed to update wallet address" });
    }

    // Return the updated user response
    res.json({
      id: updatedUser.id,
      wallet_address: updatedUser.wallet_address,
      discord_id: updatedUser.discord_id,
      twitter_id: updatedUser.twitter_id,
      twitter_username: updatedUser.twitter_username,
      username: updatedUser.username,
      avatar: updatedUser.avatar,
      is_admin: updatedUser.is_admin,
      can_vote: updatedUser.can_vote,
      discord_role: updatedUser.discord_role,
    });
  } catch (error) {
    console.error("Error updating wallet address:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
