const express = require("express");
const { authenticateAdmin } = require("../middleware/auth");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

// Get all glossary terms with filtering, search, and pagination
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = "",
      category = "all",
      status = "all", // all, verified, unverified, pending
    } = req.query;

    const offset = (page - 1) * limit;

    // Build the main query
    let query = supabaseAdmin
      .from("glossary_terms")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(
        `term_en.ilike.%${searchTerm}%,term_fil.ilike.%${searchTerm}%,definition_en.ilike.%${searchTerm}%,definition_fil.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,verified_by.ilike.%${searchTerm}%`
      );
    }

    // Apply category filter
    if (category && category !== "all") {
      query = query.eq("category", category.toLowerCase());
    }

    // Apply status filter
    if (status && status !== "all") {
      switch (status) {
        case "verified":
          query = query.eq("is_verified", true);
          break;
        case "unverified":
          query = query.eq("is_verified", false);
          break;
        case "pending":
          query = query.is("is_verified", null);
          break;
      }
    }

    // Get total count for pagination
    const countQuery = supabaseAdmin
      .from("glossary_terms")
      .select("id", { count: "exact", head: true });

    // Apply same filters to count query
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery.or(
        `term_en.ilike.%${searchTerm}%,term_fil.ilike.%${searchTerm}%,definition_en.ilike.%${searchTerm}%,definition_fil.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,verified_by.ilike.%${searchTerm}%`
      );
    }

    if (category && category !== "all") {
      countQuery.eq("category", category.toLowerCase());
    }

    if (status && status !== "all") {
      switch (status) {
        case "verified":
          countQuery.eq("is_verified", true);
          break;
        case "unverified":
          countQuery.eq("is_verified", false);
          break;
        case "pending":
          countQuery.is("is_verified", null);
          break;
      }
    }

    // Execute queries
    const [{ data: terms, error: termsError }, { count, error: countError }] =
      await Promise.all([query.range(offset, offset + limit - 1), countQuery]);

    if (termsError) {
      console.error("Error fetching glossary terms:", termsError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch glossary terms: " + termsError.message,
      });
    }

    if (countError) {
      console.error("Error counting glossary terms:", countError);
      return res.status(500).json({
        success: false,
        error: "Failed to count glossary terms: " + countError.message,
      });
    }

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: terms || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in glossary terms route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get single glossary term by ID
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: term, error } = await supabaseAdmin
      .from("glossary_terms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Glossary term not found",
        });
      }

      console.error("Error fetching glossary term:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch glossary term: " + error.message,
      });
    }

    res.json({
      success: true,
      data: term,
    });
  } catch (error) {
    console.error("Error in get glossary term route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Create new glossary term
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      term_en,
      term_fil,
      definition_en,
      definition_fil,
      example_en,
      example_fil,
      category,
      is_verified,
      verified_by,
    } = req.body;

    // Validate required fields
    if (!term_en || !category) {
      return res.status(400).json({
        success: false,
        error: "English term and category are required",
      });
    }

    // Validate category
    const validCategories = [
      "family",
      "criminal",
      "civil",
      "labor",
      "consumer",
      "others",
    ];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid category. Must be one of: " + validCategories.join(", "),
      });
    }

    const termData = {
      term_en: term_en.trim(),
      term_fil: term_fil?.trim() || null,
      definition_en: definition_en?.trim() || null,
      definition_fil: definition_fil?.trim() || null,
      example_en: example_en?.trim() || null,
      example_fil: example_fil?.trim() || null,
      category: category.toLowerCase(),
      is_verified: is_verified !== undefined ? is_verified : null,
      verified_by: verified_by?.trim() || null,
      // Let database handle created_at and updated_at with default now() in Asia/Manila timezone
    };

    const { data: newTerm, error } = await supabaseAdmin
      .from("glossary_terms")
      .insert(termData)
      .select()
      .single();

    if (error) {
      console.error("Error creating glossary term:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create glossary term: " + error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Glossary term created successfully",
      data: newTerm,
    });
  } catch (error) {
    console.error("Error in create glossary term route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Bulk create glossary terms from CSV
router.post("/bulk", authenticateAdmin, async (req, res) => {
  try {
    const { terms } = req.body;

    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Terms array is required and must not be empty",
      });
    }

    const validCategories = [
      "family",
      "criminal",
      "civil",
      "labor",
      "consumer",
      "others",
    ];
    const results = {
      created: 0,
      failed: 0,
      errors: [],
    };

    // Process each term
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];

      try {
        // Validate required fields
        if (!term.term_en || !term.category) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            term: term.term_en || "Unknown",
            error: "English term and category are required",
          });
          continue;
        }

        // Validate category
        if (!validCategories.includes(term.category.toLowerCase())) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            term: term.term_en,
            error: `Invalid category. Must be one of: ${validCategories.join(
              ", "
            )}`,
          });
          continue;
        }

        const termData = {
          term_en: term.term_en.trim(),
          term_fil: term.term_fil?.trim() || null,
          definition_en: term.definition_en?.trim() || null,
          definition_fil: term.definition_fil?.trim() || null,
          example_en: term.example_en?.trim() || null,
          example_fil: term.example_fil?.trim() || null,
          category: term.category.toLowerCase(),
          is_verified:
            term.is_verified !== undefined ? term.is_verified : false,
          verified_by: term.verified_by?.trim() || null,
          // Let database handle created_at and updated_at with default now() in Asia/Manila timezone
        };

        const { error } = await supabaseAdmin
          .from("glossary_terms")
          .insert(termData);

        if (error) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            term: term.term_en,
            error: error.message,
          });
        } else {
          results.created++;
        }
      } catch (termError) {
        results.failed++;
        results.errors.push({
          index: i + 1,
          term: term.term_en || "Unknown",
          error: termError.message,
        });
      }
    }

    // Return results
    res.status(results.failed > 0 ? 207 : 201).json({
      success: results.created > 0,
      message: `Bulk upload completed: ${results.created} created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error("Error in bulk create glossary terms route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error: " + error.message,
    });
  }
});

// Update glossary term
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      term_en,
      term_fil,
      definition_en,
      definition_fil,
      example_en,
      example_fil,
      category,
      is_verified,
      verified_by,
    } = req.body;

    // Check if term exists
    const { data: existingTerm, error: fetchError } = await supabaseAdmin
      .from("glossary_terms")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Glossary term not found",
        });
      }

      console.error("Error fetching glossary term:", fetchError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch glossary term: " + fetchError.message,
      });
    }

    // Validate category if provided
    if (category) {
      const validCategories = [
        "family",
        "criminal",
        "civil",
        "labor",
        "consumer",
        "others",
      ];
      if (!validCategories.includes(category.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid category. Must be one of: " + validCategories.join(", "),
        });
      }
    }

    // Build update data
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (term_en !== undefined) updateData.term_en = term_en?.trim() || null;
    if (term_fil !== undefined) updateData.term_fil = term_fil?.trim() || null;
    if (definition_en !== undefined)
      updateData.definition_en = definition_en?.trim() || null;
    if (definition_fil !== undefined)
      updateData.definition_fil = definition_fil?.trim() || null;
    if (example_en !== undefined)
      updateData.example_en = example_en?.trim() || null;
    if (example_fil !== undefined)
      updateData.example_fil = example_fil?.trim() || null;
    if (category !== undefined) updateData.category = category.toLowerCase();
    if (is_verified !== undefined) updateData.is_verified = is_verified;
    if (verified_by !== undefined)
      updateData.verified_by = verified_by?.trim() || null;

    const { data: updatedTerm, error: updateError } = await supabaseAdmin
      .from("glossary_terms")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating glossary term:", updateError);
      return res.status(500).json({
        success: false,
        error: "Failed to update glossary term: " + updateError.message,
      });
    }

    res.json({
      success: true,
      message: "Glossary term updated successfully",
      data: updatedTerm,
    });
  } catch (error) {
    console.error("Error in update glossary term route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Delete glossary term
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if term exists
    const { data: existingTerm, error: fetchError } = await supabaseAdmin
      .from("glossary_terms")
      .select("id, term_en")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Glossary term not found",
        });
      }

      console.error("Error fetching glossary term:", fetchError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch glossary term: " + fetchError.message,
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("glossary_terms")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting glossary term:", deleteError);
      return res.status(500).json({
        success: false,
        error: "Failed to delete glossary term: " + deleteError.message,
      });
    }

    res.json({
      success: true,
      message: "Glossary term deleted successfully",
    });
  } catch (error) {
    console.error("Error in delete glossary term route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }

  // Add these routes to your existing glossary-terms.js backend file

  // Get term audit logs - Real data only
  router.get("/:id/audit-logs", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      // First verify the term exists
      const { data: term, error: termError } = await supabaseAdmin
        .from("glossary_terms")
        .select("id, term_en, category, created_at")
        .eq("id", id)
        .single();

      if (termError || !term) {
        return res.status(404).json({
          success: false,
          error: "Term not found",
        });
      }

      // Get all audit logs for this term
      const { data: auditLogs, error: auditError } = await supabaseAdmin
        .from("admin_audit_logs")
        .select(
          `
        id,
        action,
        target_table,
        actor_id,
        role,
        target_id,
        metadata,
        created_at
      `
        )
        .eq("target_id", id)
        .eq("target_table", "glossary_terms")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (auditError) {
        return res.status(500).json({
          success: false,
          error: "Failed to fetch audit logs: " + auditError.message,
        });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabaseAdmin
        .from("admin_audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("target_id", id)
        .eq("target_table", "glossary_terms");

      res.json({
        success: true,
        data: auditLogs || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / limit),
        },
      });
    } catch (error) {
      console.error("Get term audit logs error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Get term recent activity - Real data only
  router.get("/:id/recent-activity", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      // Verify the term exists
      const { data: term, error: termError } = await supabaseAdmin
        .from("glossary_terms")
        .select("id, term_en, category, created_at, updated_at")
        .eq("id", id)
        .single();

      if (termError || !term) {
        return res.status(404).json({
          success: false,
          error: "Term not found",
        });
      }

      // Get all recent activity for this term
      const { data: recentActivity, error: activityError } = await supabaseAdmin
        .from("admin_audit_logs")
        .select(
          `
        id,
        action,
        target_table,
        actor_id,
        role,
        target_id,
        metadata,
        created_at
      `
        )
        .eq("target_id", id)
        .eq("target_table", "glossary_terms")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (activityError) {
        return res.status(500).json({
          success: false,
          error: "Failed to fetch recent activity: " + activityError.message,
        });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabaseAdmin
        .from("admin_audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("target_id", id)
        .eq("target_table", "glossary_terms");

      res.json({
        success: true,
        data: recentActivity || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          pages: Math.ceil((totalCount || 0) / limit),
        },
      });
    } catch (error) {
      console.error("Get term recent activity error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Create audit log for glossary terms
  router.post("/audit-log", authenticateAdmin, async (req, res) => {
    try {
      const {
        action,
        target_table = "glossary_terms",
        target_id,
        metadata = {},
      } = req.body;

      const adminId = req.admin.id;
      const role = req.admin.role || "admin";

      if (!action || !target_id) {
        return res.status(400).json({
          success: false,
          error: "Action and target_id are required",
        });
      }

      const { data: auditLog, error } = await supabaseAdmin
        .from("admin_audit_logs")
        .insert({
          action,
          target_table,
          target_id,
          actor_id: adminId,
          role,
          metadata,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating audit log:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to create audit log: " + error.message,
        });
      }

      res.status(201).json({
        success: true,
        message: "Audit log created successfully",
        data: auditLog,
      });
    } catch (error) {
      console.error("Error in audit log route:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
});

module.exports = router;
