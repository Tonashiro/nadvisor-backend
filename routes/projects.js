// routes/projects.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate, isAdmin } = require("../middlewares/auth");

// Récupérer toutes les catégories
router.get("/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Récupérer tous les projets avec filtres
router.get("/", async (req, res) => {
  try {
    const {
      status,
      category,
      sort = "created_at",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Construire la requête de base
    let query = supabase.from("projects").select(`
        *,
        created_by:users(username, avatar),
        categories:project_categories(category:categories(id, name))
      `);

    // Filtrer par statut si spécifié
    if (status) {
      query = query.eq("status", status);
    }

    // Tri et pagination
    query = query
      .order(sort, { ascending: order === "asc" })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Filtrer les projets par catégorie si nécessaire (côté client car jointure)
    let filteredProjects = data;
    if (category) {
      filteredProjects = data.filter((project) =>
        project.categories.some(
          (c) => c.category.id === category || c.category.name === category
        )
      );
    }

    // Formater la réponse
    const formattedProjects = filteredProjects.map((project) => ({
      ...project,
      created_by: project.created_by
        ? {
            username: project.created_by.username,
            avatar: project.created_by.avatar,
          }
        : null,
      categories: project.categories.map((c) => c.category),
    }));

    // Obtenir le nombre total pour la pagination
    const { count: totalCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    res.json({
      projects: formattedProjects,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des projets:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Récupérer un projet par son ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        *,
        created_by:users(username, avatar),
        categories:project_categories(category:categories(id, name))
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ message: "Projet non trouvé" });
      }
      throw error;
    }

    // Formater la réponse
    const formattedProject = {
      ...data,
      created_by: data.created_by
        ? {
            username: data.created_by.username,
            avatar: data.created_by.avatar,
          }
        : null,
      categories: data.categories.map((c) => c.category),
    };

    res.json(formattedProject);
  } catch (error) {
    console.error("Erreur lors de la récupération du projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Créer un nouveau projet (admin seulement)
router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      website,
      twitter,
      discord,
      github,
      categories,
      status = "PENDING",
    } = req.body;

    // Validation de base
    if (!name || !description) {
      return res.status(400).json({ message: "Nom et description requis" });
    }

    // Insertion du projet
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name,
        description,
        website,
        twitter,
        discord,
        github,
        status,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Violation d'unicité
        return res
          .status(400)
          .json({ message: "Un projet avec ce nom existe déjà" });
      }
      throw error;
    }

    // Ajout des catégories si spécifiées
    if (categories && categories.length > 0) {
      const categoryLinks = categories.map((categoryId) => ({
        project_id: project.id,
        category_id: categoryId,
      }));

      const { error: categoryError } = await supabase
        .from("project_categories")
        .insert(categoryLinks);

      if (categoryError) throw categoryError;
    }

    res.status(201).json(project);
  } catch (error) {
    console.error("Erreur lors de la création du projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      website,
      twitter,
      discord,
      github,
      categories,
      status,
    } = req.body;

    const { data: existingProject, error: checkError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    // Mettre à jour le projet
    const { data: project, error } = await supabase
      .from("projects")
      .update({
        name,
        description,
        website,
        twitter,
        discord,
        github,
        status,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(400)
          .json({ message: "Un projet avec ce nom existe déjà" });
      }
      throw error;
    }

    // Mettre à jour les catégories si spécifiées
    if (categories) {
      // Supprimer les liens existants
      await supabase.from("project_categories").delete().eq("project_id", id);

      // Ajouter les nouveaux liens
      if (categories.length > 0) {
        const categoryLinks = categories.map((categoryId) => ({
          project_id: id,
          category_id: categoryId,
        }));

        const { error: categoryError } = await supabase
          .from("project_categories")
          .insert(categoryLinks);

        if (categoryError) throw categoryError;
      }
    }

    res.json(project);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Supprimer un projet (admin seulement)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) throw error;

    res.json({ message: "Projet supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Ajouter une catégorie (admin seulement)
router.post("/categories", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Nom de catégorie requis" });
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(400).json({ message: "Cette catégorie existe déjà" });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Erreur lors de la création de la catégorie:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
