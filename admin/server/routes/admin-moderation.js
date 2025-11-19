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
      // Table check failed
    }

    // Check user_suspensions table
    try {
      await supabaseAdmin.from('user_suspensions').select('id').limit(1);
      tableStatus.user_suspensions = true;
    } catch (error) {
      // Table check failed
    }

    // Check users table
    try {
      await supabaseAdmin.from('users').select('id').limit(1);
      tableStatus.users = true;
    } catch (error) {
      // Table check failed
    }

    res.json({
      success: true,
      message: 'Admin moderation system health check',
      tables: tableStatus,
      fallback_mode: !tableStatus.user_violations || !tableStatus.user_suspensions
    });

  } catch (error) {
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
      report_id,
      duration 
    } = req.body;
    const adminId = req.admin?.id;

    // Helper function to calculate end date based on duration
    const calculateEndDate = (duration) => {
      if (duration === 'permanent') return null;
      
      const endDate = new Date();
      switch (duration) {
        case '1_day': endDate.setDate(endDate.getDate() + 1); break;
        case '3_days': endDate.setDate(endDate.getDate() + 3); break;
        case '1_week': endDate.setDate(endDate.getDate() + 7); break;
        case '2_weeks': endDate.setDate(endDate.getDate() + 14); break;
        case '1_month': endDate.setMonth(endDate.getMonth() + 1); break;
        case '3_months': endDate.setMonth(endDate.getMonth() + 3); break;
        case '6_months': endDate.setMonth(endDate.getMonth() + 6); break;
        case '1_year': endDate.setFullYear(endDate.getFullYear() + 1); break;
        default: return null; // Default to permanent if unknown duration
      }
      return endDate.toISOString();
    };

    // Validate input
    if (!['strike', 'suspend_7days', 'ban', 'restrict', 'unrestrict'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be strike, suspend_7days, ban, restrict, or unrestrict'
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
    } else if (action === 'ban') {
      // Forum ban (permanent or temporary based on duration)
      const newSuspensionCount = (currentUser.suspension_count || 0) + 1;
      const endDate = calculateEndDate(duration);
      const isPermanent = duration === 'permanent' || !endDate;
      
      actionTaken = 'banned';
      strikeCountAfter = 0;
      suspensionCountAfter = newSuspensionCount;
      
      userUpdateData = {
        strike_count: 0,
        suspension_count: newSuspensionCount,
        account_status: 'banned',
        suspension_end: endDate,
        last_violation_at: new Date().toISOString(),
        banned_at: new Date().toISOString(),
        banned_reason: admin_reason
      };

      suspensionData = {
        user_id: user_id,
        suspension_type: isPermanent ? 'permanent' : 'temporary',
        reason: `Admin-imposed ${isPermanent ? 'permanent' : 'temporary'} ban: ${admin_reason}`,
        suspension_number: newSuspensionCount,
        strikes_at_suspension: currentUser.strike_count || 0,
        started_at: new Date().toISOString(),
        ends_at: endDate,
        status: 'active'
      };
    } else if (action === 'restrict') {
      // Forum restriction (view-only access, permanent or temporary based on duration)
      const endDate = calculateEndDate(duration);
      const isPermanent = duration === 'permanent' || !endDate;
      
      actionTaken = 'suspended'; // Use supported enum value (closest semantic match)
      strikeCountAfter = currentUser.strike_count || 0; // Keep current strikes
      suspensionCountAfter = currentUser.suspension_count || 0; // Keep current suspension count
      
      userUpdateData = {
        account_status: 'restricted',
        suspension_end: endDate, // Set end date for temporary restrictions
        last_violation_at: new Date().toISOString()
      };

      // Create a restriction record (similar to suspension but for restrictions)
      if (!isPermanent) {
        suspensionData = {
          user_id: user_id,
          suspension_type: 'restriction',
          reason: `Admin-imposed temporary forum restriction: ${admin_reason}`,
          suspension_number: 0, // Restrictions don't count as suspensions
          strikes_at_suspension: currentUser.strike_count || 0,
          started_at: new Date().toISOString(),
          ends_at: endDate,
          status: 'active'
        };
      }
    } else if (action === 'unrestrict') {
      // Remove forum restrictions (restore to active status)
      actionTaken = 'suspended'; // Use supported enum value (for database compatibility)
      strikeCountAfter = currentUser.strike_count || 0; // Keep current strikes
      suspensionCountAfter = currentUser.suspension_count || 0; // Keep current suspension count
      
      userUpdateData = {
        account_status: 'active',
        suspension_end: null, // Clear any restriction end date
        last_violation_at: new Date().toISOString()
      };

      // No suspension record needed for unrestrict, just violation record for audit trail
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
    
    // Try to refresh schema cache by making a simple query first
    try {
      await supabaseAdmin.from('user_violations').select('id').limit(1);
    } catch (schemaError) {
      // Schema refresh failed
    }
    
    try {
      const { data, error: violationError } = await supabaseAdmin
        .from('user_violations')
        .insert(violationData)
        .select()
        .single();

      if (violationError) {
        
        // Check if it's a schema cache issue
        if (violationError.code === 'PGRST204' || violationError.message.includes('schema cache')) {
          // Schema cache issue detected, using fallback violation record
          violationResult = {
            id: `fallback-violation-${Date.now()}`,
            ...violationData,
            created_at: new Date().toISOString()
          };
        } else if (violationError.code === '42P01' || violationError.message.includes('relation') || violationError.message.includes('does not exist')) {
          // user_violations table does not exist, using fallback
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
            // user_suspensions table does not exist, skipping suspension record
          } else {
            // Error creating suspension record
          }
        }
      } catch (err) {
        // Error with user_suspensions table
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
                       action === 'suspend_7days' ? 'suspended' : 
                       action === 'restrict' ? 'suspended' : 
                       action === 'ban' ? 'banned' : 
                       action === 'unrestrict' ? 'suspended' : 'banned',
          admin_notes: admin_reason
        })
        .eq('id', report_id);

      if (reportError) {
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
      // Failed to log admin action
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
      // Supabase violations query error
      
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
      // Count query error
    }

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
        lifted_by,
        lifted_acknowledged
      `)
      .eq('user_id', user_id)
      .order('started_at', { ascending: false });

    if (error) {
      // Supabase suspensions query error
      
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

    
    res.json({
      success: true,
      data: suspensions || []
    });

  } catch (error) {
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
        lifted_reason: reason,
        lifted_acknowledged: false // User needs to acknowledge the lift
      })
      .eq('user_id', user_id)
      .eq('status', 'active');

    if (suspensionUpdateError) {
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
      // Failed to log admin action
    }

    res.json({
      success: true,
      message: 'Suspension lifted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Lift ban (admin override)
router.post('/lift-ban/:user_id', authenticateAdmin, async (req, res) => {
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
      .select('account_status, suspension_count, banned_at, banned_reason')
      .eq('id', user_id)
      .single();

    if (fetchError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (currentUser.account_status !== 'banned') {
      return res.status(400).json({
        success: false,
        error: 'User is not currently banned'
      });
    }

    // Update user status
    const { error: userUpdateError } = await supabaseAdmin
      .from('users')
      .update({
        account_status: 'active',
        suspension_end: null,
        banned_at: null,
        banned_reason: null
      })
      .eq('id', user_id);

    if (userUpdateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }

    // Update suspension record (bans are stored as permanent suspensions)
    const { error: suspensionUpdateError } = await supabaseAdmin
      .from('user_suspensions')
      .update({
        status: 'lifted',
        lifted_at: new Date().toISOString(),
        lifted_by: adminId,
        lifted_reason: reason,
        lifted_acknowledged: false // User needs to acknowledge the lift
      })
      .eq('user_id', user_id)
      .eq('status', 'active')
      .eq('suspension_type', 'permanent');

    if (suspensionUpdateError) {
      // Don't fail the request
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'admin_lift_ban',
        target_type: 'user',
        target_id: user_id,
        details: {
          reason: reason,
          suspension_count: currentUser.suspension_count,
          previous_ban_reason: currentUser.banned_reason,
          banned_at: currentUser.banned_at
        }
      });
    } catch (auditError) {
      // Failed to log admin action
    }

    res.json({
      success: true,
      message: 'Ban lifted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Mark lifted suspension as acknowledged (for user notification system)
router.post('/acknowledge-lift/:user_id/:suspension_id', authenticateAdmin, async (req, res) => {
  try {
    const { user_id, suspension_id } = req.params;
    const adminId = req.admin?.id;

    // Verify the suspension exists and is lifted
    const { data: suspension, error: fetchError } = await supabaseAdmin
      .from('user_suspensions')
      .select('id, status, lifted_at, lifted_acknowledged')
      .eq('id', suspension_id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !suspension) {
      return res.status(404).json({
        success: false,
        error: 'Suspension record not found'
      });
    }

    if (suspension.status !== 'lifted') {
      return res.status(400).json({
        success: false,
        error: 'Suspension is not in lifted status'
      });
    }

    if (suspension.lifted_acknowledged === true) {
      return res.status(400).json({
        success: false,
        error: 'Suspension lift has already been acknowledged'
      });
    }

    // Mark as acknowledged
    const { error: updateError } = await supabaseAdmin
      .from('user_suspensions')
      .update({
        lifted_acknowledged: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', suspension_id);

    if (updateError) {
      // Don't fail the request
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'admin_acknowledge_lift',
        target_type: 'user_suspension',
        target_id: suspension_id,
        details: {
          user_id: user_id,
          suspension_id: suspension_id,
          acknowledged_at: new Date().toISOString()
        }
      });
    } catch (auditError) {
      // Failed to log acknowledgment action
    }

    res.json({
      success: true,
      message: 'Suspension lift acknowledged successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get unacknowledged lifted suspensions for user notifications
router.get('/unacknowledged-lifts/:user_id', authenticateAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: suspensions, error } = await supabaseAdmin
      .from('user_suspensions')
      .select(`
        id,
        suspension_type,
        reason,
        lifted_at,
        lifted_reason,
        lifted_by,
        lifted_acknowledged
      `)
      .eq('user_id', user_id)
      .eq('status', 'lifted')
      .eq('lifted_acknowledged', false)
      .order('lifted_at', { ascending: false });

    if (error) {
      // Error fetching unacknowledged lifts
      
      // If table doesn't exist, return empty data
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch unacknowledged lifts: ' + error.message
      });
    }

    res.json({
      success: true,
      data: suspensions || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
});

module.exports = router;
