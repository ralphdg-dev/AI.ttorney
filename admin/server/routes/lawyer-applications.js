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
    const { page = 1, limit = 10, search = '', status = 'all', archived = 'active' } = req.query;
    const offset = (page - 1) * limit;

    console.log('Fetching lawyer applications with params:', { page, limit, search, status, archived });

    // First, get the latest application ID for each user based on submitted_at
    const { data: latestApplications, error: latestError } = await supabaseAdmin
      .from('lawyer_applications')
      .select('user_id, id, submitted_at, archived')
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

    // If search is provided, we need to filter the latestApplicationIds first
    let searchFilteredIds = latestApplicationIds;
    
    if (search) {
      // Get all applications with user data to filter by search term
      const { data: searchApplications, error: searchError } = await supabaseAdmin
        .from('lawyer_applications')
        .select(`
          id,
          roll_number,
          users!inner(
            full_name,
            email,
            username
          )
        `)
        .in('id', latestApplicationIds);

      if (searchError) {
        console.error('Search filter error:', searchError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to apply search filter: ' + searchError.message 
        });
      }

      // Filter applications by search term
      const searchTerm = search.toLowerCase();
      const filteredApps = searchApplications.filter(app => {
        return (
          (app.users?.full_name || '').toLowerCase().includes(searchTerm) ||
          (app.users?.email || '').toLowerCase().includes(searchTerm) ||
          (app.users?.username || '').toLowerCase().includes(searchTerm) ||
          (app.roll_number || '').toLowerCase().includes(searchTerm)
        );
      });

      searchFilteredIds = filteredApps.map(app => app.id);
    }

    // Build the main query for lawyer applications with user data
    let query = supabaseAdmin
      .from('lawyer_applications')
      .select(`
        *,
        users!inner(
          full_name,
          email,
          username,
          created_at
        )
      `)
      .in('id', searchFilteredIds)
      .order('submitted_at', { ascending: false });

    // Add archived filter
    if (archived === 'active') {
      query = query.eq('archived', false);
    } else if (archived === 'archived') {
      query = query.eq('archived', true);
    }
    // If archived === 'all', don't add any archived filter

    // Add status filter if provided
    if (status !== 'all') {
      query = query.eq('status', status);
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
    console.log('Sample application data:', applications?.[0]); // Debug: check if archived field is included

    // Get application type for each application (check if user has previous applications)
    const applicationsWithType = [];
    
    for (const app of applications || []) {
      // Ensure archived field is properly converted to boolean
      app.archived = app.archived === true || app.archived === 'true';
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
        applicationType = 'Resubmission';
        priorStatus = previousApps[0]?.status || 'Unknown';
      }

      applicationsWithType.push({
        ...app,
        id: app.id,
        user_id: app.user_id,
        full_name: app.full_name || app.users?.full_name || 'Unknown',
        email: app.users?.email || 'Unknown',
        username: app.users?.username || 'N/A',
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
        birthdate: app.users?.birthdate || null,
        archived: app.archived // Include the archived field in the response
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

    // Get total count for pagination - use the searchFilteredIds which already includes search filtering
    let totalFilteredIds = searchFilteredIds;
    
    // Apply additional filters for counting
    if (archived === 'active') {
      const { data: archivedFilteredApps } = await supabaseAdmin
        .from('lawyer_applications')
        .select('id')
        .in('id', searchFilteredIds)
        .eq('archived', false);
      totalFilteredIds = archivedFilteredApps?.map(app => app.id) || [];
    } else if (archived === 'archived') {
      const { data: archivedFilteredApps } = await supabaseAdmin
        .from('lawyer_applications')
        .select('id')
        .in('id', searchFilteredIds)
        .eq('archived', true);
      totalFilteredIds = archivedFilteredApps?.map(app => app.id) || [];
    }
    
    if (status !== 'all') {
      const { data: statusFilteredApps } = await supabaseAdmin
        .from('lawyer_applications')
        .select('id')
        .in('id', totalFilteredIds)
        .eq('status', status);
      totalFilteredIds = statusFilteredApps?.map(app => app.id) || [];
    }

    const totalCount = totalFilteredIds.length;

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

    // If there's a reviewed_by field, fetch the admin information
    if (application.reviewed_by) {
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('admin')
        .select('full_name, email')
        .eq('id', application.reviewed_by)
        .single();

      if (!adminError && adminData) {
        application.admin = adminData;
      }
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

    // Fetch admin information for applications that have reviewed_by
    const reviewedByIds = [...new Set(applications?.filter(app => app.reviewed_by).map(app => app.reviewed_by))];
    let adminMap = new Map();
    
    if (reviewedByIds.length > 0) {
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('admin')
        .select('id, full_name, email')
        .in('id', reviewedByIds);

      if (!adminError && adminData) {
        adminData.forEach(admin => {
          adminMap.set(admin.id, admin);
        });
      }
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
      notes: app.admin_notes || null, // Map admin_notes to notes for compatibility
      reviewed_by: app.reviewed_by || null,
      reviewed_at: app.reviewed_at || null,
      admin_name: adminMap.get(app.reviewed_by)?.full_name || adminMap.get(app.reviewed_by)?.email || null,
      admin_full_name: adminMap.get(app.reviewed_by)?.full_name || null,
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

// Update lawyer application (edit functionality)
router.patch('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('Update application request:', { id, updateData });

    // Helper function to create audit log
    const createAuditLog = async (action, targetId, reason = null, metadata = {}) => {
      try {
        console.log('Creating audit log with admin ID:', req.admin.id);
        console.log('Audit log metadata:', metadata);
        
        const auditData = {
          action,
          target_table: 'lawyer_applications',
          actor_id: req.admin.id,
          role: req.admin.role,
          target_id: targetId,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        };
        
        console.log('Full audit data being inserted:', auditData);
        
        const { data, error } = await supabaseAdmin
          .from('admin_audit_logs')
          .insert(auditData)
          .select();
          
        if (error) {
          console.error('Audit log insert error:', error);
        } else {
          console.log('Audit log created successfully:', data);
        }
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
        console.error('Admin data:', req.admin);
      }
    };

    // First check if the application exists and get current data
    const { data: existingApp, error: findError } = await supabaseAdmin
      .from('lawyer_applications')
      .select(`
        *,
        users!inner(
          full_name,
          email
        )
      `)
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

    // Prepare update data - only include fields that are allowed to be updated
    const allowedFields = [
      'roll_number', 
      'roll_signing_date', 
      'admin_notes', 
      'status',
      'admin_feedback'
    ];

    const filteredUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredUpdateData[key] = updateData[key];
      }
    });

    // Always update the updated_at timestamp
    filteredUpdateData.updated_at = new Date().toISOString();

    console.log('Filtered update data:', filteredUpdateData);

    // Update the application
    const { data: application, error } = await supabaseAdmin
      .from('lawyer_applications')
      .update(filteredUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !application) {
      console.log('Update failed:', { error, application });
      return res.status(500).json({ 
        success: false, 
        error: 'Lawyer application update failed: ' + (error?.message || 'Unknown error')
      });
    }

    // Handle user table updates if status was changed
    if (filteredUpdateData.status) {
      const status = filteredUpdateData.status;
      
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
        }
      } else if (status === 'rejected') {
        // Get current user data to check rejection count
        const { data: userData, error: getUserError } = await supabaseAdmin
          .from('users')
          .select('reject_count, is_blocked_from_applying')
          .eq('id', application.user_id)
          .single();

        if (!getUserError && userData) {
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
          }
        }
      } else if (status === 'resubmission') {
        // For resubmission, keep pending_lawyer as true
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
    }

    // Create detailed audit logs for each change
    const changes = [];
    
    // Check for status change
    if (filteredUpdateData.status && filteredUpdateData.status !== existingApp.status) {
      changes.push({
        action: `Status changed from "${existingApp.status || 'none'}" to "${filteredUpdateData.status}"`,
        field: 'status',
        old_value: existingApp.status || 'none',
        new_value: filteredUpdateData.status
      });
    }
    
    // Check for admin notes change
    if (filteredUpdateData.admin_notes !== undefined && filteredUpdateData.admin_notes !== (existingApp.admin_notes || '')) {
      const oldNotes = existingApp.admin_notes || 'none';
      const newNotes = filteredUpdateData.admin_notes || 'none';
      changes.push({
        action: `Admin notes changed from "${oldNotes}" to "${newNotes}"`,
        field: 'admin_notes',
        old_value: oldNotes,
        new_value: newNotes
      });
    }
    
    // Check for roll number change
    if (filteredUpdateData.roll_number && filteredUpdateData.roll_number !== existingApp.roll_number) {
      changes.push({
        action: `Roll number changed from "${existingApp.roll_number || 'none'}" to "${filteredUpdateData.roll_number}"`,
        field: 'roll_number',
        old_value: existingApp.roll_number || 'none',
        new_value: filteredUpdateData.roll_number
      });
    }
    
    // Check for roll signing date change
    if (filteredUpdateData.roll_signing_date && filteredUpdateData.roll_signing_date !== existingApp.roll_signing_date) {
      changes.push({
        action: `Roll signing date changed from "${existingApp.roll_signing_date || 'none'}" to "${filteredUpdateData.roll_signing_date}"`,
        field: 'roll_signing_date',
        old_value: existingApp.roll_signing_date || 'none',
        new_value: filteredUpdateData.roll_signing_date
      });
    }

    // Create separate audit log entries for each change
    for (const change of changes) {
      await createAuditLog(
        `${change.action} (Version ${existingApp.version || 1})`,
        id,
        {
          action_type: 'field_edit',
          field: change.field,
          old_value: change.old_value,
          new_value: change.new_value,
          version: existingApp.version || 1,
          user_id: application.user_id,
          user_email: existingApp.users?.email || 'unknown',
          user_full_name: existingApp.users?.full_name || 'unknown',
          edited_by: req.admin.id,
          edited_by_name: req.admin.full_name || req.admin.email,
          edited_at: new Date().toISOString(),
          application_id: id,
          action: updateData.action || 'edit_application',
          timestamp: new Date().toISOString()
        }
      );
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: application
    });

  } catch (error) {
    console.error('Update lawyer application error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Update lawyer application status (approve/reject)
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_feedback } = req.body;

    console.log('Update status request:', { id, status, admin_feedback });

    // Helper function to create audit log
    const createAuditLog = async (action, targetId, metadata = {}) => {
      try {
        // Ensure the admin ID exists in the admin table
        console.log('Creating audit log with admin ID:', req.admin.id);
        console.log('Audit log metadata:', metadata);
        
        const auditData = {
          action,
          target_table: 'lawyer_applications',
          actor_id: req.admin.id, // This should reference the admin table
          role: req.admin.role,
          target_id: targetId,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        };
        
        console.log('Full audit data being inserted:', auditData);
        
        const { data, error } = await supabaseAdmin
          .from('admin_audit_logs')
          .insert(auditData)
          .select();
          
        if (error) {
          console.error('Audit log insert error:', error);
        } else {
          console.log('Audit log created successfully:', data);
        }
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError);
        console.error('Admin data:', req.admin);
      }
    };

    if (!['pending', 'accepted', 'rejected', 'resubmission'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be one of: pending, accepted, rejected, resubmission' 
      });
    }

    // First check if the application exists and get user info
    const { data: existingApp, error: findError } = await supabaseAdmin
      .from('lawyer_applications')
      .select(`
        id, 
        status, 
        user_id,
        version,
        users!inner(
          full_name,
          email
        )
      `)
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
      updated_at: new Date().toISOString(),
      reviewed_by: req.admin.id,
      reviewed_at: new Date().toISOString()
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

    // Create audit log for the status change
    await createAuditLog(
      `Application ${status} (Version ${existingApp.version || 1})`,
      id,
      {
        action_type: 'status_change',
        old_status: existingApp.status,
        new_status: status,
        version: existingApp.version || 1,
        user_id: application.user_id,
        user_email: existingApp.users?.email || 'unknown',
        user_full_name: existingApp.users?.full_name || 'unknown',
        admin_feedback: admin_feedback || null,
        admin_notes: admin_feedback || null,
        reviewed_by: req.admin.id,
        reviewed_by_name: req.admin.full_name || req.admin.email,
        reviewed_at: new Date().toISOString(),
        application_id: id,
        timestamp: new Date().toISOString()
      }
    );

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

    console.log('Signed URL request:', { bucket, filePath });

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

    // First check if the file exists
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from(bucket)
      .list('', {
        search: filePath.split('/').pop() // Get just the filename
      });

    if (fileError) {
      console.error('Error checking file existence:', fileError);
    }

    // Check if file exists in the bucket
    const fileExists = fileData && fileData.some(file => 
      filePath.includes(file.name) || filePath.endsWith(file.name)
    );

    if (!fileExists) {
      console.log('File not found in storage:', { bucket, filePath, availableFiles: fileData?.map(f => f.name) });
      return res.status(404).json({
        success: false,
        error: 'File not found in storage',
        details: {
          bucket,
          filePath,
          message: 'The requested file does not exist in the storage bucket'
        }
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

    console.log('Signed URL created successfully for:', filePath);

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

// Get audit logs for a specific application
router.get('/:id/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get audit logs for this application
    const { data: auditLogs, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select(`
        *,
        admin!actor_id(
          full_name,
          email,
          role
        )
      `)
      .eq('target_table', 'lawyer_applications')
      .eq('target_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get audit logs error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch audit logs: ' + error.message 
      });
    }

    // Transform data for frontend
    const transformedLogs = auditLogs?.map(log => ({
      id: log.id,
      action: log.action,
      actor_name: log.admin?.full_name || 'Unknown Admin',
      actor_full_name: log.admin?.full_name || 'Unknown Admin',
      actor_email: log.admin?.email || '',
      role: log.metadata?.admin_role || log.admin?.role || 'admin',
      details: log.metadata ? JSON.stringify(log.metadata, null, 2) : null,
      metadata: log.metadata,
      created_at: log.created_at
    })) || [];

    res.json({
      success: true,
      data: transformedLogs
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Create audit log for a specific application (for PDF exports, etc.)
router.post('/:id/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, metadata } = req.body;
    const adminId = req.admin.id; // From authenticateAdmin middleware

    // Debug: Log what we're receiving
    console.log('PDF Audit Log Debug - Received data:', {
      applicationId: id,
      action,
      metadata,
      adminId,
      adminInfo: req.admin
    });

    // Validate required fields
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    // Validate application exists
    const { data: application, error: appError } = await supabaseAdmin
      .from('lawyer_applications')
      .select('id')
      .eq('id', id)
      .single();

    if (appError || !application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Create audit log entry
    const auditLogData = {
      actor_id: adminId,
      target_table: 'lawyer_applications',
      target_id: id,
      action: action,
      role: req.admin.role, // Add the role column directly
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    console.log('PDF Audit Log Debug - Inserting data:', auditLogData);

    const { data: auditLog, error: auditError } = await supabaseAdmin
      .from('admin_audit_logs')
      .insert(auditLogData)
      .select(`
        *,
        admin!actor_id(
          full_name,
          email,
          role
        )
      `)
      .single();

    if (auditError) {
      console.error('Create audit log error:', auditError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create audit log: ' + auditError.message
      });
    }

    console.log('PDF Audit Log Debug - Stored audit log:', auditLog);

    // Transform response for frontend
    const transformedLog = {
      id: auditLog.id,
      action: auditLog.action,
      actor_name: auditLog.admin?.full_name || 'Unknown Admin',
      actor_full_name: auditLog.admin?.full_name || 'Unknown Admin',
      actor_email: auditLog.admin?.email || '',
      role: auditLog.metadata?.admin_role || auditLog.admin?.role || 'admin',
      details: auditLog.metadata ? JSON.stringify(auditLog.metadata, null, 2) : null,
      metadata: auditLog.metadata,
      created_at: auditLog.created_at
    };

    console.log('PDF Audit Log Debug - Transformed response:', transformedLog);

    console.log(`Audit log created: ${action} by ${auditLog.admin?.full_name} for application ${id}`);

    res.status(201).json({
      success: true,
      data: transformedLog,
      message: 'Audit log created successfully'
    });

  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Archive/Unarchive lawyer application
router.patch('/:id/archive', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body; // true to archive, false to unarchive
    const adminId = req.admin.id;

    // Validate required fields
    if (typeof archived !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Archived field is required and must be boolean'
      });
    }

    // Validate application exists
    const { data: application, error: appError } = await supabaseAdmin
      .from('lawyer_applications')
      .select('id, full_name, archived')
      .eq('id', id)
      .single();

    if (appError || !application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Update archived status
    const { data: updatedApp, error: updateError } = await supabaseAdmin
      .from('lawyer_applications')
      .update({ 
        archived: archived
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Archive update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update archive status: ' + updateError.message
      });
    }

    // Create audit log for archive action
    const action = archived ? 'ARCHIVED_APPLICATION' : 'UNARCHIVED_APPLICATION';
    const metadata = {
      previous_archived: application.archived,
      new_archived: archived,
      admin_id: adminId,
      timestamp: new Date().toISOString()
    };

    try {
      const auditData = {
        action,
        target_table: 'lawyer_applications',
        actor_id: adminId,
        role: req.admin.role,
        target_id: id,
        metadata: metadata,
        created_at: new Date().toISOString()
      };

      const { error: auditError } = await supabaseAdmin
        .from('admin_audit_logs')
        .insert(auditData);

      if (auditError) {
        console.error('Audit log error:', auditError);
      }
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    console.log(`Application ${archived ? 'archived' : 'unarchived'}: ${id} by admin ${adminId}`);

    res.json({
      success: true,
      data: updatedApp,
      message: `Application ${archived ? 'archived' : 'unarchived'} successfully`
    });

  } catch (error) {
    console.error('Archive operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
