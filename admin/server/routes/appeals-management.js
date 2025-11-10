const express = require("express");
const { supabaseAdmin } = require("../config/supabase");
const { authenticateAdmin } = require("../middleware/auth");

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
      console.error("Audit log error:", error);
    }
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
};

/**
 * ================================
 * GET /appeals-management
 * Fetch all appeals joined with user's full name
 * ================================
 */
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "all" } = req.query;

    const offset = (page - 1) * limit;

    const { data: appeals, error: appealsError } = await supabaseAdmin
      .from("suspension_appeals")
      .select(
        `
    *,
    user:users!suspension_appeals_user_id_fkey (
      id,
      full_name
    ),
    suspension:user_suspensions!suspension_appeals_suspension_id_fkey (
      id,
      reason
    ),
    reviewer:admin!suspension_appeals_reviewed_by_fkey1 (
      id,
      full_name
    )
  `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (appealsError) {
      console.error("Error fetching appeals:", appealsError);
      return res
        .status(500)
        .json({ success: false, error: appealsError.message });
    }

    const { count, error: countError } = await supabaseAdmin
      .from("suspension_appeals")
      .select("id", { count: "exact", head: true });

    if (countError) {
      console.error("Error counting appeals:", countError);
      return res
        .status(500)
        .json({ success: false, error: countError.message });
    }

    let formatted = (appeals || []).map((a) => ({
      ...a,
      user_full_name: a.user?.full_name || "Unknown User",
      suspension_reason: a.suspension?.reason || "No reason specified",
      reviewed_by: a.reviewer?.full_name || "N/A",
    }));

    // 🔹 Filtering
    if (search.trim()) {
      const q = search.toLowerCase();
      formatted = formatted.filter(
        (a) =>
          Object.values(a).some((v) => String(v).toLowerCase().includes(q)) ||
          a.user_full_name.toLowerCase().includes(q)
      );
    }

    if (status !== "all") {
      formatted = formatted.filter(
        (a) => a.status?.toLowerCase() === status.toLowerCase()
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    res.json({
      success: true,
      data: formatted,
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
    console.error("Error in get appeals route:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * ================================
 * GET /appeals-management/:id
 * Fetch single appeal joined with user's name
 * ================================
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("suspension_appeals")
      .select(
        `
    *,
    user:users!suspension_appeals_user_id_fkey (
      id,
      full_name
    ),
    reviewer:admin!suspension_appeals_reviewed_by_fkey1 (
      id,
      full_name
    )
  `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching appeal:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    data.user_full_name = data.user?.full_name || "Unknown User";
    data.reviewed_by = data.reviewer?.full_name || "N/A";

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error in get appeal by id:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * ================================
 * PATCH /appeals-management/:id
 * Update appeal status or admin notes with audit logging
 * ================================
 */
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, rejection_reason } = req.body;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("suspension_appeals")
      .select(
        `
        *,
        user:users!suspension_appeals_user_id_fkey (
          full_name
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Appeal not found" });
      }
      throw fetchError;
    }

    const updateData = {
      updated_at: new Date().toISOString(),
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status.toLowerCase();
    if (admin_notes !== undefined)
      updateData.admin_notes = admin_notes?.trim() || null;
    if (rejection_reason !== undefined)
      updateData.rejection_reason = rejection_reason?.trim() || null;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("suspension_appeals")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        user:users!suspension_appeals_user_id_fkey (
          full_name
        ),
        reviewer:admin!suspension_appeals_reviewed_by_fkey1 (
          full_name
        )
      `
      )
      .single();

    if (updateError) throw updateError;

    // Log the appeal action with detailed metadata
    const userFullName = existing.user?.full_name || "Unknown User";
    const reviewerName = req.admin.full_name || "Admin";

    if (status) {
      const previousStatus = existing.status || "pending";
      const newStatus = status.toLowerCase();

      if (newStatus === "approved") {
        await logAuditEvent(
          `Approved appeal for user "${userFullName}"`,
          "suspension_appeals",
          id,
          adminId,
          role,
          {
            user_name: userFullName,
            appeal_id: id,
            previous_status: previousStatus,
            new_status: newStatus,
            admin_notes: admin_notes || null,
            reviewed_by: reviewerName,
            action_type: "appeal_approved",
          }
        );
      } else if (newStatus === "rejected") {
        await logAuditEvent(
          `Rejected appeal for user "${userFullName}"`,
          "suspension_appeals",
          id,
          adminId,
          role,
          {
            user_name: userFullName,
            appeal_id: id,
            previous_status: previousStatus,
            new_status: newStatus,
            admin_notes: admin_notes || null,
            rejection_reason: rejection_reason || null,
            reviewed_by: reviewerName,
            action_type: "appeal_rejected",
          }
        );
      }
    } else {
      // Log admin notes update only
      await logAuditEvent(
        `Updated admin notes for appeal from user "${userFullName}"`,
        "suspension_appeals",
        id,
        adminId,
        role,
        {
          user_name: userFullName,
          appeal_id: id,
          admin_notes: admin_notes || null,
          action_type: "appeal_notes_updated",
        }
      );
    }

    // Format response data
    const responseData = {
      ...updated,
      user_full_name: updated.user?.full_name || "Unknown User",
      reviewed_by: updated.reviewer?.full_name || reviewerName,
    };

    res.json({
      success: true,
      message: "Appeal updated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error in patch appeal:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * ================================
 * DELETE /appeals-management/:id
 * Delete appeal with audit logging
 * ================================
 */
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("suspension_appeals")
      .select(
        `
        *,
        user:users!suspension_appeals_user_id_fkey (
          full_name
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return res
          .status(404)
          .json({ success: false, error: "Appeal not found" });
      }
      throw fetchError;
    }

    const { error: deleteError } = await supabaseAdmin
      .from("suspension_appeals")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    // Log appeal deletion
    const userFullName = existing.user?.full_name || "Unknown User";
    await logAuditEvent(
      `Deleted appeal from user "${userFullName}"`,
      "suspension_appeals",
      id,
      adminId,
      role,
      {
        user_name: userFullName,
        appeal_id: id,
        previous_status: existing.status || "pending",
        appeal_reason: existing.appeal_reason || null,
        action_type: "appeal_deleted",
      }
    );

    res.json({ success: true, message: "Appeal deleted successfully" });
  } catch (error) {
    console.error("Error in delete appeal:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * ================================
 * GET /appeals-management/:id/audit-logs
 * Get appeal audit logs
 * ================================
 */
router.get("/:id/audit-logs", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // First verify the appeal exists
    const { data: appeal, error: appealError } = await supabaseAdmin
      .from("suspension_appeals")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (appealError || !appeal) {
      return res.status(404).json({
        success: false,
        error: "Appeal not found",
      });
    }

    // Get all audit logs for this appeal
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
      .eq("target_table", "suspension_appeals")
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
      .eq("target_table", "suspension_appeals");

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
    console.error("Get appeal audit logs error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * ================================
 * GET /appeals-management/:id/recent-activity
 * Get appeal recent activity
 * ================================
 */
router.get("/:id/recent-activity", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify the appeal exists
    const { data: appeal, error: appealError } = await supabaseAdmin
      .from("suspension_appeals")
      .select("id, user_id, created_at, updated_at")
      .eq("id", id)
      .single();

    if (appealError || !appeal) {
      return res.status(404).json({
        success: false,
        error: "Appeal not found",
      });
    }

    // Get all recent activity for this appeal
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
      .eq("target_table", "suspension_appeals")
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
      .eq("target_table", "suspension_appeals");

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
    console.error("Get appeal recent activity error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * ================================
 * POST /appeals-management/audit-log
 * Create audit log for appeals
 * ================================
 */
router.post("/audit-log", authenticateAdmin, async (req, res) => {
  try {
    const {
      action,
      target_table = "suspension_appeals",
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

/**
 * ================================
 * POST /appeals-management/:id/view
 * Log appeal view action
 * ================================
 */
router.post("/:id/view", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

    // Verify appeal exists
    const { data: appeal, error: fetchError } = await supabaseAdmin
      .from("suspension_appeals")
      .select(
        `
        id,
        user:users!suspension_appeals_user_id_fkey (
          full_name
        )
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !appeal) {
      return res.status(404).json({
        success: false,
        error: "Appeal not found",
      });
    }

    // Log view action
    const userFullName = appeal.user?.full_name || "Unknown User";
    await logAuditEvent(
      `Viewed appeal from user "${userFullName}"`,
      "suspension_appeals",
      id,
      adminId,
      role,
      {
        user_name: userFullName,
        appeal_id: id,
        action_type: "appeal_viewed",
      }
    );

    res.json({
      success: true,
      message: "View action logged successfully",
    });
  } catch (error) {
    console.error("Error logging view action:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
