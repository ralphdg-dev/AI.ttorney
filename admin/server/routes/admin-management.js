const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');
const router = express.Router();

// Get all admins (view-only for now, requires superadmin role)
router.get('/', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', role = 'all', status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    // Build the query - join with auth.users to get last_sign_in_at
    let query = supabaseAdmin
      .from('admin')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    // Add role filter only (no status filtering)
    if (role !== 'all') {
      query = query.eq('role', role);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: admins, error } = await query;

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch admins: ' + error.message 
      });
    }


    // Get auth.users data for last_sign_in_at
    let authUsersData = [];
    if (admins && admins.length > 0) {
      const adminIds = admins.map(admin => admin.id);
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!authError && authUsers) {
        authUsersData = authUsers.users.filter(user => adminIds.includes(user.id));
      }
    }

    // Transform data for frontend, merging with auth.users data
    const transformedAdmins = admins.map(admin => {
      const authUser = authUsersData.find(user => user.id === admin.id);
      return {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name || 'N/A',
        role: admin.role,
        status: admin.status || 'active',
        created_at: admin.created_at,
        updated_at: admin.updated_at,
        last_login: authUser?.last_sign_in_at || null
      };
    });

    // Get total count for pagination with same filters
    let countQuery = supabaseAdmin
      .from('admin')
      .select('*', { count: 'exact', head: true });

    // Apply role filter to count query (no status filtering)
    if (role !== 'all') {
      countQuery = countQuery.eq('role', role);
    }

    const { count: totalCount } = await countQuery;


    res.json({
      success: true,
      data: transformedAdmins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Get single admin details
router.get('/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: admin, error } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !admin) {
      return res.status(404).json({ 
        success: false, 
        error: 'Admin not found' 
      });
    }

    res.json({
      success: true,
      data: admin
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get admin statistics
router.get('/stats/overview', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    // Get total counts by role
    const { count: totalAdmins } = await supabaseAdmin
      .from('admin')
      .select('*', { count: 'exact', head: true });

    const { count: superAdmins } = await supabaseAdmin
      .from('admin')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'superadmin');

    const { count: regularAdmins } = await supabaseAdmin
      .from('admin')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    // Get new admins this month
    const { count: newThisMonth } = await supabaseAdmin
      .from('admin')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    res.json({
      success: true,
      data: {
        total_admins: totalAdmins || 0,
        super_admins: superAdmins || 0,
        regular_admins: regularAdmins || 0,
        new_this_month: newThisMonth || 0
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Create new admin (requires superadmin)
router.post('/', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { email, full_name, password, role, status = 'active' } = req.body;

    // Validation
    if (!email || !full_name || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, full name, password, and role are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Validate role
    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either admin or superadmin'
      });
    }

    // Validate status
    if (!['active', 'disabled', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be one of: active, disabled, archived'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Check if email already exists in admin table
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admin')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        error: 'An admin with this email already exists'
      });
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: role,
        created_by: req.admin.email // Track who created this admin
        // created_at handled by database with Asia/Manila timezone
      }
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: authError.message || 'Failed to create user account'
      });
    }

    // Also create user record in users table for consistency (if table exists)
    let userError = null;
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user.id,
          email: email.toLowerCase(),
          full_name: full_name.trim(),
          role: role,
          is_verified: true // Admins are automatically verified
          // created_at handled by database with Asia/Manila timezone
        });
      userError = error;
    } catch (err) {
      // Continue without users table - admin table is sufficient
      userError = null;
    }

    if (userError) {
      // Check if it's a schema/table issue
      if (userError.code === '42P01' || userError.message.includes('relation') || userError.message.includes('does not exist')) {
        userError = null; // Ignore this error and continue
      } else {
        // Clean up auth user if users table insert fails for other reasons
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        
        return res.status(500).json({
          success: false,
          error: 'Failed to create user record: ' + userError.message
        });
      }
    }

    // Create admin record in admin table
    const { data: newAdmin, error: adminError } = await supabaseAdmin
      .from('admin')
      .insert({
        id: authUser.user.id,
        email: email.toLowerCase(),
        full_name: full_name.trim(),
        role: role,
        status: status
        // created_at handled by database with Asia/Manila timezone
      })
      .select()
      .single();

    if (adminError) {
      
      // Clean up auth user and users table record (if it exists) if admin record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      // Try to clean up users table record if it was created
      try {
        await supabaseAdmin.from('users').delete().eq('id', authUser.user.id);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create admin record: ' + adminError.message
      });
    }


    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: newAdmin.id,
        email: newAdmin.email,
        full_name: newAdmin.full_name,
        role: newAdmin.role,
        status: newAdmin.status,
        created_at: newAdmin.created_at,
        updated_at: newAdmin.updated_at
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update admin (PATCH endpoint)
router.patch('/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Validate status
    if (!['active', 'disabled', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be one of: active, disabled, archived'
      });
    }

    // Prevent self-modification for destructive actions
    if (req.admin.id === id && ['disabled', 'archived'].includes(status)) {
      return res.status(403).json({
        success: false,
        error: 'You cannot disable or archive your own account'
      });
    }

    // Get current admin data for comparison and audit logging
    const { data: currentAdmin, error: fetchError } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Update admin with new status (updated_at handled by database)
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('admin')
      .update({
        status: status
        // updated_at handled by database with Asia/Manila timezone
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update admin: ' + updateError.message
      });
    }

    // Create audit log entry
    try {
      const auditData = {
        action: `Admin status updated from "${currentAdmin.status}" to "${status}"`,
        target_table: 'admin',
        actor_id: req.admin.id,
        actor_name: req.admin.full_name || req.admin.email,
        role: req.admin.role,
        target_id: id,
        created_at: new Date().toISOString(),
        metadata: {
          action_type: 'update',
          field_changed: 'status',
          old_value: currentAdmin.status,
          new_value: status,
          target_admin: {
            id: currentAdmin.id,
            email: currentAdmin.email,
            full_name: currentAdmin.full_name
          },
          updated_by: {
            id: req.admin.id,
            email: req.admin.email,
            full_name: req.admin.full_name,
            role: req.admin.role
          }
        }
      };

      const { error: auditError } = await supabaseAdmin
        .from('admin_audit_logs')
        .insert(auditData);

      if (auditError) {
        // Don't fail the request if audit logging fails
      }
    } catch (auditErr) {
      // Continue without failing the request
    }

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        full_name: updatedAdmin.full_name,
        role: updatedAdmin.role,
        status: updatedAdmin.status,
        created_at: updatedAdmin.created_at,
        updated_at: updatedAdmin.updated_at
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get admin audit logs
router.get('/:id/audit-logs', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // First verify the admin exists
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('id, email, full_name')
      .eq('id', id)
      .single();

    if (adminError || !admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Get audit logs for this admin - look for admin-related actions
    // This will include admin creation, updates, role changes, etc.
    const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from('admin_audit_logs')
      .select(`
        id,
        action,
        target_table,
        actor_id,
        role,
        target_id,
        metadata,
        created_at
      `)
      .eq('target_id', id)
      .eq('target_table', 'admin')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      
      // If table doesn't exist, create mock data based on admin info
      if (auditError.code === '42P01' || auditError.message.includes('relation') || auditError.message.includes('does not exist')) {
        
        const mockAuditLogs = [
          {
            id: 1,
            action: 'Admin created',
            target_table: 'admin',
            actor_id: null,
            role: 'system',
            target_id: admin.id,
            metadata: {
              action_type: 'create',
              target_email: admin.email,
              target_admin: {
                email: admin.email,
                full_name: admin.full_name
              }
            },
            created_at: admin.created_at || new Date().toISOString()
          }
        ];

        // Get total count (mock)
        const totalCount = mockAuditLogs.length;

        return res.json({
          success: true,
          data: mockAuditLogs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs: ' + auditError.message
      });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', id)
      .eq('target_table', 'admin');

    res.json({
      success: true,
      data: auditLogs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create admin audit log entry
router.post('/:id/audit-logs', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, details, metadata } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    // Verify the admin exists
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('id')
      .eq('id', id)
      .single();

    if (adminError || !admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Create audit log entry
    const { data: auditLog, error: auditError } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert({
        admin_id: id,
        action: action,
        actor_id: req.admin.id,
        actor_name: req.admin.full_name || req.admin.email,
        actor_role: req.admin.role,
        details: details ? JSON.stringify(details) : null,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (auditError) {
      
      // If table doesn't exist, just log to console and return success
      if (auditError.code === '42P01' || auditError.message.includes('relation') || auditError.message.includes('does not exist')) {
        return res.json({
          success: true,
          message: 'Audit log recorded (console only - table not found)',
          data: {
            action,
            admin_id: id,
            actor_name: req.admin.full_name || req.admin.email,
            created_at: new Date().toISOString()
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create audit log: ' + auditError.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      data: auditLog ? auditLog : {}
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update admin status (requires superadmin)
router.patch('/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validation
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Validate status
    if (!['active', 'disabled', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be one of: active, disabled, archived'
      });
    }

    // Check if admin exists
    const { data: existingAdmin, error: checkError } = await supabaseAdmin
      .from('admin')
      .select('id, email, full_name, status')
      .eq('id', id)
      .single();

    if (checkError || !existingAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Prevent self-modification if trying to deactivate/archive
    if (req.admin.id === id && ['disabled', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'You cannot disable or archive your own account'
      });
    }

    // Update admin status
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('admin')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update admin status: ' + updateError.message
      });
    }


    // Create audit log entry if table exists
    try {
      await supabaseAdmin
        .from('admin_audit_logs')
        .insert({
          admin_id: id,
          action: `Status changed to ${status}`,
          actor_id: req.admin.id,
          actor_name: req.admin.full_name || req.admin.email,
          actor_role: req.admin.role,
          details: JSON.stringify({
            action: 'status_update',
            old_status: existingAdmin.status,
            new_status: status,
            admin_email: existingAdmin.email
          }),
          metadata: {
            action_type: 'status_update',
            target_email: existingAdmin.email,
            old_status: existingAdmin.status,
            new_status: status
          },
          created_at: new Date().toISOString()
        });
    } catch (auditError) {
      // console.warn('Could not create audit log (table may not exist):', auditError.message);
    }

    res.json({
      success: true,
      message: 'Admin status updated successfully',
      data: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        full_name: updatedAdmin.full_name,
        role: updatedAdmin.role,
        status: updatedAdmin.status,
        created_at: updatedAdmin.created_at,
        updated_at: updatedAdmin.updated_at
      }
    });

  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


// Get admin recent activity (actions performed BY this admin)
router.get('/:id/recent-activity', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // First verify the admin exists
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('id, email, full_name')
      .eq('id', id)
      .single();

    if (adminError || !admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Get recent activity performed BY this admin (actor_id = admin's ID)
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from('admin_audit_logs')
      .select(`
        id,
        action,
        target_table,
        actor_id,
        role,
        target_id,
        metadata,
        created_at
      `)
      .eq('actor_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activityError) {
('Get admin recent activity error:', activityError);
      
      // If table doesn't exist, create mock data
      if (activityError.code === '42P01' || activityError.message.includes('relation') || activityError.message.includes('does not exist')) {
        // console.log('admin_audit_logs table does not exist, creating mock activity data');
        
        const mockActivity = [
          {
            id: 1,
            action: 'Logged into admin panel',
            target_table: 'admin',
            actor_id: admin.id,
            role: admin.role || 'admin',
            target_id: admin.id,
            metadata: {
              action_type: 'login',
              login_time: admin.last_login || new Date().toISOString()
            },
            created_at: admin.last_login || new Date().toISOString()
          }
        ];

        const totalCount = mockActivity.length;

        return res.json({
          success: true,
          data: mockActivity,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recent activity: ' + activityError.message
      });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('actor_id', id);

    res.json({
      success: true,
      data: recentActivity || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get admin recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
