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
    const {
      status,
      category,
      sort = "created_at",
      order = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    // Build the base query
    let query = supabase.from("projects").select(`
        *,
        created_by:users(username, avatar),
        categories:project_categories(category:categories(id, name))
      `);

    // Filter by status if specified
    if (status) {
      query = query.eq("status", status);
    }

    // Sorting and pagination
    query = query
      .order(sort, { ascending: order === "asc" })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

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

    // Format the response
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

    // Get the total count for pagination
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
      github,
      categories,
      status = "PENDING",
    } = req.body;

    // Basic validation
    if (!name || !description) {
      return res.status(400).json({ message: "Name and description required" });
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
        github,
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

    // Add categories if specified
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
          .json({ message: "A project with this name already exists" });
      }
      throw error;
    }

    // Update categories if specified
    if (categories) {
      // Delete existing links
      await supabase.from("project_categories").delete().eq("project_id", id);

      // Add new links
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

    // Retrieve categories associated with the project
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
        return res.status(400).json({ message: "This category already exists" });
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
