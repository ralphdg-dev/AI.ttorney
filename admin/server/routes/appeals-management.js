const express = require("express");
const { supabaseAdmin } = require("../config/supabase");
const { authenticateAdmin } = require("../middleware/auth");

const router = express.Router();

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
 * Update appeal status or admin notes
 * ================================
 */
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, rejection_reason } = req.body;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("suspension_appeals")
      .select("*")
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
      reviewed_by: req.admin.id, // ✅ automatically set admin ID
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
      .select()
      .single();

    if (updateError) throw updateError;

    // If approved, lift the user's suspension
    if (updateData.status && updateData.status.toLowerCase() === "approved") {
      try {
        // 1) Mark the related suspension as lifted
        const { error: liftError } = await supabaseAdmin
          .from("user_suspensions")
          .update({
            status: "lifted",
            lifted_at: new Date().toISOString(),
            lifted_by: req.admin.id,
            lifted_reason: "Appeal approved",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.suspension_id);

        if (liftError) throw liftError;

        // 2) Restore the user's account to active and clear suspension_end
        const { error: userUpdateError } = await supabaseAdmin
          .from("users")
          .update({ account_status: "active", suspension_end: null })
          .eq("id", existing.user_id);

        if (userUpdateError) throw userUpdateError;
      } catch (liftErr) {
        console.error("Error lifting suspension after appeal approval:", liftErr);
        return res
          .status(500)
          .json({ success: false, error: "Failed to lift suspension after approval" });
      }
    }

    res.json({
      success: true,
      message: "Appeal updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error in patch appeal:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * ================================
 * DELETE /appeals-management/:id
 * Delete appeal
 * ================================
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error: deleteError } = await supabaseAdmin
      .from("suspension_appeals")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: "Appeal deleted successfully" });
  } catch (error) {
    console.error("Error in delete appeal:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
