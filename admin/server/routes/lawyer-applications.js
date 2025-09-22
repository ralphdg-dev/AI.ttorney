const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Test endpoint to check table structure
router.get('/test', authenticateAdmin, async (req, res) => {
  try {
    console.log('Testing lawyer_applications table...');
    
    // Try to get just one record to see the structure
    const { data: testData, error: testError } = await supabaseAdmin
      .from('lawyer_applications')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('Test query error:', testError);
      return res.json({ 
        success: false, 
        error: testError.message,
        table_exists: false
      });
    }
    
    console.log('Test data:', testData);
    
    // Also test users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, created_at')
      .limit(1);
    
    if (userError) {
      console.error('Users test error:', userError);
    }
    
    res.json({
      success: true,
      lawyer_applications: testData,
      users_sample: userData,
      message: 'Test completed'
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all lawyer applications
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching lawyer applications with params:', { page, limit, search, status });

    // First, get the latest application ID for each user based on submitted_at
    const { data: latestApplications, error: latestError } = await supabaseAdmin
      .from('lawyer_applications')
      .select('user_id, id, submitted_at')
      .order('submitted_at', { ascending: false });

    if (latestError) {
      console.error('Error getting latest applications:', latestError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch latest applications: ' + latestError.message 
      });
    }

    // Get unique latest application IDs per user based on submitted_at
    const userLatestMap = new Map();
    latestApplications?.forEach(app => {
      if (!userLatestMap.has(app.user_id)) {
        // Since we ordered by submitted_at desc, the first occurrence is the latest
        userLatestMap.set(app.user_id, app.id);
      }
    });

    const latestApplicationIds = Array.from(userLatestMap.values());
    console.log('Latest application IDs:', latestApplicationIds);

    if (latestApplicationIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      });
    }

    // Build the query for lawyer applications with user data - only latest per user
    let query = supabaseAdmin
      .from('lawyer_applications')
      .select(`
        *,
        users!inner(
          full_name,
          email,
          created_at
        )
      `)
      .in('id', latestApplicationIds)
      .order('submitted_at', { ascending: false });

    // Add status filter if provided
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(`users.full_name.ilike.%${search}%,users.email.ilike.%${search}%,roll_number.ilike.%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Get lawyer applications error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch lawyer applications: ' + error.message 
      });
    }

    console.log('Found applications:', applications?.length || 0);

    // Get application type for each application (check if user has previous applications)
    const applicationsWithType = [];
    
    for (const app of applications || []) {
      // Check if user has previous applications
      const { data: previousApps, error: prevError } = await supabaseAdmin
        .from('lawyer_applications')
        .select('id, submitted_at, status')
        .eq('user_id', app.user_id)
        .lt('submitted_at', app.submitted_at)
        .order('submitted_at', { ascending: false });

      let applicationType = 'New Application';
      let priorStatus = null;
      
      if (!prevError && previousApps && previousApps.length > 0) {
        // User has previous applications, this is a resubmission
        applicationType = `Resubmission (${previousApps.length + 1}${getOrdinalSuffix(previousApps.length + 1)} attempt)`;
        // Get the status of the most recent previous application
        priorStatus = previousApps[0].status;
      }

      applicationsWithType.push({
        id: app.id,
        user_id: app.user_id,
        full_name: app.users?.full_name || 'N/A',
        email: app.users?.email || 'N/A',
        roll_number: app.roll_number || 'N/A',
        roll_sign_date: app.roll_signing_date || null,
        status: app.status || 'pending',
        prior_status: priorStatus,
        application_type: applicationType,
        pra_status: 'Matched', // Placeholder - you can implement PRA verification later
        registration_date: app.users?.created_at,
        application_date: app.submitted_at || app.users?.created_at,
        admin_notes: app.admin_notes || null,
        ibp_card_path: app.ibp_id || null,
        selfie_path: app.selfie || null,
        birthdate: app.users?.birthdate || null
      });
    }

    // Helper function to get ordinal suffix
    function getOrdinalSuffix(num) {
      const j = num % 10;
      const k = num % 100;
      if (j === 1 && k !== 11) return 'st';
      if (j === 2 && k !== 12) return 'nd';
      if (j === 3 && k !== 13) return 'rd';
      return 'th';
    }

    const transformedApplications = applicationsWithType;

    // Get total count for pagination - count unique users, not applications
    let filteredApplicationIds = latestApplicationIds;
    
    if (status !== 'all') {
      // If filtering by status, we need to get applications that match the status
      const { data: statusFilteredApps } = await supabaseAdmin
        .from('lawyer_applications')
        .select('id')
        .in('id', latestApplicationIds)
        .eq('status', status);
      
      filteredApplicationIds = statusFilteredApps?.map(app => app.id) || [];
    }

    const totalCount = filteredApplicationIds.length;

    console.log('Total applications count:', totalCount);

    res.json({
      success: true,
      data: transformedApplications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get lawyer applications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Get single lawyer application details
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: application, error } = await supabaseAdmin
      .from('lawyer_applications')
      .select(`
        *,
        users!inner(
          full_name,
          email,
          created_at,
          birthdate
        )
      `)
      .eq('id', id)
      .single();

    if (error || !application) {
      return res.status(404).json({ 
        success: false, 
        error: 'Lawyer application not found' 
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Get lawyer application details error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get application history for a specific user
router.get('/:id/history', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // First get the application to find the user_id
    const { data: currentApplication, error: currentError } = await supabaseAdmin
      .from('lawyer_applications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (currentError || !currentApplication) {
      return res.status(404).json({ 
        success: false, 
        error: 'Application not found' 
      });
    }

    // Get all applications for this user, ordered by submission date
    const { data: applications, error } = await supabaseAdmin
      .from('lawyer_applications')
      .select(`
        *,
        users!inner(
          full_name,
          email,
          created_at
        )
      `)
      .eq('user_id', currentApplication.user_id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Get application history error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch application history: ' + error.message 
      });
    }

    // Transform data for frontend
    const transformedApplications = applications?.map(app => ({
      id: app.id,
      user_id: app.user_id,
      full_name: app.users?.full_name || 'N/A',
      email: app.users?.email || 'N/A',
      roll_number: app.roll_number || 'N/A',
      roll_signing_date: app.roll_signing_date || null,
      status: app.status || 'pending',
      submitted_at: app.submitted_at || null,
      updated_at: app.updated_at || null,
      version: app.version || 1,
      parent_application_id: app.parent_application_id || null,
      is_latest: app.is_latest || false,
      application_type: app.application_type || 'Initial',
      admin_notes: app.admin_notes || null,
      ibp_id: app.ibp_id || null,
      selfie: app.selfie || null
    })) || [];

    res.json({
      success: true,
      data: transformedApplications,
      total: transformedApplications.length
    });

  } catch (error) {
    console.error('Get application history error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Update lawyer application status (approve/reject)
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_feedback } = req.body;

    console.log('Update status request:', { id, status, admin_feedback });

    if (!['pending', 'approved', 'rejected', 'resubmission'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be one of: pending, approved, rejected, resubmission' 
      });
    }

    // First check if the application exists
    const { data: existingApp, error: findError } = await supabaseAdmin
      .from('lawyer_applications')
      .select('id, status, user_id')
      .eq('id', id)
      .single();

    if (findError || !existingApp) {
      console.log('Application not found:', { id, findError });
      return res.status(404).json({ 
        success: false, 
        error: 'Lawyer application not found' 
      });
    }

    console.log('Found application:', existingApp);

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (admin_feedback) {
      updateData.admin_notes = admin_feedback;
    }

    const { data: application, error } = await supabaseAdmin
      .from('lawyer_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !application) {
      console.log('Update failed:', { error, application });
      return res.status(404).json({ 
        success: false, 
        error: 'Lawyer application update failed: ' + (error?.message || 'Unknown error')
      });
    }

    // Handle user table updates based on status
    if (status === 'approved') {
      // Update user role to verified_lawyer
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ 
          role: 'verified_lawyer',
          pending_lawyer: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', application.user_id);

      if (userError) {
        console.error('Failed to update user role:', userError);
        // Don't fail the whole operation, just log the error
      }
    } else if (status === 'rejected') {
      // Get current user data to check rejection count
      const { data: userData, error: getUserError } = await supabaseAdmin
        .from('users')
        .select('reject_count, is_blocked_from_applying')
        .eq('id', application.user_id)
        .single();

      if (getUserError) {
        console.error('Failed to get user data for rejection tracking:', getUserError);
      } else {
        const currentRejectCount = userData.reject_count || 0;
        const newRejectCount = currentRejectCount + 1;
        const isBlocked = newRejectCount >= 3;

        // Update user with rejection tracking
        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({ 
            pending_lawyer: false,
            reject_count: newRejectCount,
            last_rejected_at: new Date().toISOString(),
            is_blocked_from_applying: isBlocked,
            updated_at: new Date().toISOString()
          })
          .eq('id', application.user_id);

        if (userError) {
          console.error('Failed to update user rejection data:', userError);
        } else {
          console.log(`User ${application.user_id} rejected. Count: ${newRejectCount}, Blocked: ${isBlocked}`);
        }
      }
    } else if (status === 'resubmission') {
      // For resubmission, keep pending_lawyer as true so they can resubmit
      const { error: userError } = await supabaseAdmin
        .from('users')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', application.user_id);

      if (userError) {
        console.error('Failed to update user for resubmission:', userError);
      }
    }

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: application
    });

  } catch (error) {
    console.error('Update lawyer application status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get lawyer applications statistics
router.get('/stats/overview', authenticateAdmin, async (req, res) => {
  try {
    // Get total counts by status
    const { count: totalApplications } = await supabaseAdmin
      .from('lawyer_applications')
      .select('*', { count: 'exact', head: true });

    const { count: pendingApplications } = await supabaseAdmin
      .from('lawyer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: approvedApplications } = await supabaseAdmin
      .from('lawyer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: rejectedApplications } = await supabaseAdmin
      .from('lawyer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    const { count: resubmissionApplications } = await supabaseAdmin
      .from('lawyer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resubmission');

    const { count: newThisMonth } = await supabaseAdmin
      .from('lawyer_applications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    res.json({
      success: true,
      data: {
        total_applications: totalApplications || 0,
        pending_applications: pendingApplications || 0,
        approved_applications: approvedApplications || 0,
        rejected_applications: rejectedApplications || 0,
        resubmission_applications: resubmissionApplications || 0,
        new_this_month: newThisMonth || 0
      }
    });

  } catch (error) {
    console.error('Get lawyer applications stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Generate signed URL for private storage access
router.post('/signed-url', authenticateAdmin, async (req, res) => {
  try {
    const { bucket, filePath } = req.body;

    if (!bucket || !filePath) {
      return res.status(400).json({
        success: false,
        error: 'Bucket and filePath are required'
      });
    }

    // Validate bucket names for security
    const allowedBuckets = ['ibp-ids', 'selfie-ids', 'uploads', 'images', 'lawyer-documents', 'application-files', 'documents', 'files'];
    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bucket name'
      });
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour

    if (error) {
      console.error('Error creating signed URL:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create signed URL: ' + error.message
      });
    }

    res.json({
      success: true,
      signedUrl: data.signedUrl
    });

  } catch (error) {
    console.error('Signed URL endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
