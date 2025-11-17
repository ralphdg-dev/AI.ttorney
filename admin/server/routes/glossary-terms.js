const express = require("express");
const { authenticateAdmin } = require("../middleware/auth");
const { supabaseAdmin } = require("../config/supabase");

const router = express.Router();

// Audit logging utility function
const logAuditEvent = async (
  action,
  targetTable,
  targetId,
  actorId,
  role,
  metadata = {}
) => {
  try {
    const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
      action,
      target_table: targetTable,
      target_id: targetId,
      actor_id: actorId,
      role: role,
      metadata: metadata,
    });

    if (error) {
      // Audit log error
    }
  } catch (error) {
    // Failed to log audit event
  }
};

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
      countQuery = countQuery.or(
        `term_en.ilike.%${searchTerm}%,term_fil.ilike.%${searchTerm}%,definition_en.ilike.%${searchTerm}%,definition_fil.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,verified_by.ilike.%${searchTerm}%`
      );
    }

    if (category && category !== "all") {
      countQuery = countQuery.eq("category", category.toLowerCase());
    }

    if (status && status !== "all") {
      switch (status) {
        case "verified":
          countQuery = countQuery.eq("is_verified", true);
          break;
        case "unverified":
          countQuery = countQuery.eq("is_verified", false);
          break;
        case "pending":
          countQuery = countQuery.is("is_verified", null);
          break;
      }
    }

    // Execute queries
    const [{ data: terms, error: termsError }, { count, error: countError }] =
      await Promise.all([query.range(offset, offset + limit - 1), countQuery]);

    if (termsError) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch glossary terms: " + termsError.message,
      });
    }

    if (countError) {
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
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Create new glossary term with audit logging
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

    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

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
    };

    const { data: newTerm, error } = await supabaseAdmin
      .from("glossary_terms")
      .insert(termData)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: "Failed to create glossary term: " + error.message,
      });
    }

    // Log audit event for term creation
    await logAuditEvent(
      `Added new term "${newTerm.term_en}"`,
      "glossary_terms",
      newTerm.id,
      adminId,
      role,
      {
        term_name: newTerm.term_en,
        category: newTerm.category,
        is_verified: newTerm.is_verified,
        has_filipino_term: !!newTerm.term_fil,
        has_definitions: !!(newTerm.definition_en || newTerm.definition_fil),
        has_examples: !!(newTerm.example_en || newTerm.example_fil),
        action_type: "create",
      }
    );

    res.status(201).json({
      success: true,
      message: "Glossary term created successfully",
      data: newTerm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Bulk create glossary terms from CSV with audit logging
router.post("/bulk", authenticateAdmin, async (req, res) => {
  try {
    const { terms } = req.body;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

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

    const createdTerms = [];

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
        };

        const { data: newTerm, error } = await supabaseAdmin
          .from("glossary_terms")
          .insert(termData)
          .select()
          .single();

        if (error) {
          results.failed++;
          results.errors.push({
            index: i + 1,
            term: term.term_en,
            error: error.message,
          });
        } else {
          results.created++;
          createdTerms.push(newTerm);

          // Log individual term creation from bulk upload
          await logAuditEvent(
            `Added new term "${newTerm.term_en}"`,
            "glossary_terms",
            newTerm.id,
            adminId,
            role,
            {
              term_name: newTerm.term_en,
              category: newTerm.category,
              is_verified: newTerm.is_verified,
              upload_batch: true,
              batch_index: i + 1,
              action_type: "create_bulk",
            }
          );
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

    // Log overall bulk upload action
    if (results.created > 0) {
      await logAuditEvent(
        "Uploaded Bulk Terms",
        "glossary_terms",
        "bulk_upload",
        adminId,
        role,
        {
          total_terms: terms.length,
          created_count: results.created,
          failed_count: results.failed,
          file_type: "CSV",
          successful_terms: createdTerms.map((t) => t.term_en),
          action_type: "bulk_upload",
        }
      );
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
    res.status(500).json({
      success: false,
      error: "Internal server error: " + error.message,
    });
  }
});

// Update glossary term with detailed audit logging for each field change
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

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
      audit_logs,
    } = req.body;

    // Check if term exists and get current data
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
      return res.status(500).json({
        success: false,
        error: "Failed to update glossary term: " + updateError.message,
      });
    }

    // Handle detailed audit logs from frontend
    if (audit_logs) {
      try {
        const logs = JSON.parse(audit_logs);
        for (const log of logs) {
          await logAuditEvent(log.action, "glossary_terms", id, adminId, role, {
            term_name: existingTerm.term_en,
            ...log.metadata,
            action_type: "edit_field",
          });
        }
      } catch (parseError) {
        // Error parsing audit logs - fallback to individual field change detection
        await logIndividualFieldChanges(
          existingTerm,
          updatedTerm,
          adminId,
          role,
          id
        );
      }
    } else {
      // Log individual field changes if no detailed logs provided
      await logIndividualFieldChanges(
        existingTerm,
        updatedTerm,
        adminId,
        role,
        id
      );
    }

    res.json({
      success: true,
      message: "Glossary term updated successfully",
      data: updatedTerm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Helper function to log individual field changes
const logIndividualFieldChanges = async (
  existingTerm,
  updatedTerm,
  adminId,
  role,
  termId
) => {
  const changes = [];

  // Check English Term
  if (existingTerm.term_en !== updatedTerm.term_en) {
    changes.push({
      action: `Changed English Term from "${
        existingTerm.term_en || "Not set"
      }" to "${updatedTerm.term_en || "Not set"}"`,
      field: "term_en",
      from: existingTerm.term_en,
      to: updatedTerm.term_en,
    });
  }

  // Check Filipino Term
  if (existingTerm.term_fil !== updatedTerm.term_fil) {
    changes.push({
      action: `Changed Filipino Term from "${
        existingTerm.term_fil || "Not set"
      }" to "${updatedTerm.term_fil || "Not set"}"`,
      field: "term_fil",
      from: existingTerm.term_fil,
      to: updatedTerm.term_fil,
    });
  }

  // Check English Definition
  if (existingTerm.definition_en !== updatedTerm.definition_en) {
    changes.push({
      action: `Changed English Definition from "${
        existingTerm.definition_en || "Not set"
      }" to "${updatedTerm.definition_en || "Not set"}"`,
      field: "definition_en",
      from: existingTerm.definition_en,
      to: updatedTerm.definition_en,
    });
  }

  // Check Filipino Definition
  if (existingTerm.definition_fil !== updatedTerm.definition_fil) {
    changes.push({
      action: `Changed Filipino Definition from "${
        existingTerm.definition_fil || "Not set"
      }" to "${updatedTerm.definition_fil || "Not set"}"`,
      field: "definition_fil",
      from: existingTerm.definition_fil,
      to: updatedTerm.definition_fil,
    });
  }

  // Check English Example
  if (existingTerm.example_en !== updatedTerm.example_en) {
    changes.push({
      action: `Changed English Example from "${
        existingTerm.example_en || "Not set"
      }" to "${updatedTerm.example_en || "Not set"}"`,
      field: "example_en",
      from: existingTerm.example_en,
      to: updatedTerm.example_en,
    });
  }

  // Check Filipino Example
  if (existingTerm.example_fil !== updatedTerm.example_fil) {
    changes.push({
      action: `Changed Filipino Example from "${
        existingTerm.example_fil || "Not set"
      }" to "${updatedTerm.example_fil || "Not set"}"`,
      field: "example_fil",
      from: existingTerm.example_fil,
      to: updatedTerm.example_fil,
    });
  }

  // Check Category
  if (existingTerm.category !== updatedTerm.category) {
    changes.push({
      action: `Changed Category from "${
        existingTerm.category || "Not set"
      }" to "${updatedTerm.category || "Not set"}"`,
      field: "category",
      from: existingTerm.category,
      to: updatedTerm.category,
    });
  }

  // Check Verification Status
  if (existingTerm.is_verified !== updatedTerm.is_verified) {
    const fromStatus =
      existingTerm.is_verified === null
        ? "Pending"
        : existingTerm.is_verified
        ? "Verified"
        : "Unverified";
    const toStatus =
      updatedTerm.is_verified === null
        ? "Pending"
        : updatedTerm.is_verified
        ? "Verified"
        : "Unverified";
    changes.push({
      action: `Changed Verification Status from "${fromStatus}" to "${toStatus}"`,
      field: "is_verified",
      from: fromStatus,
      to: toStatus,
    });
  }

  // Log each change as a separate audit entry
  for (const change of changes) {
    await logAuditEvent(
      change.action,
      "glossary_terms",
      termId,
      adminId,
      role,
      {
        term_name: updatedTerm.term_en,
        field: change.field,
        previous_value: change.from,
        new_value: change.to,
        action_type: "edit_field",
      }
    );
  }

  // If no changes were detected but update was called, log a general edit
  if (changes.length === 0) {
    await logAuditEvent(
      `Edited term "${updatedTerm.term_en}"`,
      "glossary_terms",
      termId,
      adminId,
      role,
      {
        term_name: updatedTerm.term_en,
        category: updatedTerm.category,
        action_type: "edit_general",
      }
    );
  }
};

// Delete glossary term with audit logging
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

    // Check if term exists
    const { data: existingTerm, error: fetchError } = await supabaseAdmin
      .from("glossary_terms")
      .select("id, term_en, category, is_verified")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Glossary term not found",
        });
      }

    return res.status(500).json({
        success: false,
        error: "Failed to fetch glossary term: " + fetchError.message,
      });
    }

    const { data: archivedTerm, error: deleteError } = await supabaseAdmin
      .from("glossary_terms")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (deleteError) {
      return res.status(500).json({
        success: false,
        error: "Failed to archive glossary term: " + deleteError.message,
      });
    }

    // Log archive action
    await logAuditEvent(
      `Archived term "${existingTerm.term_en}"`,
      "glossary_terms",
      id,
      adminId,
      role,
      {
        term_name: existingTerm.term_en,
        category: existingTerm.category,
        was_verified: existingTerm.is_verified,
        archived_at: new Date().toISOString(),
        action_type: "archive",
      }
    );

    res.json({
      success: true,
      message: "Glossary term archived successfully",
      data: archivedTerm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Restore glossary term (if you implement soft delete/archive functionality)
router.patch("/:id/restore", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

    // Check if term exists in archive (you'll need to implement this logic based on your archive system)
    const { data: existingTerm, error: fetchError } = await supabaseAdmin
      .from("glossary_terms")
      .select("id, term_en, category")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Glossary term not found",
        });
      }

    return res.status(500).json({
        success: false,
        error: "Failed to fetch glossary term: " + fetchError.message,
      });
    }

    // Implement your restore logic here (set deleted_at to null, etc.)
    // This is a placeholder - adjust based on your archive system
    const { data: restoredTerm, error: restoreError } = await supabaseAdmin
      .from("glossary_terms")
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (restoreError) {
      return res.status(500).json({
        success: false,
        error: "Failed to restore glossary term: " + restoreError.message,
      });
    }

    // Log restore action
    await logAuditEvent(
      `Restored term "${existingTerm.term_en}"`,
      "glossary_terms",
      id,
      adminId,
      role,
      {
        term_name: existingTerm.term_en,
        category: existingTerm.category,
        restored_at: new Date().toISOString(),
        action_type: "restore",
      }
    );

    res.json({
      success: true,
      message: "Glossary term restored successfully",
      data: restoredTerm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// View term action logging
router.post("/:id/view", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

    // Verify term exists
    const { data: term, error: fetchError } = await supabaseAdmin
      .from("glossary_terms")
      .select("id, term_en, category")
      .eq("id", id)
      .single();

    if (fetchError || !term) {
      return res.status(404).json({
        success: false,
        error: "Term not found",
      });
    }

    // Log view action
    await logAuditEvent(
      `Viewed term "${term.term_en}"`,
      "glossary_terms",
      id,
      adminId,
      role,
      {
        term_name: term.term_en,
        category: term.category,
        action_type: "view",
      }
    );

    res.json({
      success: true,
      message: "View action logged successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

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

    // Enrich with actor full names
    let enrichedLogs = auditLogs || [];
    try {
      const actorIds = [...new Set((auditLogs || []).map(l => l.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        const { data: users, error: usersErr } = await supabaseAdmin
          .from('users')
          .select('id, full_name')
          .in('id', actorIds);
        if (!usersErr && Array.isArray(users)) {
          const map = new Map(users.map(u => [u.id, u.full_name]));
          enrichedLogs = (auditLogs || []).map(l => ({ ...l, actor_name: map.get(l.actor_id) || null }));
        }
      }
    } catch {}

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("target_id", id)
      .eq("target_table", "glossary_terms");

    res.json({
      success: true,
      data: enrichedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
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
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
