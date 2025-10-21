const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all forum posts with filtering and pagination
router.get('/posts', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      category = 'all', 
      status = 'all',
      reported = 'all',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabaseAdmin
      .from('forum_posts')
      .select(`
        id,
        content,
        category_id,
        is_anonymous,
        created_at,
        updated_at,
        is_deleted,
        deleted_at,
        deleted_by,
        user:users(id, full_name, email, username, role),
        _count:forum_replies(count),
        reports:forum_reports(
          id,
          reason,
          category,
          created_at,
          reporter:users!forum_reports_user_id_fkey(full_name, email)
        )
      `)
      .range(offset, offset + limit - 1);

    // Add search filter
    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    // Add category filter
    if (category !== 'all') {
      query = query.eq('category_id', category);
    }

    // Add status filter
    if (status === 'active') {
      query = query.eq('is_deleted', false);
    } else if (status === 'deleted') {
      query = query.eq('is_deleted', true);
    }

    // Add reported filter
    if (reported === 'reported') {
      // Only posts with reports
      query = query.not('reports', 'is', null);
    } else if (reported === 'unreported') {
      // Only posts without reports
      query = query.is('reports', null);
    }

    // Add sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' });

    const { data: posts, error } = await query;

    if (error) {
      console.error('Get forum posts error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch forum posts' 
      });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('forum_posts')
      .select('id', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.ilike('content', `%${search}%`);
    }
    if (category !== 'all') {
      countQuery = countQuery.eq('category_id', category);
    }
    if (status === 'active') {
      countQuery = countQuery.eq('is_deleted', false);
    } else if (status === 'deleted') {
      countQuery = countQuery.eq('is_deleted', true);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count forum posts error:', countError);
    }

    res.json({
      success: true,
      data: posts || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get forum posts error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get single forum post details
router.get('/posts/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabaseAdmin
      .from('forum_posts')
      .select(`
        id,
        content,
        category_id,
        is_anonymous,
        created_at,
        updated_at,
        is_deleted,
        deleted_at,
        deleted_by,
        user:users(id, full_name, email, username, role),
        replies:forum_replies(
          id,
          content,
          is_anonymous,
          created_at,
          user:users(id, full_name, email, username, role)
        ),
        reports:forum_reports(
          id,
          reason,
          category,
          reason_context,
          created_at,
          reporter:users!forum_reports_user_id_fkey(id, full_name, email, username)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Forum post not found' 
      });
    }

    res.json({
      success: true,
      data: post
    });

  } catch (error) {
    console.error('Get forum post error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Delete/Flag a forum post
router.patch('/posts/:id/moderate', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'delete' | 'flag' | 'restore'
    const adminId = req.adminId;

    if (!action || !['delete', 'flag', 'restore'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid action. Must be delete, flag, or restore' 
      });
    }

    let updateData = {};
    
    if (action === 'delete') {
      updateData = {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
        moderation_reason: reason || 'Deleted by admin'
      };
    } else if (action === 'flag') {
      updateData = {
        is_flagged: true,
        flagged_at: new Date().toISOString(),
        flagged_by: adminId,
        moderation_reason: reason || 'Flagged by admin'
      };
    } else if (action === 'restore') {
      updateData = {
        is_deleted: false,
        is_flagged: false,
        deleted_at: null,
        deleted_by: null,
        flagged_at: null,
        flagged_by: null,
        moderation_reason: null
      };
    }

    const { data, error } = await supabaseAdmin
      .from('forum_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Forum post not found or update failed' 
      });
    }

    // Log the moderation action
    await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action: `forum_post_${action}`,
        target_type: 'forum_post',
        target_id: id,
        details: { reason, previous_state: data }
      });

    res.json({
      success: true,
      message: `Post ${action}d successfully`,
      data: data
    });

  } catch (error) {
    console.error('Moderate forum post error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get all reported posts
router.get('/reported-posts', authenticateAdmin, async (req, res) => {
  try {
    console.log('Reported posts endpoint called with query:', req.query);
    
    const { 
      page = 1, 
      limit = 50, 
      status = 'pending',
      category = 'all',
      sort_by = 'submitted_at',
      sort_order = 'desc'
    } = req.query;
    
    const offset = (page - 1) * limit;

    // Query forum_reports with proper joins to get related data
    let query = supabaseAdmin
      .from('forum_reports')
      .select(`
        id,
        reason,
        reason_context,
        target_type,
        target_id,
        submitted_at,
        reporter:users!forum_reports_reporter_id_fkey(
          id,
          full_name,
          email,
          username
        )
      `)
      .eq('target_type', 'post') // Only get post reports for now
      .range(offset, offset + limit - 1);

    // Note: Your table doesn't have status or category columns
    // We'll filter by reason if category is specified
    if (category !== 'all') {
      // Map category filter to reason field
      const reasonMap = {
        'spam': 'spam',
        'harassment': 'harassment',
        'hate_speech': 'hate_speech',
        'misinformation': 'misinformation',
        'inappropriate': 'inappropriate',
        'other': 'other'
      };
      
      if (reasonMap[category]) {
        query = query.eq('reason', reasonMap[category]);
        console.log(`Filtering by reason: ${reasonMap[category]}`);
      }
    }

    // Sort by submitted_at (your table's timestamp column)
    const sortColumn = sort_by === 'created_at' ? 'submitted_at' : sort_by;
    query = query.order(sortColumn, { ascending: sort_order === 'asc' });

    const { data: reports, error } = await query;

    if (error) {
      console.error('Get reports error:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to fetch reports: ${error.message}`
      });
    }

    console.log(`Found ${reports?.length || 0} reports`);

    // For each report, get the associated post data
    const reportsWithPosts = await Promise.all(
      (reports || []).map(async (report) => {
        if (report.target_type === 'post') {
          const { data: post } = await supabaseAdmin
            .from('forum_posts')
            .select(`
              id,
              content,
              category_id,
              is_anonymous,
              created_at,
              is_deleted,
              user:users(id, full_name, email, username, role)
            `)
            .eq('id', report.target_id)
            .single();

          return {
            ...report,
            status: 'pending', // Default status since your table doesn't have this
            category: report.reason, // Use reason as category
            created_at: report.submitted_at, // Map to expected field name
            post: post || null
          };
        }
        return report;
      })
    );

    // Get total count
    let countQuery = supabaseAdmin
      .from('forum_reports')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'post');

    if (category !== 'all') {
      const reasonMap = {
        'spam': 'spam',
        'harassment': 'harassment',
        'hate_speech': 'hate_speech',
        'misinformation': 'misinformation',
        'inappropriate': 'inappropriate',
        'other': 'other'
      };
      
      if (reasonMap[category]) {
        countQuery = countQuery.eq('reason', reasonMap[category]);
      }
    }

    const { count, error: countError } = await countQuery;

    res.json({
      success: true,
      data: reportsWithPosts || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get reported posts error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Resolve a report
router.patch('/reports/:id/resolve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, resolution_notes } = req.body; // action: 'dismiss' | 'action_taken'
    const adminId = req.adminId;

    if (!action || !['dismiss', 'action_taken'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid action. Must be dismiss or action_taken' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('forum_reports')
      .update({
        status: 'resolved',
        resolution: action,
        resolution_notes: resolution_notes || '',
        resolved_at: new Date().toISOString(),
        resolved_by: adminId
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report not found or update failed' 
      });
    }

    // Log the resolution
    await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_id: adminId,
        action: `report_${action}`,
        target_type: 'forum_report',
        target_id: id,
        details: { resolution_notes }
      });

    res.json({
      success: true,
      message: `Report ${action === 'dismiss' ? 'dismissed' : 'resolved with action'} successfully`,
      data: data
    });

  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get forum statistics
router.get('/statistics', authenticateAdmin, async (req, res) => {
  try {
    // Get various forum statistics
    const [
      totalPosts,
      activePosts,
      deletedPosts,
      totalReports,
      pendingReports,
      resolvedReports
    ] = await Promise.all([
      supabaseAdmin.from('forum_posts').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('forum_posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      supabaseAdmin.from('forum_posts').select('id', { count: 'exact', head: true }).eq('is_deleted', true),
      supabaseAdmin.from('forum_reports').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('forum_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('forum_reports').select('id', { count: 'exact', head: true }).eq('status', 'resolved')
    ]);

    res.json({
      success: true,
      data: {
        posts: {
          total: totalPosts.count || 0,
          active: activePosts.count || 0,
          deleted: deletedPosts.count || 0
        },
        reports: {
          total: totalReports.count || 0,
          pending: pendingReports.count || 0,
          resolved: resolvedReports.count || 0
        }
      }
    });

  } catch (error) {
    console.error('Get forum statistics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;
