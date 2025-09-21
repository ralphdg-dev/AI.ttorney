const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all legal seekers (registered users who are not admins/lawyers)
router.get('/legal-seekers', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        email,
        birthdate,
        created_at,
        is_verified,
        pending_lawyer,
        role
      `)
      .in('role', ['guest', 'registered_user']) // Only legal seekers, not admins or verified lawyers
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

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

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
      birthdate: user.birthdate || 'N/A',
      registration_date: user.created_at,
      account_status: user.is_verified ? 'Verified' : 'Unverified',
      has_lawyer_application: user.pending_lawyer ? 'Yes' : 'No',
      role: user.role
    }));

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['guest', 'registered_user']);

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

    // Check if user is actually a legal seeker (not admin/lawyer)
    if (!['guest', 'registered_user'].includes(user.role)) {
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
        is_verified,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .in('role', ['guest', 'registered_user']) // Only allow updates to legal seekers
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

    if (!['guest', 'registered_user'].includes(existingUser.role)) {
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
        is_verified: false,
        updated_at: new Date().toISOString()
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

// Get legal seekers statistics
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

// Get all verified lawyers
router.get('/lawyers', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching lawyers with params:', { page, limit, search });

    // First, let's try a simpler query to get verified lawyers
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        full_name,
        email,
        created_at,
        is_verified
      `)
      .eq('role', 'verified_lawyer') // Only verified lawyers
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
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

    console.log('Found lawyers:', lawyers?.length || 0);

    // Now try to get lawyer applications for these users
    let transformedLawyers = [];
    
    if (lawyers && lawyers.length > 0) {
      const userIds = lawyers.map(lawyer => lawyer.id);
      
      // Get lawyer applications separately
      const { data: applications, error: appError } = await supabaseAdmin
        .from('lawyer_applications')
        .select('user_id, roll_number, roll_signing_date, status')
        .in('user_id', userIds)
        .eq('status', 'approved');

      if (appError) {
        console.error('Get applications error:', appError);
        // Continue without applications data
      }

      console.log('Found applications:', applications?.length || 0);

      // Transform data for frontend
      transformedLawyers = lawyers.map(lawyer => {
        const application = applications?.find(app => app.user_id === lawyer.id);
        return {
          id: lawyer.id,
          full_name: lawyer.full_name || 'N/A',
          email: lawyer.email,
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

    console.log('Total lawyers count:', totalCount);

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
        is_verified,
        updated_at: new Date().toISOString()
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

module.exports = router;
