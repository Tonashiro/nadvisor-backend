const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/", async (req, res) => {
  try {
    const { data: uniqueVotersData, error: uniqueVotersError } = await supabase
      .from("votes")
      .select("user_id", { count: "exact" });

    if (uniqueVotersError) throw uniqueVotersError;

    const uniqueVotersCount = new Set(
      uniqueVotersData.map((vote) => vote.user_id)
    ).size;

    const { count: totalVotesCount, error: totalVotesError } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true });

    if (totalVotesError) throw totalVotesError;

    const { count: totalProjectsCount, error: totalProjectsError } =
      await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

    if (totalProjectsError) throw totalProjectsError;

    res.json({
      uniqueVoters: uniqueVotersCount,
      totalVotes: totalVotesCount,
      totalProjects: totalProjectsCount,
    });
  } catch (error) {
    console.error("Error while retrieving stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
