const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all legal seekers (registered users who are not admins/lawyers)
router.get('/legal-seekers', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all', archived = 'active' } = req.query;
    const offset = (page - 1) * limit;

    // Build the query - show ALL legal seekers (exclude only verified lawyers, admins, and superadmins)
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        email,
        username,
        birthdate,
        created_at,
        updated_at,
        is_verified,
        pending_lawyer,
        role,
        reject_count,
        last_rejected_at,
        is_blocked_from_applying,
        archived,
        strike_count,
        suspension_count,
        suspension_end,
        last_violation_at,
        banned_at,
        banned_reason,
        account_status
      `)
      .not('role', 'in', '("verified_lawyer","admin","superadmin")') // Exclude only verified lawyers and admins
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Add status filter
    if (status !== 'all') {
      if (status === 'verified') {
        query = query.eq('is_verified', true);
      } else if (status === 'unverified') {
        query = query.eq('is_verified', false);
      } else if (status === 'pending_lawyer') {
        query = query.eq('pending_lawyer', true);
      }
    }

    // Add archived filter (handle null values - null means active/not archived)
    if (archived === 'active') {
      query = query.or('archived.is.null,archived.eq.false');
    } else if (archived === 'archived') {
      query = query.eq('archived', true);
    }
    // If archived === 'all', don't add any filter

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      console.error('Get legal seekers error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch legal seekers' 
      });
    }

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      full_name: user.full_name || 'N/A',
      email: user.email,
      username: user.username || 'N/A',
      birthdate: user.birthdate || 'N/A',
      registration_date: user.created_at,
      verification_status: user.is_verified ? 'Verified' : 'Unverified',
      has_lawyer_application: user.pending_lawyer ? 'Yes' : 'No',
      role: user.role,
      archived: user.archived === true || user.archived === 'true',
      // Include moderation fields
      strike_count: user.strike_count || 0,
      reject_count: user.reject_count || 0,
      suspension_count: user.suspension_count || 0,
      suspension_end: user.suspension_end,
      last_violation_at: user.last_violation_at,
      banned_at: user.banned_at,
      banned_reason: user.banned_reason,
      account_status: user.account_status || 'active'
    }));

    // Get total count for pagination with same filters
    let countQuery = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('role', 'in', '("verified_lawyer","admin","superadmin")');

    // Apply same filters as main query
    if (search) {
      countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (status !== 'all') {
      if (status === 'verified') {
        countQuery = countQuery.eq('is_verified', true);
      } else if (status === 'unverified') {
        countQuery = countQuery.eq('is_verified', false);
      } else if (status === 'pending_lawyer') {
        countQuery = countQuery.eq('pending_lawyer', true);
      }
    }

    if (archived === 'active') {
      countQuery = countQuery.or('archived.is.null,archived.eq.false');
    } else if (archived === 'archived') {
      countQuery = countQuery.eq('archived', true);
    }

    const { count: totalCount } = await countQuery;

    res.json({
      success: true,
      data: transformedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get legal seekers error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get legal seekers statistics (must come before /:id route)
router.get('/legal-seekers/stats/overview', authenticateAdmin, async (req, res) => {
  try {
    // Get total counts
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['guest', 'registered_user']);

    const { count: verifiedUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['guest', 'registered_user'])
      .eq('is_verified', true);

    const { count: pendingLawyers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['guest', 'registered_user'])
      .eq('pending_lawyer', true);

    const { count: newThisMonth } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['guest', 'registered_user'])
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    res.json({
      success: true,
      data: {
        total_users: totalUsers || 0,
        verified_users: verifiedUsers || 0,
        unverified_users: (totalUsers || 0) - (verifiedUsers || 0),
        pending_lawyers: pendingLawyers || 0,
        new_this_month: newThisMonth || 0
      }
    });

  } catch (error) {
    console.error('Get legal seekers stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get single legal seeker details
router.get('/legal-seekers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Legal seeker not found' 
      });
    }

    // Check if user is actually a legal seeker (not verified lawyer/admin/superadmin)
    if (['verified_lawyer', 'admin', 'superadmin'].includes(user.role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'User is not a legal seeker' 
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get legal seeker details error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Update legal seeker status (verify/unverify)
router.patch('/legal-seekers/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;

    if (typeof is_verified !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'is_verified must be a boolean value' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_verified
        // updated_at handled by database with Asia/Manila timezone
      })
      .eq('id', id)
      .not('role', 'in', '("verified_lawyer","admin","superadmin")') // Only allow updates to legal seekers
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Legal seeker not found or update failed' 
      });
    }

    res.json({
      success: true,
      message: `User ${is_verified ? 'verified' : 'unverified'} successfully`,
      data: data
    });

  } catch (error) {
    console.error('Update legal seeker status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Delete legal seeker (soft delete by setting role to 'guest')
router.delete('/legal-seekers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // First check if user exists and is a legal seeker
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'Legal seeker not found' 
      });
    }

    if (['verified_lawyer', 'admin', 'superadmin'].includes(existingUser.role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete non-legal seeker accounts' 
      });
    }

    // Soft delete by setting role to 'guest' and clearing verification
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        role: 'guest',
        is_verified: false
        // updated_at handled by database with Asia/Manila timezone
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to delete legal seeker' 
      });
    }

    res.json({
      success: true,
      message: 'Legal seeker account deactivated successfully'
    });

  } catch (error) {
    console.error('Delete legal seeker error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});


// Get all verified lawyers
router.get('/lawyers', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;


    // First, let's try a simpler query to get verified lawyers with lawyer_info
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        email,
        username,
        created_at,
        is_verified,
        lawyer_info (
          accepting_consultations
        )
      `)
      .eq('role', 'verified_lawyer') // Only verified lawyers
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: lawyers, error } = await query;

    if (error) {
      console.error('Get lawyers error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lawyers: ' + error.message 
      });
    }

    // Debug: Log the lawyer_info data to verify the foreign key relationship is working
    console.log('Lawyers with lawyer_info:', lawyers?.map(l => ({
      id: l.id,
      name: l.full_name,
      lawyer_info: l.lawyer_info
    })));


    // Now try to get lawyer applications for these users
    let transformedLawyers = [];
    
    if (lawyers && lawyers.length > 0) {
      const userIds = lawyers.map(lawyer => lawyer.id);
      
      // Get lawyer applications separately - fetch latest version for each user
      const { data: applications, error: appError } = await supabaseAdmin
        .from('lawyer_applications')
        .select('user_id, roll_number, roll_signing_date, status, version, is_latest')
        .in('user_id', userIds)
        .eq('status', 'accepted')
        .order('version', { ascending: false }); // Get highest version first

      if (appError) {
        console.error('Get applications error:', appError);
        // Continue without applications data
      }


      // Process applications to get latest version for each user
      const latestApplications = {};
      if (applications) {
        applications.forEach(app => {
          const userId = app.user_id;
          if (!latestApplications[userId] || 
              app.is_latest === true || 
              (app.version > (latestApplications[userId].version || 0))) {
            latestApplications[userId] = app;
          }
        });
      }

      // Transform data for frontend
      transformedLawyers = lawyers.map(lawyer => {
        const application = latestApplications[lawyer.id];
        // Check accepting_consultations from lawyer_info table
        const lawyerInfo = lawyer.lawyer_info?.[0]; // lawyer_info is an array from the join
        const acceptingConsultations = lawyerInfo?.accepting_consultations === true;
        
        return {
          id: lawyer.id,
          full_name: lawyer.full_name || 'N/A',
          email: lawyer.email,
          username: lawyer.username || 'N/A',
          accepting_consultations: acceptingConsultations,
          roll_number: application?.roll_number || 'N/A',
          roll_sign_date: application?.roll_signing_date || lawyer.created_at,
          status: 'Verified',
          registration_date: lawyer.created_at
        };
      });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'verified_lawyer');


    res.json({
      success: true,
      data: transformedLawyers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get lawyers error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Get single lawyer details
router.get('/lawyers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lawyer, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'verified_lawyer')
      .single();

    if (error || !lawyer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lawyer not found' 
      });
    }

    res.json({
      success: true,
      data: lawyer
    });

  } catch (error) {
    console.error('Get lawyer details error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Update lawyer status (suspend/unsuspend)
router.patch('/lawyers/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;

    if (typeof is_verified !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'is_verified must be a boolean value' 
      });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_verified
        // updated_at handled by database with Asia/Manila timezone
      })
      .eq('id', id)
      .eq('role', 'verified_lawyer')
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lawyer not found or update failed' 
      });
    }

    res.json({
      success: true,
      message: `Lawyer ${is_verified ? 'verified' : 'suspended'} successfully`,
      data: data
    });

  } catch (error) {
    console.error('Update lawyer status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Archive/Unarchive legal seeker
router.patch('/legal-seekers/:id/archive', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;

    // Validate input
    if (typeof archived !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Archived field must be a boolean'
      });
    }

    // Update the user's archived status (only for legal seekers)
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        archived
        // updated_at handled by database with Asia/Manila timezone
      })
      .eq('id', id)
      .not('role', 'in', '("verified_lawyer","admin","superadmin")') // Only allow archiving legal seekers
      .select()
      .single();

    if (error) {
      console.error('Archive user error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update archive status'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${archived ? 'archived' : 'unarchived'} successfully`,
      data: data
    });

  } catch (error) {
    console.error('Archive user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get legal seeker audit logs (actions performed ON this legal seeker)
router.get('/legal-seekers/:id/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // First verify the legal seeker exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'Legal seeker not found'
      });
    }

    // Get audit logs for this legal seeker - look for user-related actions
    // This will include user creation, updates, verification changes, etc.
    const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from('admin_audit_logs')
      .select(`
        id,
        action,
        target_table,
        actor_id,
        actor_name,
        role,
        target_id,
        metadata,
        created_at
      `)
      .eq('target_id', id)
      .eq('target_table', 'users')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      // If table doesn't exist, create mock data based on user info
      if (auditError.code === '42P01' || auditError.message.includes('relation') || auditError.message.includes('does not exist')) {
        const mockAuditLogs = [
          {
            id: 1,
            action: 'User account created',
            target_table: 'users',
            actor_id: null,
            actor_name: 'System',
            role: 'system',
            target_id: user.id,
            metadata: {
              action_type: 'create',
              target_email: user.email,
              target_user: {
                email: user.email,
                full_name: user.full_name
              }
            },
            created_at: new Date().toISOString()
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
      .eq('target_table', 'users');

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

// Create legal seeker audit log entry
router.post('/legal-seekers/:id/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, details, metadata } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    // Verify the legal seeker exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'Legal seeker not found'
      });
    }

    // Create audit log entry with CORRECT DATETIME
    const auditData = {
      action: action,
      target_table: 'users',
      actor_id: req.admin.id,
      actor_name: req.admin.full_name || req.admin.email,
      role: req.admin.role,
      target_id: id,
      metadata: metadata || {},
      created_at: new Date().toISOString() // ENSURE CORRECT DATETIME
    };

    const { data: auditLog, error: auditError } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert(auditData)
      .select()
      .single();

    if (auditError) {
      // If table doesn't exist, just return success with mock data
      if (auditError.code === '42P01' || auditError.message.includes('relation') || auditError.message.includes('does not exist')) {
        return res.json({
          success: true,
          message: 'Audit log recorded (table not found - using fallback)',
          data: {
            action,
            user_id: id,
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

// Update legal seeker status (PATCH endpoint for editing)
router.patch('/legal-seekers/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;

    // Validate required fields
    if (is_verified === undefined || is_verified === null) {
      return res.status(400).json({
        success: false,
        error: 'is_verified status is required'
      });
    }

    // Validate is_verified is boolean
    if (typeof is_verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_verified must be a boolean value'
      });
    }

    // Get current user data for comparison and audit logging
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: 'Legal seeker not found'
      });
    }

    // Update user with new verification status and updated_at timestamp
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        is_verified: is_verified
        // updated_at handled by database with Asia/Manila timezone
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update legal seeker: ' + updateError.message
      });
    }

    // Create audit log entry with CORRECT DATETIME
    try {
      const auditData = {
        action: `Legal seeker verification status updated from "${currentUser.is_verified ? 'verified' : 'unverified'}" to "${is_verified ? 'verified' : 'unverified'}"`,
        target_table: 'users',
        actor_id: req.admin.id,
        actor_name: req.admin.full_name || req.admin.email,
        role: req.admin.role,
        target_id: id,
        created_at: new Date().toISOString(),
        metadata: {
          action_type: 'update',
          field_changed: 'is_verified',
          old_value: currentUser.is_verified,
          new_value: is_verified,
          target_user: {
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.full_name
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
        console.warn('Failed to create audit log:', auditError);
      }
    } catch (auditErr) {
      // Continue without failing the request
      console.warn('Audit logging error:', auditErr);
    }

    res.json({
      success: true,
      message: 'Legal seeker updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        username: updatedUser.username,
        role: updatedUser.role,
        is_verified: updatedUser.is_verified,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        birthdate: updatedUser.birthdate,
        pending_lawyer: updatedUser.pending_lawyer,
        reject_count: updatedUser.reject_count,
        last_rejected_at: updatedUser.last_rejected_at,
        is_blocked_from_applying: updatedUser.is_blocked_from_applying,
        archived: updatedUser.archived
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Add strike to user
router.patch('/legal-seekers/:id/strikes', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'add' | 'remove'
    const adminId = req.admin?.id;

    if (!action || !['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be add or remove'
      });
    }

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, strike_count, reject_count, suspension_count')
      .eq('id', id)
      .single();

    if (fetchError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate new strike count
    const currentStrikes = currentUser.strike_count || 0;
    const newStrikeCount = action === 'add' 
      ? currentStrikes + 1 
      : Math.max(0, currentStrikes - 1);

    // Check if user reaches 3 strikes (suspension threshold)
    let updateData = {
      strike_count: newStrikeCount,
      last_violation_at: action === 'add' ? new Date().toISOString() : currentUser.last_violation_at
    };

    // If adding strikes and reaching 3 strikes = trigger suspension
    if (action === 'add' && newStrikeCount >= 3) {
      const newSuspensionCount = (currentUser.suspension_count || 0) + 1;
      const suspensionEnd = new Date();
      suspensionEnd.setDate(suspensionEnd.getDate() + 7); // 7 days suspension
      
      updateData = {
        strike_count: 0, // Reset strikes to 0 after suspension
        suspension_count: newSuspensionCount,
        suspension_end: suspensionEnd.toISOString(),
        account_status: 'suspended',
        last_violation_at: new Date().toISOString()
      };
    }
    // If removing strikes, just update the count (don't affect suspensions)
    else if (action === 'remove') {
      updateData.strike_count = newStrikeCount;
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update user strikes'
      });
    }

    // Log the action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: `user_strike_${action}`,
        target_type: 'user',
        target_id: id,
        details: { 
          reason, 
          previous_strikes: currentStrikes,
          new_strikes: updateData.strike_count,
          suspension_triggered: action === 'add' && newStrikeCount >= 3,
          suspension_count: updateData.suspension_count || currentUser.suspension_count
        }
      });
    } catch (auditError) {
      console.warn('Failed to log strike action:', auditError.message);
    }

    res.json({
      success: true,
      message: `Strike ${action}ed successfully`,
      data: {
        ...updatedUser,
        total_strikes: updatedUser.strike_count || 0
      }
    });

  } catch (error) {
    console.error('Update user strikes error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Ban/Restrict user
router.patch('/legal-seekers/:id/moderation', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, duration } = req.body; // action: 'ban' | 'restrict' | 'unban'
    const adminId = req.admin?.id;

    if (!action || !['ban', 'restrict', 'unban'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be ban, restrict, or unban'
      });
    }

    // Calculate end date for temporary actions
    let endDate = null;
    if (duration && duration !== 'permanent' && action !== 'unban') {
      const now = new Date();
      const [amount, unit] = duration.split('_');
      const duration_num = parseInt(amount);

      switch (unit) {
        case 'day':
        case 'days':
          endDate = new Date(now.getTime() + duration_num * 24 * 60 * 60 * 1000);
          break;
        case 'week':
        case 'weeks':
          endDate = new Date(now.getTime() + duration_num * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
        case 'months':
          endDate = new Date(now.setMonth(now.getMonth() + duration_num));
          break;
        case 'year':
          endDate = new Date(now.setFullYear(now.getFullYear() + duration_num));
          break;
      }
    }

    // Update user status
    let updateData = {};
    if (action === 'ban') {
      updateData = {
        account_status: 'banned',
        banned_at: new Date().toISOString(),
        banned_reason: reason,
        suspension_end: endDate?.toISOString() || null
      };
    } else if (action === 'restrict') {
      // Since your schema doesn't have restriction, we'll use suspension instead
      updateData = {
        account_status: 'suspended',
        suspension_end: endDate?.toISOString() || null,
        last_violation_at: new Date().toISOString()
      };
    } else if (action === 'unban') {
      updateData = {
        account_status: 'active',
        banned_at: null,
        banned_reason: null,
        suspension_end: null
      };
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }

    // Log the action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: `user_${action}`,
        target_type: 'user',
        target_id: id,
        details: { 
          reason, 
          duration,
          end_date: endDate?.toISOString()
        }
      });
    } catch (auditError) {
      console.warn('Failed to log moderation action:', auditError.message);
    }

    res.json({
      success: true,
      message: `User ${action}ed successfully`,
      data: updatedUser
    });

  } catch (error) {
    console.error('User moderation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get consultation bans
router.get('/consultation-bans', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Get users with consultation ban information
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        email,
        consultation_ban_end,
        created_at
      `)
      .order('consultation_ban_end', { ascending: false, nullsLast: true });

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,id.eq.${search}`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }

    // Get consultation cancellation counts for each user
    const userIds = users.map(user => user.id);
    const { data: cancellations, error: cancellationsError } = await supabaseAdmin
      .from('consultation_requests')
      .select('user_id')
      .eq('status', 'cancelled')
      .in('user_id', userIds)
      .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (cancellationsError) {
      console.warn('Error fetching cancellations:', cancellationsError);
    }

    // Count cancellations per user
    const cancellationCounts = {};
    if (cancellations) {
      cancellations.forEach(c => {
        cancellationCounts[c.user_id] = (cancellationCounts[c.user_id] || 0) + 1;
      });
    }

    // Add cancellation counts to users
    const usersWithCounts = users.map(user => ({
      ...user,
      recent_cancellations: cancellationCounts[user.id] || 0
    }));

    // Get statistics
    const now = new Date().toISOString();
    
    const { data: statsData, error: statsError } = await supabaseAdmin
      .from('users')
      .select('consultation_ban_end')
      .not('consultation_ban_end', 'is', null);

    let stats = {
      totalBanned: 0,
      activeBans: 0,
      expiredBans: 0,
      totalCancellations: 0
    };

    if (statsData && !statsError) {
      stats.totalBanned = statsData.length;
      stats.activeBans = statsData.filter(u => u.consultation_ban_end > now).length;
      stats.expiredBans = statsData.filter(u => u.consultation_ban_end <= now).length;
    }

    // Get total cancellations count
    const { count: totalCancellations } = await supabaseAdmin
      .from('consultation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled');

    stats.totalCancellations = totalCancellations || 0;

    res.json({
      success: true,
      users: usersWithCounts,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
      }
    });

  } catch (error) {
    console.error('Consultation bans fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Lift consultation ban
router.post('/consultation-bans/:userId/lift', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, admin_id } = req.body;
    const adminId = req.user?.id || admin_id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required'
      });
    }

    // Get user info first
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, consultation_ban_end')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.consultation_ban_end) {
      return res.status(400).json({
        success: false,
        error: 'User is not currently banned from consultations'
      });
    }

    // Lift the ban
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ consultation_ban_end: null })
      .eq('id', userId);

    if (updateError) {
      console.error('Error lifting ban:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to lift consultation ban'
      });
    }

    // Log the action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'consultation_ban_lifted',
        target_type: 'user',
        target_id: userId,
        details: { 
          reason: reason.trim(),
          previous_ban_end: user.consultation_ban_end,
          user_name: user.full_name
        }
      });
    } catch (auditError) {
      console.warn('Failed to log ban lift action:', auditError.message);
    }

    res.json({
      success: true,
      message: `Consultation ban lifted for ${user.full_name}`,
      data: {
        user_id: userId,
        user_name: user.full_name,
        action: 'ban_lifted',
        reason: reason.trim()
      }
    });

  } catch (error) {
    console.error('Lift consultation ban error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
