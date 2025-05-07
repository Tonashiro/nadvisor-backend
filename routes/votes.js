// routes/votes.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate, canVote } = require("../middlewares/auth");

// Vote for a project (requires MON role)
router.post("/:projectId", authenticate, canVote, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { voteType } = req.body;
    const userId = req.user.id;

    // Validation
    if (!voteType || !["FOR", "AGAINST"].includes(voteType)) {
      return res
        .status(400)
        .json({ message: "Invalid vote type (FOR or AGAINST required)" });
    }

    // Check if the project exists
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projectError) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if the user has already voted
    const { data: existingVote, error: voteError } = await supabase
      .from("votes")
      .select("id, vote_type, created_at")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (voteError && voteError.code !== "PGRST116") {
      throw voteError;
    }

    let result;

    if (existingVote) {
      // If the vote is the same, do nothing
      if (existingVote.vote_type === voteType) {
        return res
          .status(400)
          .json({ message: "You have already voted this way" });
      }

      // Otherwise, update the existing vote
      const { data, error } = await supabase
        .from("votes")
        .update({
          vote_type: voteType,
          last_modified_at: new Date(),
        })
        .eq("id", existingVote.id)
        .select()
        .single();

      if (error) throw error;
      result = { data, updated: true };
    } else {
      // Create a new vote
      const { data, error } = await supabase
        .from("votes")
        .insert({
          user_id: userId,
          project_id: projectId,
          vote_type: voteType,
          last_modified_at: new Date(),
        })
        .select()
        .single();

      if (error) throw error;
      result = { data, created: true };
    }

    // Retrieve updated vote stats
    const { data: updatedProject, error: statsError } = await supabase
      .from("projects")
      .select("votes_for, votes_against")
      .eq("id", projectId)
      .single();

    if (statsError) throw statsError;

    res.json({
      message: result.updated ? "Vote updated" : "Vote recorded",
      vote: result.data,
      stats: {
        votesFor: updatedProject.votes_for,
        votesAgainst: updatedProject.votes_against,
        total: updatedProject.votes_for + updatedProject.votes_against,
        score: updatedProject.votes_for - updatedProject.votes_against,
      },
    });
  } catch (error) {
    console.error("Error while voting:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Cancel a vote
router.delete("/:projectId", authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Check if the vote exists
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .single();

    if (voteError) {
      return res.status(404).json({ message: "Vote not found" });
    }

    // Delete the vote
    const { error: deleteError } = await supabase
      .from("votes")
      .delete()
      .eq("id", vote.id);

    if (deleteError) throw deleteError;

    // Retrieve updated vote stats
    const { data: updatedProject, error: statsError } = await supabase
      .from("projects")
      .select("votes_for, votes_against")
      .eq("id", projectId)
      .single();

    if (statsError) throw statsError;

    res.json({
      message: "Vote canceled",
      stats: {
        votesFor: updatedProject.votes_for,
        votesAgainst: updatedProject.votes_against,
        total: updatedProject.votes_for + updatedProject.votes_against,
        score: updatedProject.votes_for - updatedProject.votes_against,
      },
    });
  } catch (error) {
    console.error("Error while canceling the vote:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get votes of the logged-in user
router.get("/me", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("votes")
      .select(
        `
        id,
        vote_type,
        created_at,
        project:projects(id, name)
      `
      )
      .eq("user_id", req.user.id);

    if (error) throw error;

    // Format the response
    const formattedVotes = data.map((vote) => ({
      id: vote.id,
      projectId: vote.project.id,
      projectName: vote.project.name,
      voteType: vote.vote_type,
      createdAt: vote.created_at,
    }));

    res.json(formattedVotes);
  } catch (error) {
    console.error("Error while retrieving votes:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Check if the user has voted for a specific project
router.get("/:projectId/check", authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from("votes")
      .select("vote_type")
      .eq("user_id", req.user.id)
      .eq("project_id", projectId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    res.json({
      hasVoted: !!data,
      voteType: data ? data.vote_type : null,
    });
  } catch (error) {
    console.error("Error while checking the vote:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
