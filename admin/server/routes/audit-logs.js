const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all audit logs with filtering and pagination
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      table = '',
      action = '',
      date_range = '',
      sort = 'newest'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build the base query
    let query = supabaseAdmin
      .from('admin_audit_logs')
      .select(`
        id,
        action,
        target_table,
        target_id,
        actor_id,
        role,
        metadata,
        created_at
      `);

    // Apply search filter
    if (search) {
      query = query.or(`action.ilike.%${search}%,target_table.ilike.%${search}%,role.ilike.%${search}%`);
    }

    // Apply table filter
    if (table) {
      query = query.eq('target_table', table);
    }

    // Apply action filter
    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    // Apply date range filter
    if (date_range) {
      const now = new Date();
      let startDate;

      switch (date_range.toLowerCase()) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this week':
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'this month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last 30 days':
          startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    // Apply sorting
    switch (sort.toLowerCase()) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'action a-z':
        query = query.order('action', { ascending: true });
        break;
      case 'action z-a':
        query = query.order('action', { ascending: false });
        break;
      case 'table a-z':
        query = query.order('target_table', { ascending: true });
        break;
      case 'table z-a':
        query = query.order('target_table', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Get total count for pagination (without pagination applied)
    const countQuery = supabaseAdmin
      .from('admin_audit_logs')
      .select('id', { count: 'exact', head: true });

    // Apply same filters to count query
    if (search) {
      countQuery.or(`action.ilike.%${search}%,target_table.ilike.%${search}%,role.ilike.%${search}%`);
    }
    if (table) {
      countQuery.eq('target_table', table);
    }
    if (action) {
      countQuery.ilike('action', `%${action}%`);
    }

    // Apply pagination to main query
    query = query.range(offset, offset + limit - 1);

    // Execute both queries
    const [{ data: auditLogs, error: logsError }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ]);

    if (logsError) {
      // Error fetching audit logs
      // Check if table doesn't exist
      if (logsError.code === '42P01') {
        return res.status(404).json({ 
          success: false, 
          error: 'Audit logs table not found. Please set up the database table first.',
          setup_required: true
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch audit logs: ' + logsError.message 
      });
    }

    if (countError) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get audit logs count: ' + countError.message 
      });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    res.json({
      success: true,
      data: auditLogs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: totalPages
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Get audit log by ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: auditLog, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false, 
          error: 'Audit log not found' 
        });
      }
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch audit log: ' + error.message 
      });
    }

    res.json({
      success: true,
      data: auditLog
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Export audit logs (CSV format)
router.get('/export/csv', authenticateAdmin, async (req, res) => {
  try {
    const { 
      search = '', 
      table = '',
      action = '',
      date_range = '',
      format = 'csv'
    } = req.query;

    // Build the query (similar to main GET but without pagination)
    let query = supabaseAdmin
      .from('admin_audit_logs')
      .select(`
        id,
        action,
        target_table,
        target_id,
        actor_id,
        role,
        metadata,
        created_at
      `)
      .order('created_at', { ascending: false });

    // Apply same filters as main query
    if (search) {
      query = query.or(`action.ilike.%${search}%,target_table.ilike.%${search}%,role.ilike.%${search}%`);
    }
    if (table) {
      query = query.eq('target_table', table);
    }
    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    // Apply date range filter
    if (date_range) {
      const now = new Date();
      let startDate;

      switch (date_range.toLowerCase()) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'this week':
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getTime() - (dayOfWeek * 24 * 60 * 60 * 1000));
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'this month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last 30 days':
          startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    const { data: auditLogs, error } = await query;

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to export audit logs: ' + error.message 
      });
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = 'ID,Action,Table,Target ID,Actor ID,Role,Date,Metadata\n';
      const csvRows = auditLogs.map(log => {
        const metadata = log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : '';
        return `"${log.id}","${log.action}","${log.target_table}","${log.target_id || ''}","${log.actor_id || ''}","${log.role || ''}","${log.created_at}","${metadata}"`;
      }).join('\n');

      const csv = csvHeaders + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: auditLogs || [],
        exported_at: new Date().toISOString()
      });
    }

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Get audit logs statistics
router.get('/stats/summary', authenticateAdmin, async (req, res) => {
  try {
    // Get total logs count
    const { count: totalLogs, error: totalError } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('id', { count: 'exact', head: true });

    if (totalError) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get total logs count: ' + totalError.message 
      });
    }

    // Get logs from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentLogs, error: recentError } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    if (recentError) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get recent logs count: ' + recentError.message 
      });
    }

    // Get most active tables
    const { data: tableStats, error: tableError } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('target_table')
      .gte('created_at', yesterday);

    if (tableError) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get table stats: ' + tableError.message 
      });
    }

    // Count occurrences of each table
    const tableCounts = {};
    tableStats?.forEach(log => {
      tableCounts[log.target_table] = (tableCounts[log.target_table] || 0) + 1;
    });

    const topTables = Object.entries(tableCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([table, count]) => ({ table, count }));

    res.json({
      success: true,
      data: {
        total_logs: totalLogs || 0,
        recent_logs_24h: recentLogs || 0,
        top_tables: topTables,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Setup endpoint to check if audit logs table exists and provide setup instructions
router.get('/setup/check', authenticateAdmin, async (req, res) => {
  try {
    // Try to query the table
    const { data, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      return res.json({
        success: false,
        table_exists: false,
        message: 'Audit logs table does not exist',
        setup_instructions: {
          step1: 'Go to your Supabase Dashboard',
          step2: 'Navigate to SQL Editor',
          step3: 'Run the provided SQL script',
          sql: `
-- Table already exists as admin_audit_logs
-- Insert sample data
INSERT INTO admin_audit_logs (action, target_table, target_id, actor_id, role, metadata) VALUES
('Admin Login', 'admin', '1', gen_random_uuid(), 'admin', '{"ip": "127.0.0.1"}'),
('View Legal Seekers', 'legal_seekers', null, gen_random_uuid(), 'admin', '{"action_type": "view"}'),
('Update Lawyer Status', 'lawyers', '123', gen_random_uuid(), 'superadmin', '{"old_status": "pending", "new_status": "active"}'),
('Export Data', 'admin_audit_logs', null, gen_random_uuid(), 'admin', '{"format": "csv"}'),
('Create Glossary Term', 'glossary_terms', '456', gen_random_uuid(), 'admin', '{"term": "Legal Term", "definition": "Sample definition"}');`
        }
      });
    } else if (error) {
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    } else {
      return res.json({
        success: true,
        table_exists: true,
        message: 'Audit logs table is ready',
        record_count: data?.length || 0
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

module.exports = router;
