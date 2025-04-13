// routes/votes.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate, canVote } = require("../middlewares/auth");

// Voter pour un projet (nécessite le rôle MON)
router.post("/:projectId", authenticate, canVote, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { voteType } = req.body;
    const userId = req.user.id;

    // Validation
    if (!voteType || !["FOR", "AGAINST"].includes(voteType)) {
      return res
        .status(400)
        .json({ message: "Type de vote invalide (FOR ou AGAINST requis)" });
    }

    // Vérifier si le projet existe
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();

    if (projectError) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    // Vérifier si l'utilisateur a déjà voté
    const { data: existingVote, error: voteError } = await supabase
      .from("votes")
      .select("id, vote_type")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (voteError && voteError.code !== "PGRST116") {
      throw voteError;
    }

    let result;

    if (existingVote) {
      // Si le vote est identique, ne rien faire
      if (existingVote.vote_type === voteType) {
        return res
          .status(400)
          .json({ message: "Vous avez déjà voté de cette façon" });
      }

      // Sinon, mettre à jour le vote existant
      const { data, error } = await supabase
        .from("votes")
        .update({ vote_type: voteType })
        .eq("id", existingVote.id)
        .select()
        .single();

      if (error) throw error;
      result = { data, updated: true };
    } else {
      // Créer un nouveau vote
      const { data, error } = await supabase
        .from("votes")
        .insert({
          user_id: userId,
          project_id: projectId,
          vote_type: voteType,
        })
        .select()
        .single();

      if (error) throw error;
      result = { data, created: true };
    }

    // Récupérer les stats de vote mises à jour
    const { data: updatedProject, error: statsError } = await supabase
      .from("projects")
      .select("votes_for, votes_against")
      .eq("id", projectId)
      .single();

    if (statsError) throw statsError;

    res.json({
      message: result.updated ? "Vote mis à jour" : "Vote enregistré",
      vote: result.data,
      stats: {
        votesFor: updatedProject.votes_for,
        votesAgainst: updatedProject.votes_against,
        total: updatedProject.votes_for + updatedProject.votes_against,
        score: updatedProject.votes_for - updatedProject.votes_against,
      },
    });
  } catch (error) {
    console.error("Erreur lors du vote:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Annuler un vote
router.delete("/:projectId", authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Vérifier si le vote existe
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .single();

    if (voteError) {
      return res.status(404).json({ message: "Vote non trouvé" });
    }

    // Supprimer le vote
    const { error: deleteError } = await supabase
      .from("votes")
      .delete()
      .eq("id", vote.id);

    if (deleteError) throw deleteError;

    // Récupérer les stats de vote mises à jour
    const { data: updatedProject, error: statsError } = await supabase
      .from("projects")
      .select("votes_for, votes_against")
      .eq("id", projectId)
      .single();

    if (statsError) throw statsError;

    res.json({
      message: "Vote annulé",
      stats: {
        votesFor: updatedProject.votes_for,
        votesAgainst: updatedProject.votes_against,
        total: updatedProject.votes_for + updatedProject.votes_against,
        score: updatedProject.votes_for - updatedProject.votes_against,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation du vote:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Obtenir les votes de l'utilisateur connecté
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

    // Formater la réponse
    const formattedVotes = data.map((vote) => ({
      id: vote.id,
      projectId: vote.project.id,
      projectName: vote.project.name,
      voteType: vote.vote_type,
      createdAt: vote.created_at,
    }));

    res.json(formattedVotes);
  } catch (error) {
    console.error("Erreur lors de la récupération des votes:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Vérifier si l'utilisateur a voté pour un projet spécifique
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
    console.error("Erreur lors de la vérification du vote:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
