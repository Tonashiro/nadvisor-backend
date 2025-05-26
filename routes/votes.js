// routes/votes.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate, canVote } = require("../middlewares/auth");

// Vote for a project (requires at least FullAccess role)
router.post("/:projectId", authenticate, canVote, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { voteType } = req.body;
    const userId = req.user.id;
    const userRole = req.user.discord_role;

    // Validation
    if (!voteType || !["FOR", "AGAINST"].includes(voteType)) {
      return res
        .status(400)
        .json({ message: "Invalid vote type (FOR or AGAINST required)" });
    }

    // Check if the project exists
    const { error: projectError } = await supabase
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
      .select("id, vote_type, created_at, user_role")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (voteError && voteError.code !== "PGRST116") {
      throw voteError;
    }

    if (existingVote) {
      // If the vote is the same, delete the existing vote
      if (existingVote.vote_type === voteType) {
        const { error: deleteError } = await supabase
          .from("votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) throw deleteError;

        // Update the breakdown table
        await updateVotesByRole(
          projectId,
          userRole,
          existingVote.vote_type,
          null,
          existingVote.user_role
        );

        // Check and update project verification status
        await checkAndUpdateNadsVerified(projectId);

        // Retrieve updated vote stats and votes breakdown
        const { data: updatedProject, error: statsError } = await supabase
          .from("projects")
          .select(
            "votes_for, votes_against, project_votes_by_role(role, votes_for, votes_against)"
          )
          .eq("id", projectId)
          .single();

        if (statsError) throw statsError;

        const votesBreakdown = updatedProject.project_votes_by_role.map(
          (roleData) => ({
            role: roleData.role,
            votes_for: roleData.votes_for,
            votes_against: roleData.votes_against,
          })
        );

        return res.json({
          message: "Vote removed successfully",
          stats: {
            votesFor: updatedProject.votes_for,
            votesAgainst: updatedProject.votes_against,
            total: updatedProject.votes_for + updatedProject.votes_against,
            score: updatedProject.votes_for - updatedProject.votes_against,
          },
          votesBreakdown,
        });
      }

      // Otherwise, update the existing vote
      const { data, error } = await supabase
        .from("votes")
        .update({
          vote_type: voteType,
          user_role: userRole,
          last_modified_at: new Date(),
        })
        .eq("id", existingVote.id)
        .select()
        .single();

      if (error) throw error;

      // Update the breakdown table
      await updateVotesByRole(
        projectId,
        userRole,
        existingVote.vote_type,
        voteType,
        existingVote.user_role
      );

      // Check and update project verification status
      await checkAndUpdateNadsVerified(projectId);

      // Retrieve updated vote stats and votes breakdown
      const { data: updatedProject, error: statsError } = await supabase
        .from("projects")
        .select(
          "votes_for, votes_against, project_votes_by_role(role, votes_for, votes_against)"
        )
        .eq("id", projectId)
        .single();

      if (statsError) throw statsError;

      const votesBreakdown = updatedProject.project_votes_by_role.map(
        (roleData) => ({
          role: roleData.role,
          votes_for: roleData.votes_for,
          votes_against: roleData.votes_against,
        })
      );

      return res.json({
        message: "Vote updated successfully",
        vote: data,
        stats: {
          votesFor: updatedProject.votes_for,
          votesAgainst: updatedProject.votes_against,
          total: updatedProject.votes_for + updatedProject.votes_against,
          score: updatedProject.votes_for - updatedProject.votes_against,
        },
        votesBreakdown,
      });
    } else {
      // Create a new vote
      const { data, error } = await supabase
        .from("votes")
        .insert({
          user_id: userId,
          project_id: projectId,
          vote_type: voteType,
          user_role: userRole,
          last_modified_at: new Date(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update the breakdown table
      await updateVotesByRole(projectId, userRole, null, voteType);

      // Check and update project verification status
      await checkAndUpdateNadsVerified(projectId);

      // Retrieve updated vote stats and votes breakdown
      const { data: updatedProject, error: statsError } = await supabase
        .from("projects")
        .select(
          "votes_for, votes_against, project_votes_by_role(role, votes_for, votes_against)"
        )
        .eq("id", projectId)
        .single();

      if (statsError) throw statsError;

      const votesBreakdown = updatedProject.project_votes_by_role.map(
        (roleData) => ({
          role: roleData.role,
          votes_for: roleData.votes_for,
          votes_against: roleData.votes_against,
        })
      );

      return res.json({
        message: "Vote recorded successfully",
        vote: data,
        stats: {
          votesFor: updatedProject.votes_for,
          votesAgainst: updatedProject.votes_against,
          total: updatedProject.votes_for + updatedProject.votes_against,
          score: updatedProject.votes_for - updatedProject.votes_against,
        },
        votesBreakdown,
      });
    }
  } catch (error) {
    console.error("Error while voting:", error);
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

    // Retrieve the total votes count
    const totalVotes = formattedVotes.length;

    res.json({
      totalVotes,
      votes: formattedVotes,
    });
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

// Helper function to update the votes breakdown by role
async function updateVotesByRole(
  projectId,
  currentRole,
  oldVoteType,
  newVoteType,
  previousRole = null
) {
  try {
    // If the user's role has changed, decrement the vote from the previous role
    if (previousRole && previousRole !== currentRole) {
      const { data: previousRoleData, error: previousRoleError } =
        await supabase
          .from("project_votes_by_role")
          .select("*")
          .eq("project_id", projectId)
          .eq("role", previousRole)
          .single();

      if (previousRoleError && previousRoleError.code !== "PGRST116") {
        throw previousRoleError;
      }

      if (previousRoleData) {
        const updates = {};
        if (oldVoteType === "FOR")
          updates.votes_for = previousRoleData.votes_for - 1;
        if (oldVoteType === "AGAINST")
          updates.votes_against = previousRoleData.votes_against - 1;

        await supabase
          .from("project_votes_by_role")
          .update(updates)
          .eq("project_id", projectId)
          .eq("role", previousRole);
      }
    }

    // Check if an entry for the current role already exists
    const { data: roleData, error: roleError } = await supabase
      .from("project_votes_by_role")
      .select("*")
      .eq("project_id", projectId)
      .eq("role", currentRole)
      .single();

    if (roleError && roleError.code !== "PGRST116") {
      throw roleError;
    }

    if (roleData) {
      // Update the existing entry
      const updates = {};

      if (oldVoteType === "FOR") updates.votes_for = roleData.votes_for - 1;
      if (oldVoteType === "AGAINST")
        updates.votes_against = roleData.votes_against - 1;

      if (newVoteType === "FOR")
        updates.votes_for = (updates.votes_for || roleData.votes_for) + 1;
      if (newVoteType === "AGAINST")
        updates.votes_against =
          (updates.votes_against || roleData.votes_against) + 1;

      await supabase
        .from("project_votes_by_role")
        .update(updates)
        .eq("project_id", projectId)
        .eq("role", currentRole);
    } else {
      // Create a new entry
      const newEntry = {
        project_id: projectId,
        role: currentRole,
        votes_for: newVoteType === "FOR" ? 1 : 0,
        votes_against: newVoteType === "AGAINST" ? 1 : 0,
      };

      await supabase.from("project_votes_by_role").insert(newEntry);
    }
  } catch (error) {
    console.error("Error while updating votes by role:", error);
    throw error;
  }
}

async function checkAndUpdateNadsVerified(projectId) {
  try {
    const { data: votesByRole, error: votesError } = await supabase
      .from("project_votes_by_role")
      .select("role, votes_for, votes_against")
      .eq("project_id", projectId);

    if (votesError) {
      console.error("Error fetching votes breakdown:", votesError);
      throw votesError;
    }

    const relevantRoles = ["NAD", "OG", "MON"];
    let totalVotes = 0;
    let totalForVotes = 0;

    votesByRole.forEach((vote) => {
      if (relevantRoles.includes(vote.role)) {
        totalVotes += vote.votes_for + vote.votes_against;
        totalForVotes += vote.votes_for;
      }
    });

    // Check if the project meets the criteria
    const isVerified = totalVotes >= 100 && totalForVotes / totalVotes >= 0.8;

    // Update the project with the new verification status
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        nads_verified: isVerified,
        nads_verified_at: isVerified ? new Date() : null,
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error updating project verification status:", updateError);
      throw updateError;
    }
  } catch (error) {
    console.error("Error in checkAndUpdateNadsVerified:", error);
    throw error;
  }
}

module.exports = router;
