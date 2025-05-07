// routes/debug.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/check-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*").limit(1);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ working: false, error });
    }

    res.json({ working: true, sample: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ working: false, error: err.message });
  }
});

module.exports = router;
