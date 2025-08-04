// routes/projects.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate, isAdmin } = require("../middlewares/auth");

router.get("/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error while retrieving categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { category, page = 1, limit = 10, onlyNew, q } = req.query;

    // Build the base query
    let query = supabase.from("projects").select(`
        *,
        created_by:users(username, avatar),
        categories:project_categories(category:categories(id, name)),
        votes_breakdown:project_votes_by_role(role, votes_for, votes_against)
      `);

    // Add search functionality
    if (q && q.trim()) {
      const searchTerm = q.trim();
      query = query.ilike('name', `%${searchTerm}%`);
    }

    if (onlyNew === "true") {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      query = query.gt("created_at", threeDaysAgo.toISOString());
    }

    // Fetch projects
    const { data, error } = await query;

    if (error) throw error;

    // Filter projects by category if necessary (client-side due to join)
    let filteredProjects = data;
    if (category) {
      filteredProjects = data.filter((project) =>
        project.categories.some(
          (c) => c.category.id === category || c.category.name === category
        )
      );
    }

    // Calculate the total upvotes from NAD, OG, and MON roles for sorting
    const relevantRoles = ["NAD", "OG", "MON"];
    const sortedProjects = filteredProjects
      .map((project) => {
        const relevantVotes = project.votes_breakdown
          .filter((vote) => relevantRoles.includes(vote.role))
          .reduce((sum, vote) => sum + vote.votes_for, 0);

        return {
          ...project,
          relevantVotes,
        };
      })
      .sort((a, b) => {
        // Prioritize nads_verified projects first
        if (a.nads_verified !== b.nads_verified) {
          return b.nads_verified - a.nads_verified;
        }
        // Then sort by relevantVotes in descending order
        return b.relevantVotes - a.relevantVotes;
      });

    // Paginate the results
    const paginatedProjects = sortedProjects.slice(
      (page - 1) * limit,
      page * limit
    );

    // Get the total count for pagination
    const totalCount = sortedProjects.length;

    // Format the response for frontend compatibility
    const formattedProjects = paginatedProjects.map((project) => ({
      ...project,
      created_by: project.created_by
        ? {
            username: project.created_by.username,
            avatar: project.created_by.avatar,
          }
        : null,
      categories: project.categories.map((c) => c.category),
      votes_breakdown: project.votes_breakdown || [],
    }));

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
    console.error("Error while retrieving projects:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Retrieve a project by its ID
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
        return res.status(404).json({ message: "Project not found" });
      }
      throw error;
    }

    // Format the response
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
    console.error("Error while retrieving the project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new project (admin only)
router.post("/", authenticate, isAdmin, async (req, res) => {
  try {
    console.log("req.user:", req);
    const {
      name,
      description,
      website,
      twitter,
      discord,
      logo_url,
      banner_url,
      categories,
      status = "PENDING",
    } = req.body;

    // Basic validation
    if (!name || !description) {
      return res.status(400).json({ message: "Name and description required" });
    }

    // Validate categories array
    if (
      categories &&
      (!Array.isArray(categories) || categories.some((id) => !id))
    ) {
      return res.status(400).json({ message: "Invalid categories array" });
    }

    // Check if all category IDs exist in the categories table
    const { data: validCategories, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .in("id", categories);

    if (categoryError) {
      console.error("Error while validating categories:", categoryError);
      return res.status(500).json({ message: "Failed to validate categories" });
    }

    if (validCategories.length !== categories.length) {
      return res
        .status(400)
        .json({ message: "One or more category IDs are invalid" });
    }

    // Insert the project
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name,
        description,
        website,
        twitter,
        discord,
        status,
        logo_url,
        banner_url,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // Uniqueness violation
        return res
          .status(400)
          .json({ message: "A project with this name already exists" });
      }
      throw error;
    }

    // Link the project to the categories
    const categoryLinks = categories.map((categoryId) => ({
      project_id: project.id,
      category_id: categoryId,
    }));

    const { error: categoryLinkError } = await supabase
      .from("project_categories")
      .insert(categoryLinks);

    if (categoryLinkError) throw categoryLinkError;

    // Fetch the linked categories
    const { data: projectCategories, error: fetchError } = await supabase
      .from("project_categories")
      .select("category:categories(id, name, description)")
      .eq("project_id", project.id);

    if (fetchError) throw fetchError;

    const formattedCategories = projectCategories.map((pc) => pc.category);

    res.status(201).json({
      ...project,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Error while creating the project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a project (admin only)
router.put("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      website,
      twitter,
      discord,
      categories,
      status,
      logo_url,
      banner_url,
    } = req.body;

    // Validate categories array
    if (
      categories &&
      (!Array.isArray(categories) ||
        categories.length < 1 ||
        categories.length > 3)
    ) {
      return res
        .status(400)
        .json({ message: "Categories must contain between 1 and 3 valid IDs" });
    }

    // Check if the project exists
    const { data: existingProject, error: checkError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Update the project
    const { data: project, error } = await supabase
      .from("projects")
      .update({
        name,
        description,
        website,
        twitter,
        discord,
        status,
        logo_url,
        banner_url,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(400)
          .json({ message: "A project with this name already exists" });
      }
      throw error;
    }

    // Update categories if specified
    if (categories) {
      // Check if all category IDs exist in the categories table
      const { data: validCategories, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .in("id", categories);

      if (categoryError) {
        console.error("Error while validating categories:", categoryError);
        return res
          .status(500)
          .json({ message: "Failed to validate categories" });
      }

      if (validCategories.length !== categories.length) {
        return res
          .status(400)
          .json({ message: "One or more category IDs are invalid" });
      }

      // Delete existing links
      await supabase.from("project_categories").delete().eq("project_id", id);

      // Add new links
      const categoryLinks = categories.map((categoryId) => ({
        project_id: id,
        category_id: categoryId,
      }));

      const { error: categoryLinkError } = await supabase
        .from("project_categories")
        .insert(categoryLinks);

      if (categoryLinkError) throw categoryLinkError;
    }

    // Fetch the linked categories
    const { data: projectCategories, error: fetchError } = await supabase
      .from("project_categories")
      .select("category:categories(id, name, description)")
      .eq("project_id", id);

    if (fetchError) throw fetchError;

    const formattedCategories = projectCategories.map((pc) => pc.category);

    res.json({
      ...project,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error("Error while updating the project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a project (admin only)
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) throw error;

    res.json({ message: "Project successfully deleted" });
  } catch (error) {
    console.error("Error while deleting the project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a category (admin only)
router.post("/categories", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name required" });
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(400)
          .json({ message: "This category already exists" });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error("Error while creating the category:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
