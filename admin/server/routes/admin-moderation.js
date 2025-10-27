const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Health check endpoint to verify table existence
router.get('/health', async (req, res) => {
  try {
    const tableStatus = {
      user_violations: false,
      user_suspensions: false,
      users: false
    };

    // Check user_violations table
    try {
      await supabaseAdmin.from('user_violations').select('id').limit(1);
      tableStatus.user_violations = true;
    } catch (error) {
      console.log('user_violations table check:', error.message);
    }

    // Check user_suspensions table
    try {
      await supabaseAdmin.from('user_suspensions').select('id').limit(1);
      tableStatus.user_suspensions = true;
    } catch (error) {
      console.log('user_suspensions table check:', error.message);
    }

    // Check users table
    try {
      await supabaseAdmin.from('users').select('id').limit(1);
      tableStatus.users = true;
    } catch (error) {
      console.log('users table check:', error.message);
    }

    res.json({
      success: true,
      message: 'Admin moderation system health check',
      tables: tableStatus,
      fallback_mode: !tableStatus.user_violations || !tableStatus.user_suspensions
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Apply moderation action to a user (admin override)
router.post('/apply-action/:user_id', authenticateAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { 
      violation_type, 
      content_id, 
      content_text, 
      admin_reason, 
      action, 
      report_id 
    } = req.body;
    const adminId = req.admin?.id;

    console.log('=== ADMIN MODERATION ACTION ===');
    console.log('User ID:', user_id);
    console.log('Action:', action);
    console.log('Admin ID:', adminId);
    console.log('Reason:', admin_reason);

    // Validate input
    if (!['strike', 'suspend_7days', 'permanent_ban'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be strike, suspend_7days, or permanent_ban'
      });
    }

    if (!['forum_post', 'forum_reply', 'chatbot_prompt'].includes(violation_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid violation_type. Must be forum_post, forum_reply, or chatbot_prompt'
      });
    }

    // Get current user data
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, strike_count, suspension_count, account_status')
      .eq('id', user_id)
      .single();

    if (fetchError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create moderation result (admin action)
    const moderationResult = {
      flagged: true,
      categories: { admin_action: true },
      category_scores: { admin_action: 1.0 },
      violation_summary: `Admin action: ${admin_reason}`
    };

    let violationData, userUpdateData, suspensionData = null;
    let actionTaken, strikeCountAfter, suspensionCountAfter;

    if (action === 'strike') {
      // Add strike using normal flow
      const newStrikeCount = (currentUser.strike_count || 0) + 1;
      
      if (newStrikeCount >= 3) {
        // Trigger suspension
        const newSuspensionCount = (currentUser.suspension_count || 0) + 1;
        const suspensionEnd = new Date();
        suspensionEnd.setDate(suspensionEnd.getDate() + 7); // 7 days
        
        actionTaken = newSuspensionCount >= 3 ? 'banned' : 'suspended';
        strikeCountAfter = 0; // Reset strikes
        suspensionCountAfter = newSuspensionCount;
        
        userUpdateData = {
          strike_count: 0,
          suspension_count: newSuspensionCount,
          account_status: newSuspensionCount >= 3 ? 'banned' : 'suspended',
          suspension_end: newSuspensionCount >= 3 ? null : suspensionEnd.toISOString(),
          last_violation_at: new Date().toISOString(),
          banned_at: newSuspensionCount >= 3 ? new Date().toISOString() : null,
          banned_reason: newSuspensionCount >= 3 ? admin_reason : null
        };

        // Create suspension record
        suspensionData = {
          user_id: user_id,
          suspension_type: newSuspensionCount >= 3 ? 'permanent' : 'temporary',
          reason: newSuspensionCount >= 3 ? 
            `Automatic permanent ban after ${newSuspensionCount} suspensions` :
            `Automatic temporary suspension after 3 strikes`,
          suspension_number: newSuspensionCount,
          strikes_at_suspension: 3,
          started_at: new Date().toISOString(),
          ends_at: newSuspensionCount >= 3 ? null : suspensionEnd.toISOString(),
          status: 'active'
        };
      } else {
        // Just add strike
        actionTaken = 'strike_added';
        strikeCountAfter = newStrikeCount;
        suspensionCountAfter = currentUser.suspension_count || 0;
        
        userUpdateData = {
          strike_count: newStrikeCount,
          last_violation_at: new Date().toISOString()
        };
      }
    } else if (action === 'suspend_7days') {
      // Force 7-day suspension (bypass strike count)
      const newSuspensionCount = (currentUser.suspension_count || 0) + 1;
      const suspensionEnd = new Date();
      suspensionEnd.setDate(suspensionEnd.getDate() + 7);
      
      actionTaken = 'suspended';
      strikeCountAfter = 0; // Reset strikes
      suspensionCountAfter = newSuspensionCount;
      
      userUpdateData = {
        strike_count: 0,
        suspension_count: newSuspensionCount,
        account_status: 'suspended',
        suspension_end: suspensionEnd.toISOString(),
        last_violation_at: new Date().toISOString()
      };

      suspensionData = {
        user_id: user_id,
        suspension_type: 'temporary',
        reason: `Admin-imposed 7-day suspension: ${admin_reason}`,
        suspension_number: newSuspensionCount,
        strikes_at_suspension: currentUser.strike_count || 0,
        started_at: new Date().toISOString(),
        ends_at: suspensionEnd.toISOString(),
        status: 'active'
      };
    } else if (action === 'permanent_ban') {
      // Force permanent ban
      const newSuspensionCount = (currentUser.suspension_count || 0) + 1;
      
      actionTaken = 'banned';
      strikeCountAfter = 0;
      suspensionCountAfter = newSuspensionCount;
      
      userUpdateData = {
        strike_count: 0,
        suspension_count: newSuspensionCount,
        account_status: 'banned',
        suspension_end: null,
        last_violation_at: new Date().toISOString(),
        banned_at: new Date().toISOString(),
        banned_reason: admin_reason
      };

      suspensionData = {
        user_id: user_id,
        suspension_type: 'permanent',
        reason: `Admin-imposed permanent ban: ${admin_reason}`,
        suspension_number: newSuspensionCount,
        strikes_at_suspension: currentUser.strike_count || 0,
        started_at: new Date().toISOString(),
        ends_at: null,
        status: 'active'
      };
    }

    // Create violation record
    violationData = {
      user_id: user_id,
      violation_type: violation_type,
      content_id: content_id,
      content_text: content_text.substring(0, 1000), // Limit to 1000 chars
      flagged_categories: moderationResult.categories,
      category_scores: moderationResult.category_scores,
      violation_summary: moderationResult.violation_summary,
      action_taken: actionTaken,
      strike_count_after: strikeCountAfter,
      suspension_count_after: suspensionCountAfter
    };

    // Execute database operations in transaction
    let violationResult = null;
    
    console.log('Attempting to insert violation data:', JSON.stringify(violationData, null, 2));
    
    // Try to refresh schema cache by making a simple query first
    try {
      await supabaseAdmin.from('user_violations').select('id').limit(1);
    } catch (schemaError) {
      console.log('Schema refresh attempt:', schemaError.message);
    }
    
    try {
      const { data, error: violationError } = await supabaseAdmin
        .from('user_violations')
        .insert(violationData)
        .select()
        .single();

      if (violationError) {
        console.error('Error creating violation record:', violationError);
        
        // Check if it's a schema cache issue
        if (violationError.code === 'PGRST204' || violationError.message.includes('schema cache')) {
          console.warn('Schema cache issue detected, using fallback violation record');
          violationResult = {
            id: `fallback-violation-${Date.now()}`,
            ...violationData,
            created_at: new Date().toISOString()
          };
        } else if (violationError.code === '42P01' || violationError.message.includes('relation') || violationError.message.includes('does not exist')) {
          console.warn('user_violations table does not exist, using fallback');
          violationResult = {
            id: `mock-violation-${Date.now()}`,
            ...violationData,
            created_at: new Date().toISOString()
          };
        } else {
          return res.status(500).json({
            success: false,
            error: `Failed to create violation record: ${violationError.message}`
          });
        }
      } else {
        violationResult = data;
      }
    } catch (err) {
      console.error('Error with user_violations table:', err);
      // Create mock violation record as fallback
      violationResult = {
        id: `mock-violation-${Date.now()}`,
        ...violationData,
        created_at: new Date().toISOString()
      };
    }

    // Update user
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update(userUpdateData)
      .eq('id', user_id);

    if (userUpdateError) {
      console.error('Error updating user:', userUpdateError);
      return res.status(500).json({
        success: false,
        error: `Failed to update user: ${userUpdateError.message}`
      });
    }

    // Create suspension record if needed
    if (suspensionData) {
      // Add violation_ids array
      suspensionData.violation_ids = [violationResult.id];
      
      try {
        const { error: suspensionError } = await supabaseAdmin
          .from('user_suspensions')
          .insert(suspensionData);

        if (suspensionError) {
          // If table doesn't exist, just log and continue
          if (suspensionError.code === '42P01' || suspensionError.message.includes('relation') || suspensionError.message.includes('does not exist')) {
            console.warn('user_suspensions table does not exist, skipping suspension record');
          } else {
            console.error('Error creating suspension record:', suspensionError);
          }
        }
      } catch (err) {
        console.warn('Error with user_suspensions table:', err.message);
      }
    }

    // Update report status if report_id provided
    if (report_id) {
      const { error: reportError } = await supabaseAdmin
        .from('forum_reports')
        .update({
          status: 'resolved',
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          violation_id: violationResult.id,
          action_taken: action === 'strike' ? 'strike' : 
                       action === 'suspend_7days' ? 'suspended' : 'banned',
          admin_notes: admin_reason
        })
        .eq('id', report_id);

      if (reportError) {
        console.error('Error updating report:', reportError);
        // Don't fail the request, just log the error
      }
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: `admin_moderation_${action}`,
        target_type: 'user',
        target_id: user_id,
        details: {
          violation_id: violationResult.id,
          reason: admin_reason,
          action_taken: actionTaken,
          strike_count_after: strikeCountAfter,
          suspension_count_after: suspensionCountAfter,
          related_report_id: report_id // Store in details for reference but not in violation record
        }
      });
    } catch (auditError) {
      console.warn('Failed to log admin action:', auditError.message);
    }

    res.json({
      success: true,
      message: `${action} applied successfully`,
      data: {
        violation_id: violationResult.id,
        action_taken: actionTaken,
        strike_count: strikeCountAfter,
        suspension_count: suspensionCountAfter,
        account_status: userUpdateData.account_status || currentUser.account_status,
        suspension_end: userUpdateData.suspension_end || null
      }
    });

  } catch (error) {
    console.error('Admin moderation action error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get user violations history
router.get('/violations/:user_id', authenticateAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log(`Fetching violations for user: ${user_id}, page: ${page}, limit: ${limit}`);

    const { data: violations, error } = await supabaseAdmin
      .from('user_violations')
      .select(`
        id,
        violation_type,
        content_text,
        violation_summary,
        action_taken,
        strike_count_after,
        suspension_count_after,
        created_at
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase violations query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If table doesn't exist, return empty data
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
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
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch violations: ' + error.message
      });
    }

    // Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('user_violations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    if (countError) {
      console.error('Count query error:', countError);
    }

    console.log(`Found ${violations?.length || 0} violations, total count: ${count || 0}`);

    res.json({
      success: true,
      data: violations || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get violations catch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// Get user suspensions history
router.get('/suspensions/:user_id', authenticateAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;

    console.log(`Fetching suspensions for user: ${user_id}`);

    const { data: suspensions, error } = await supabaseAdmin
      .from('user_suspensions')
      .select(`
        id,
        suspension_type,
        reason,
        suspension_number,
        strikes_at_suspension,
        started_at,
        ends_at,
        status,
        lifted_at,
        lifted_reason,
        lifted_by
      `)
      .eq('user_id', user_id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Supabase suspensions query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // If table doesn't exist, return empty data
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch suspensions: ' + error.message
      });
    }

    console.log(`Found ${suspensions?.length || 0} suspensions`);

    res.json({
      success: true,
      data: suspensions || []
    });

  } catch (error) {
    console.error('Get suspensions catch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

// Lift suspension (admin override)
router.post('/lift-suspension/:user_id', authenticateAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin?.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required'
      });
    }

    // Get current user status
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('account_status, suspension_count')
      .eq('id', user_id)
      .single();

    if (fetchError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (currentUser.account_status !== 'suspended') {
      return res.status(400).json({
        success: false,
        error: 'User is not currently suspended'
      });
    }

    // Update user status
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        account_status: 'active',
        suspension_end: null
      })
      .eq('id', user_id);

    if (userUpdateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }

    // Update suspension record
    const { error: suspensionUpdateError } = await supabaseAdmin
      .from('user_suspensions')
      .update({
        status: 'lifted',
        lifted_at: new Date().toISOString(),
        lifted_by: adminId,
        lifted_reason: reason
      })
      .eq('user_id', user_id)
      .eq('status', 'active');

    if (suspensionUpdateError) {
      console.error('Error updating suspension record:', suspensionUpdateError);
      // Don't fail the request
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'admin_lift_suspension',
        target_type: 'user',
        target_id: user_id,
        details: {
          reason: reason,
          suspension_count: currentUser.suspension_count
        }
      });
    } catch (auditError) {
      console.warn('Failed to log admin action:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Suspension lifted successfully'
    });

  } catch (error) {
    console.error('Lift suspension error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
