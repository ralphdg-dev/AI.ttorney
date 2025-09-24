const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all admins (view-only for now, requires superadmin role)
router.get('/', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', role = 'all' } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching admins with params:', { page, limit, search, role });

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

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Add role filter
    if (role !== 'all') {
      query = query.eq('role', role);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: admins, error } = await query;

    if (error) {
      console.error('Get admins error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch admins: ' + error.message 
      });
    }

    console.log('Found admins:', admins?.length || 0);

    // Get auth.users data for last_sign_in_at
    let authUsersData = [];
    if (admins && admins.length > 0) {
      const adminIds = admins.map(admin => admin.id);
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!authError && authUsers) {
        authUsersData = authUsers.users.filter(user => adminIds.includes(user.id));
      } else {
        console.warn('Could not fetch auth users data:', authError);
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

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('admin')
      .select('*', { count: 'exact', head: true });

    console.log('Total admins count:', totalCount);

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
    console.error('Get admins error:', error);
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
    console.error('Get admin details error:', error);
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
    console.error('Get admin stats error:', error);
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
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either active, inactive, or suspended'
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
        created_by: req.admin.email, // Track who created this admin
        created_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
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
          is_verified: true, // Admins are automatically verified
          created_at: new Date().toISOString()
        });
      userError = error;
    } catch (err) {
      console.warn('Users table may not exist or have different schema:', err.message);
      // Continue without users table - admin table is sufficient
      userError = null;
    }

    if (userError) {
      console.error('User record creation error:', userError);
      // Check if it's a schema/table issue
      if (userError.code === '42P01' || userError.message.includes('relation') || userError.message.includes('does not exist')) {
        console.warn('Users table does not exist - continuing with admin table only');
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
        status: status,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (adminError) {
      console.error('Admin record creation error:', adminError);
      
      // Clean up auth user and users table record (if it exists) if admin record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      // Try to clean up users table record if it was created
      try {
        await supabaseAdmin.from('users').delete().eq('id', authUser.user.id);
      } catch (cleanupError) {
        console.warn('Could not clean up users table record (table may not exist):', cleanupError.message);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create admin record: ' + adminError.message
      });
    }

    // Log the creation action
    console.log(`New admin created by ${req.admin.email}: ${newAdmin.email} (${newAdmin.role})`);

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
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Future endpoints for admin management (commented out for now)
/*
// Update admin details (requires superadmin)
router.patch('/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  // Implementation for updating admin
});

// Delete admin (requires superadmin)
router.delete('/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  // Implementation for deleting admin
});

// Update admin role (requires superadmin)
router.patch('/:id/role', authenticateAdmin, requireSuperAdmin, async (req, res) => {
  // Implementation for updating admin role
});
*/

module.exports = router;
