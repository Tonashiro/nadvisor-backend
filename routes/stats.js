const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");

router.get("/", async (req, res) => {
  try {
    const { data: uniqueVotersData, error: uniqueVotersError } =
      await supabase.rpc("count_distinct_user_ids");

    if (uniqueVotersError) throw uniqueVotersError;

    const uniqueVotersCount = uniqueVotersData || 0;

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
