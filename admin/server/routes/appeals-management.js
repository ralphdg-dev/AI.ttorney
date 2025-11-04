const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

/**
 * ================================
 * GET /appeals-management
 * Fetch all appeals with search, filter, and pagination
 * ================================
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      status = 'all' // all, approved, rejected, pending, archived
    } = req.query;

    const offset = (page - 1) * limit;

    // Main query
    let query = supabaseAdmin
      .from('suspension_appeals')
      .select('*')
      .order('created_at', { ascending: false });

    // Search filter (checks multiple fields)
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`
        user_id.ilike.%${s}%,
        suspension_id.ilike.%${s}%,
        appeal_reason.ilike.%${s}%,
        additional_context.ilike.%${s}%,
        reviewed_by.ilike.%${s}%,
        admin_notes.ilike.%${s}%,
        rejection_reason.ilike.%${s}%
      `);
    }

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('status', status.toLowerCase());
    }

    // Count query for pagination
    const countQuery = supabaseAdmin
      .from('suspension_appeals')
      .select('id', { count: 'exact', head: true });

    if (search && search.trim()) {
      const s = search.trim();
      countQuery.or(`
        user_id.ilike.%${s}%,
        suspension_id.ilike.%${s}%,
        appeal_reason.ilike.%${s}%,
        additional_context.ilike.%${s}%,
        reviewed_by.ilike.%${s}%,
        admin_notes.ilike.%${s}%,
        rejection_reason.ilike.%${s}%
      `);
    }

    if (status && status !== 'all') {
      countQuery.eq('status', status.toLowerCase());
    }

    // Execute in parallel
    const [{ data: appeals, error: appealsError }, { count, error: countError }] =
      await Promise.all([query.range(offset, offset + limit - 1), countQuery]);

    if (appealsError) {
      console.error('Error fetching appeals:', appealsError);
      return res.status(500).json({ success: false, error: appealsError.message });
    }

    if (countError) {
      console.error('Error counting appeals:', countError);
      return res.status(500).json({ success: false, error: countError.message });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    res.json({
      success: true,
      data: appeals || [],
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
    console.error('Error in get appeals route:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * ================================
 * GET /appeals-management/:id
 * Fetch single appeal by ID
 * ================================
 */
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('suspension_appeals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Appeal not found' });
      }
      throw error;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in get appeal by id:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * ================================
 * PATCH /appeals-management/:id
 * Update appeal status or admin notes
 * ================================
 */
router.patch('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      reviewed_by,
      reviewed_at,
      admin_notes,
      rejection_reason,
    } = req.body;

    // Check if exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('suspension_appeals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Appeal not found' });
      }
      throw fetchError;
    }

    // Prepare update payload
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status.toLowerCase();
    if (reviewed_by !== undefined) updateData.reviewed_by = reviewed_by?.trim() || null;
    if (reviewed_at !== undefined) updateData.reviewed_at = reviewed_at || new Date().toISOString();
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes?.trim() || null;
    if (rejection_reason !== undefined) updateData.rejection_reason = rejection_reason?.trim() || null;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('suspension_appeals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: 'Appeal updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error in patch appeal:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * ================================
 * DELETE /appeals-management/:id
 * Delete appeal (hard delete)
 * ================================
 */
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify existence
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('suspension_appeals')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Appeal not found' });
      }
      throw fetchError;
    }

    const { error: deleteError } = await supabaseAdmin
      .from('suspension_appeals')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Appeal deleted successfully' });
  } catch (error) {
    console.error('Error in delete appeal:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
