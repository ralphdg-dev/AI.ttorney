const express = require("express");
const { supabaseAdmin } = require("../config/supabase");
const { authenticateAdmin } = require("../middleware/auth");

const router = express.Router();

// Get all forum posts with filtering and pagination
router.get("/posts", authenticateAdmin, async (req, res) => {
  try {
    console.log("=== FORUM POSTS ENDPOINT CALLED ===");
    console.log("Query params:", req.query);

    const {
      page = 1,
      limit = 50,
      search = "",
      category = "all",
      status = "all",
      reported = "all",
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build the query with filters
    console.log(
      `Fetching forum posts: page ${page}, limit ${limit}, offset ${offset}`
    );
    console.log("Applied filters:", { search, category, status, reported });

    let query = supabaseAdmin
      .from("forum_posts")
      .select(
        `
				*,
				user:users(id, full_name, email, username, role)
			`
      );

    // Apply search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(`body.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
    }

    // Apply category filter
    if (category && category !== "all") {
      query = query.eq("category", category.toLowerCase());
    }

    // Apply status filter
    if (status && status !== "all") {
      if (status === "active") {
        query = query.eq("is_flagged", false);
      } else if (status === "deleted") {
        query = query.eq("is_flagged", true);
      }
    }

    // Apply reported filter
    if (reported && reported !== "all") {
      if (reported === "reported") {
        // Get posts that have reports
        const { data: reportedPostIds } = await supabaseAdmin
          .from("forum_reports")
          .select("target_id")
          .eq("target_type", "post");
        
        if (reportedPostIds && reportedPostIds.length > 0) {
          const postIds = reportedPostIds.map(r => r.target_id);
          query = query.in("id", postIds);
        } else {
          // No reported posts, return empty result
          query = query.eq("id", "00000000-0000-0000-0000-000000000000"); // Non-existent ID
        }
      } else if (reported === "unreported") {
        // Get posts that don't have reports
        const { data: reportedPostIds } = await supabaseAdmin
          .from("forum_reports")
          .select("target_id")
          .eq("target_type", "post");
        
        if (reportedPostIds && reportedPostIds.length > 0) {
          const postIds = reportedPostIds.map(r => r.target_id);
          query = query.not("id", "in", `(${postIds.join(",")})`);
        }
        // If no reports exist, all posts are unreported, so no additional filter needed
      }
    }

    // Apply sorting and pagination
    query = query
      .order(sort_by, { ascending: sort_order === "asc" })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: testPosts, error: testError } = await query;

    console.log("Basic query result:", {
      count: testPosts?.length || 0,
      error: testError,
      sample: testPosts?.[0] || null,
    });

    // Debug: Check what fields are available in the first post
    if (testPosts && testPosts.length > 0) {
      console.log(
        "Available fields in forum_posts:",
        Object.keys(testPosts[0])
      );
      console.log("Sample post data:", {
        id: testPosts[0].id,
        content: testPosts[0].body,
        text: testPosts[0].text,
        body: testPosts[0].body,
        message: testPosts[0].message,
        description: testPosts[0].description,
        title: testPosts[0].title,
        category: testPosts[0].category,
        type: testPosts[0].type,
        tag: testPosts[0].tag,
      });
    }

    if (testError) {
      console.error("forum_posts table error:", testError);
      return res.status(500).json({
        success: false,
        error: `Database error: ${testError.message}`,
        details: testError,
      });
    }

    if (!testPosts || testPosts.length === 0) {
      console.log("No posts found in forum_posts table");
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
        },
        message: "No posts found in database",
      });
    }

    // Category mapping function
    const getCategoryDisplayName = (categoryId) => {
      const categories = {
        // Standard category IDs
        family: "Family Law",
        criminal: "Criminal Law",
        civil: "Civil Law",
        labor: "Labor Law",
        other: "Other",
        // Possible variations
        Family: "Family Law",
        Criminal: "Criminal Law",
        Civil: "Civil Law",
        Labor: "Labor Law",
        Other: "Other",
        // Numeric IDs (if using numbers)
        1: "Family Law",
        2: "Criminal Law",
        3: "Civil Law",
        4: "Labor Law",
        5: "Other",
      };

      console.log(
        `Mapping category: "${categoryId}" -> "${
          categories[categoryId] || categoryId || "Uncategorized"
        }"`
      );
      return categories[categoryId] || categoryId || "Uncategorized";
    };

    // Process posts with actual data
    const processedPosts = testPosts.map((post, index) => {
      // Debug category for first few posts
      if (index < 3) {
        console.log(`Post ${post.id} category debug:`, {
          category: post.category,
          type: post.type,
          tag: post.tag,
          forum_category: post.forum_category,
          law_category: post.law_category,
        });
      }

      const categoryValue =
        post.category ||
        post.type ||
        post.tag ||
        post.forum_category ||
        post.law_category;

      return {
        ...post,
        // Try different possible content field names
        content:
          post.body ||
          post.text ||
          post.message ||
          post.description ||
          post.title ||
          "No content available",
        // Try different possible category field names
        category_display_name: getCategoryDisplayName(categoryValue),
        // Use joined user data or create fallback
        user: post.is_anonymous
          ? {
              id: null,
              full_name: "Anonymous User",
              email: "",
              username: "anonymous",
              role: "user",
            }
          : post.user || {
              id: post.user_id || null,
              full_name: "Unknown User",
              email: "",
              username: "unknown",
              role: "user",
            },
        reports: [],
        _count: { forum_replies: 0 },
      };
    });

    // Get total count for pagination with same filters
    let countQuery = supabaseAdmin
      .from("forum_posts")
      .select("id", { count: "exact", head: true });

    // Apply the same filters to count query
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery = countQuery.or(`body.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`);
    }

    if (category && category !== "all") {
      countQuery = countQuery.eq("category", category.toLowerCase());
    }

    if (status && status !== "all") {
      if (status === "active") {
        countQuery = countQuery.eq("is_flagged", false);
      } else if (status === "deleted") {
        countQuery = countQuery.eq("is_flagged", true);
      }
    }

    if (reported && reported !== "all") {
      if (reported === "reported") {
        const { data: reportedPostIds } = await supabaseAdmin
          .from("forum_reports")
          .select("target_id")
          .eq("target_type", "post");
        
        if (reportedPostIds && reportedPostIds.length > 0) {
          const postIds = reportedPostIds.map(r => r.target_id);
          countQuery = countQuery.in("id", postIds);
        } else {
          countQuery = countQuery.eq("id", "00000000-0000-0000-0000-000000000000");
        }
      } else if (reported === "unreported") {
        const { data: reportedPostIds } = await supabaseAdmin
          .from("forum_reports")
          .select("target_id")
          .eq("target_type", "post");
        
        if (reportedPostIds && reportedPostIds.length > 0) {
          const postIds = reportedPostIds.map(r => r.target_id);
          countQuery = countQuery.not("id", "in", `(${postIds.join(",")})`);
        }
      }
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error("Count query error:", countError);
    }

    const totalCount = count || testPosts.length;
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    console.log(
      `Returning ${processedPosts.length} posts out of ${totalCount} total`
    );

    return res.json({
      success: true,
      data: processedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: totalPages,
      },
    });
  } catch (error) {
    console.error("Get forum posts error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get single forum post details
router.get("/posts/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabaseAdmin
      .from("forum_posts")
      .select(
        `
				id,
				body,
				category,
				is_anonymous,
				created_at,
				updated_at,
				user:users(id, full_name, email, username, role),
				replies:forum_replies(
					id,
					body,
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
			`
      )
      .eq("id", id)
      .single();

    if (error || !post) {
      return res.status(404).json({
        success: false,
        error: "Forum post not found",
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Get forum post error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Delete/Flag a forum post
router.patch("/posts/:id/moderate", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'delete' | 'flag' | 'restore'
    const adminId = req.admin?.id; // Get admin ID from the authenticated admin object

    console.log("=== MODERATION REQUEST ===");
    console.log("Admin object:", req.admin);
    console.log("Admin ID:", adminId);

    if (!action || !["delete", "flag", "restore"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be delete, flag, or restore",
      });
    }

    // First check if the post exists
    const { data: post, error: postError } = await supabaseAdmin
      .from("forum_posts")
      .select("id, is_flagged")
      .eq("id", id)
      .single();

    if (postError || !post) {
      return res.status(404).json({
        success: false,
        error: "Forum post not found",
      });
    }

    if (action === "flag" || action === "delete") {
      // Check if post is already flagged by this admin
      const { data: existingFlag } = await supabaseAdmin
        .from("flagged_posts")
        .select("id")
        .eq("forum_post_id", id)
        .eq("flagged_by_admin_id", adminId)
        .eq("status", "active")
        .single();

      if (existingFlag) {
        return res.status(400).json({
          success: false,
          error: "Post is already flagged by this admin",
          already_flagged: true
        });
      }

      // Create entry in flagged_posts table
      console.log("=== CREATING FLAG RECORD ===");
      console.log("Post ID:", id);
      console.log("Admin ID:", adminId);
      console.log("Reason:", reason);
      console.log("Action:", action);

      const flagData = {
        forum_post_id: id,
        flagged_by_admin_id: adminId, // Use admin ID from admin table
        reason:
          reason ||
          (action === "delete"
            ? "Marked for deletion by admin"
            : "Flagged by admin"),
        status: "active",
      };

      console.log("Flag data to insert:", flagData);

      const { data: flagResult, error: flagError } = await supabaseAdmin
        .from("flagged_posts")
        .insert(flagData)
        .select();

      if (flagError) {
        console.error("Error creating flag record:", flagError);
        console.error("Flag error details:", {
          message: flagError.message,
          details: flagError.details,
          hint: flagError.hint,
          code: flagError.code,
        });
        return res.status(500).json({
          success: false,
          error: `Failed to create flag record: ${flagError.message}`,
          details: flagError.details,
        });
      }

      console.log("Flag record created successfully:", flagResult);

      // Update the post to mark it as flagged
      const { data: updatedPost, error: updateError } = await supabaseAdmin
        .from("forum_posts")
        .update({
          is_flagged: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: "Failed to update post flag status",
        });
      }

      // Log the moderation action (if audit logs table exists)
      try {
        await supabaseAdmin.from("admin_audit_logs").insert({
          admin_id: adminId,
          action: `forum_post_${action}`,
          target_type: "forum_post",
          target_id: id,
          details: { reason, action_type: action },
        });
      } catch (auditError) {
        console.warn("Failed to log audit trail:", auditError.message);
        // Don't fail the main operation if audit logging fails
      }

      res.json({
        success: true,
        message: `Post ${action}d successfully`,
        data: updatedPost,
      });
    } else if (action === "restore") {
      // Resolve all active flags for this post
      const { error: resolveError } = await supabaseAdmin
        .from("flagged_posts")
        .update({
          status: "resolved",
          resolved_by_admin_id: adminId,
          resolved_at: new Date().toISOString(),
          resolution_notes: reason || "Restored by admin",
        })
        .eq("forum_post_id", id)
        .eq("status", "active");

      if (resolveError) {
        console.error("Error resolving flags:", resolveError);
      }

      // Update the post to remove flag
      const { data: updatedPost, error: updateError } = await supabaseAdmin
        .from("forum_posts")
        .update({
          is_flagged: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: "Failed to update post flag status",
        });
      }

      // Log the moderation action (if audit logs table exists)
      try {
        await supabaseAdmin.from("admin_audit_logs").insert({
          admin_id: adminId,
          action: `forum_post_${action}`,
          target_type: "forum_post",
          target_id: id,
          details: { reason, action_type: action },
        });
      } catch (auditError) {
        console.warn("Failed to log audit trail:", auditError.message);
        // Don't fail the main operation if audit logging fails
      }

      res.json({
        success: true,
        message: "Post restored successfully",
        data: updatedPost,
      });
    }
  } catch (error) {
    console.error("Moderate forum post error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Debug endpoint to check reports in database
router.get("/reported-posts/debug", authenticateAdmin, async (req, res) => {
  try {
    console.log("=== DEBUG ENDPOINT CALLED ===");

    // Get sample reports
    const { data: allReports, error: reportsError } = await supabaseAdmin
      .from("forum_reports")
      .select("*")
      .limit(10);

    console.log("Reports query result:", {
      count: allReports?.length,
      error: reportsError,
    });

    // Get sample posts
    const { data: allPosts, error: postsError } = await supabaseAdmin
      .from("forum_posts")
      .select("id, content, created_at")
      .limit(10);

    console.log("Posts query result:", {
      count: allPosts?.length,
      error: postsError,
    });

    if (reportsError || postsError) {
      return res.json({
        success: false,
        reportsError: reportsError?.message,
        postsError: postsError?.message,
      });
    }

    // Analyze data types and values
    const reportAnalysis =
      allReports?.map((r) => ({
        id: r.id,
        target_id: r.target_id,
        target_id_type: typeof r.target_id,
        target_id_length: r.target_id?.toString()?.length,
        target_type: r.target_type,
        reason: r.reason,
      })) || [];

    const postAnalysis =
      allPosts?.map((p) => ({
        id: p.id,
        id_type: typeof p.id,
        id_length: p.id?.toString()?.length,
        content_preview: p.content?.substring(0, 50),
      })) || [];

    // Try to find matches
    const matches = [];
    const mismatches = [];

    for (const report of allReports || []) {
      if (report.target_type === "post") {
        const matchingPost = allPosts?.find(
          (p) =>
            p.id === report.target_id ||
            p.id.toString() === report.target_id?.toString() ||
            String(p.id) === String(report.target_id)
        );

        if (matchingPost) {
          matches.push({
            report_id: report.id,
            target_id: report.target_id,
            post_id: matchingPost.id,
            match_type: "found",
          });
        } else {
          mismatches.push({
            report_id: report.id,
            target_id: report.target_id,
            target_id_type: typeof report.target_id,
            available_post_ids: allPosts
              ?.slice(0, 5)
              .map((p) => ({ id: p.id, type: typeof p.id })),
          });
        }
      }
    }

    const reasons = [...new Set(allReports?.map((r) => r.reason) || [])];

    res.json({
      success: true,
      summary: {
        totalReports: allReports?.length || 0,
        totalPosts: allPosts?.length || 0,
        matches: matches.length,
        mismatches: mismatches.length,
      },
      uniqueReasons: reasons,
      reportAnalysis,
      postAnalysis,
      matches,
      mismatches,
      sampleReports: allReports?.slice(0, 3),
      samplePosts: allPosts?.slice(0, 3),
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/reported-posts", authenticateAdmin, async (req, res) => {
  try {
    console.log("Reported posts endpoint called with query:", req.query);

    const {
      page = 1,
      limit = 50,
      status = "all", // default to all to show all statuses
      category = "all",
      sort_by = "submitted_at",
      sort_order = "desc",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build the base query for forum_reports
    let query = supabaseAdmin
      .from("forum_reports")
      .select(
        `
				id,
				reason,
				reason_context,
				status,
				target_type,
				target_id,
				submitted_at,
				reporter:users!forum_reports_reporter_id_fkey(
					id,
					full_name,
					email,
					username
				)
			`
      )
      .eq("target_type", "post");

    // Apply filters
    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (category !== "all") {
      query = query.ilike("reason", `%${category}%`);
    }

    const sortColumn = sort_by === "created_at" ? "submitted_at" : sort_by;
    query = query.order(sortColumn, { ascending: sort_order === "asc" });

    query = query.range(offset, offset + limit - 1);

    const { data: reports, error } = await query;

    if (error) {
      console.error("Get reports error:", error);
      return res.status(500).json({
        success: false,
        error: `Failed to fetch reports: ${error.message}`,
      });
    }

    // Attach each reported post data
    const reportsWithPosts = await Promise.all(
      (reports || []).map(async (report) => {
        let post = null;
        const { data: postData, error: postError } = await supabaseAdmin
          .from("forum_posts")
          .select(
            `
						id,
						body,
						category,
						is_anonymous,
						is_flagged,
						created_at,
						user:users(id, full_name, email, username, role)
					`
          )
          .eq("id", report.target_id)
          .maybeSingle();

        if (postError) {
          console.error(
            `Error fetching post for report ${report.id}:`,
            postError
          );
        }

        post = postData || null;

        return {
          ...report,
          category: report.reason,
          created_at: report.submitted_at,
          post,
        };
      })
    );

    // Count query
    let countQuery = supabaseAdmin
      .from("forum_reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "post");

    if (status !== "all") {
      countQuery = countQuery.eq("status", status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) console.error("Count error:", countError);

    res.json({
      success: true,
      data: reportsWithPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Get reported posts error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Resolve a report
router.patch("/reports/:id/resolve", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ REMOVED: resolution_notes from body
    const { action } = req.body; // action: 'dismiss' | 'sanctioned'
    const adminId = req.adminId;

    if (!action || !["dismiss", "dismissed", "sanctioned"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be 'dismiss' or 'sanctioned'",
      });
    }

    // ✅ UPDATED: This now *only* updates the 'status' column
    const { data, error } = await supabaseAdmin
      .from("forum_reports")
      .update({
        status: action,
        // resolution, resolution_notes, resolved_at, resolved_by are all removed
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Report not found or update failed",
        details: error?.message,
      });
    }

    // If sanctioned, add a strike to the content author's account and create a violation record
    if (action === "sanctioned") {
      try {
        // Fetch report to get target details
        const { data: reportRow, error: reportFetchError } = await supabaseAdmin
          .from("forum_reports")
          .select("id, target_id, target_type")
          .eq("id", id)
          .maybeSingle();

        if (!reportFetchError && reportRow && reportRow.target_type === "post" && reportRow.target_id) {
          // Fetch the post to identify author and content
          const { data: postRow, error: postError } = await supabaseAdmin
            .from("forum_posts")
            .select("id, user_id, body")
            .eq("id", reportRow.target_id)
            .maybeSingle();

          if (!postError && postRow && postRow.user_id) {
            // Mark the post as flagged/hidden
            const { error: flagUpdateErr } = await supabaseAdmin
              .from("forum_posts")
              .update({ is_flagged: true, updated_at: new Date().toISOString() })
              .eq("id", postRow.id);

            if (flagUpdateErr) {
              console.warn("Failed to set is_flagged=true on forum_posts:", flagUpdateErr);
            }

            // Get current user strike/suspension counts
            const { data: userRow } = await supabaseAdmin
              .from("users")
              .select("id, strike_count, suspension_count")
              .eq("id", postRow.user_id)
              .maybeSingle();

            const currentStrikes = (userRow?.strike_count || 0);
            const currentSuspensions = (userRow?.suspension_count || 0);
            const newStrikeCount = currentStrikes + 1;

            // Increment strike count
            const { error: userUpdateErr } = await supabaseAdmin
              .from("users")
              .update({
                strike_count: newStrikeCount,
                last_violation_at: new Date().toISOString(),
              })
              .eq("id", postRow.user_id);

            if (userUpdateErr) {
              console.warn("Failed to increment strike count:", userUpdateErr);
            } else {
              // Create violation record for audit/history
              try {
                const violationData = {
                  user_id: postRow.user_id,
                  violation_type: "forum_post",
                  content_id: postRow.id,
                  content_text: (postRow.body || "").slice(0, 1000),
                  flagged_categories: { admin_action: true },
                  category_scores: { admin_action: 1.0 },
                  violation_summary: "Admin sanctioned reported post",
                  action_taken: "strike_added",
                  strike_count_after: newStrikeCount,
                  suspension_count_after: currentSuspensions,
                };

                const { error: violationErr } = await supabaseAdmin
                  .from("user_violations")
                  .insert(violationData);

                if (violationErr) {
                  console.warn("Failed to create user violation record:", violationErr);
                }
              } catch (vioErr) {
                console.warn("Exception creating violation record:", vioErr?.message || vioErr);
              }
            }
          }
        }
      } catch (strikeErr) {
        console.warn("Sanction side-effect (add strike) failed:", strikeErr?.message || strikeErr);
      }
    }

    // Log the resolution (simplified details)
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: adminId,
      action: `report_${action}`,
      target_type: "forum_report",
      target_id: id,
      // ✅ REMOVED: resolution_notes from details
      details: { status_updated_to: action },
    });

    res.json({
      success: true,
      message: `Report ${
        action === "dismiss" ? "dismissed" : "sanctioned"
      } successfully`,
      data: data,
    });
  } catch (error) {
    console.error("Resolve report error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get flagging history for a specific post
router.get("/posts/:id/flags", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: flags, error } = await supabaseAdmin
      .from("flagged_posts")
      .select(
        `
        id,
        reason,
        status,
        flagged_at,
        resolved_at,
        resolution_notes,
        flagged_by:admin!flagged_posts_flagged_by_admin_id_fkey(id, username, email),
        resolved_by:admin!flagged_posts_resolved_by_admin_id_fkey(id, username, email)
      `
      )
      .eq("forum_post_id", id)
      .order("flagged_at", { ascending: false });

    if (error) {
      console.error("Error fetching flags:", error);
      return res.status(500).json({
        success: false,
        error: `Failed to fetch flags: ${error.message}`,
      });
    }

    res.json({
      success: true,
      data: flags || [],
      count: flags?.length || 0,
    });
  } catch (error) {
    console.error("Get post flags error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Debug endpoint to check if a specific post exists
router.get("/posts/:id/exists", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`=== CHECKING POST EXISTENCE: ${id} ===`);

    const { data: post, error } = await supabaseAdmin
      .from("forum_posts")
      .select(
        "id, body, created_at, is_flagged, user_id, is_anonymous, category"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`,
        exists: false,
      });
    }

    const exists = !!post;
    console.log("Post exists:", exists);
    if (exists) {
      console.log("Post data:", {
        id: post.id,
        content_preview: post.body?.substring(0, 50),
        created_at: post.created_at,
        is_flagged: post.is_flagged,
        user_id: post.user_id,
        is_anonymous: post.is_anonymous,
        category: post.category,
      });
    }

    res.json({
      success: true,
      exists,
      data: post,
      message: exists ? "Post found in database" : "Post not found in database",
    });
  } catch (error) {
    console.error("Check post existence error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      exists: false,
    });
  }
});

// Get forum statistics
router.get("/statistics", authenticateAdmin, async (req, res) => {
  try {
    // Get various forum statistics
    const [totalPosts, activePosts, flaggedPosts, totalReports] =
      await Promise.all([
        supabaseAdmin
          .from("forum_posts")
          .select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("forum_posts")
          .select("id", { count: "exact", head: true })
          .eq("is_flagged", false),
        supabaseAdmin
          .from("forum_posts")
          .select("id", { count: "exact", head: true })
          .eq("is_flagged", true),
        supabaseAdmin
          .from("forum_reports")
          .select("id", { count: "exact", head: true }),
      ]);

    res.json({
      success: true,
      data: {
        posts: {
          total: totalPosts.count || 0,
          active: activePosts.count || 0,
          flagged: flaggedPosts.count || 0,
        },
        reports: {
          total: totalReports.count || 0,
        },
      },
    });
  } catch (error) {
    console.error("Get forum statistics error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get all reported replies with filtering and pagination
router.get("/reported-replies", authenticateAdmin, async (req, res) => {
  try {
    console.log("Reported replies endpoint called with query:", req.query);

    const {
      page = 1,
      limit = 50,
      status = "all",
      category = "all",
      sort_by = "submitted_at",
      sort_order = "desc",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build the base query for reported_replies
    let query = supabaseAdmin
      .from("reported_replies")
      .select(
        `
        id,
        reason,
        reason_context,
        status,
        submitted_at,
        reporter:users!reported_replies_reporter_id_fkey(
          id,
          full_name,
          email,
          username
        ),
        reply:forum_replies!reported_replies_reply_id_fkey(
          id,
          reply_body,
          created_at,
          user_id,
          post_id,
          user:users(id, full_name, email, username, role),
          post:forum_posts(id, body, is_anonymous, user:users(id, full_name, email, username))
        )
      `
      );

    // Apply filters
    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (category !== "all") {
      query = query.eq("reason", category);
    }

    const sortColumn = sort_by === "created_at" ? "submitted_at" : sort_by;
    query = query.order(sortColumn, { ascending: sort_order === "asc" });

    query = query.range(offset, offset + limit - 1);

    const { data: reports, error } = await query;

    if (error) {
      console.error("Get reported replies error:", error);
      return res.status(500).json({
        success: false,
        error: `Failed to fetch reported replies: ${error.message}`,
      });
    }

    // Count query
    let countQuery = supabaseAdmin
      .from("reported_replies")
      .select("id", { count: "exact", head: true });

    if (status !== "all") {
      countQuery = countQuery.eq("status", status);
    }

    if (category !== "all") {
      countQuery = countQuery.eq("reason", category);
    }

    const { count, error: countError } = await countQuery;

    if (countError) console.error("Count error:", countError);

    res.json({
      success: true,
      data: reports || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Get reported replies error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Resolve a reported reply
router.patch("/reply-reports/:id/resolve", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // action: 'dismiss' | 'sanctioned'
    const adminId = req.admin?.id;

    console.log("=== RESOLVE REPLY REPORT ===");
    console.log("Report ID:", id);
    console.log("Action:", action);
    console.log("Admin ID:", adminId);

    if (!action || !["dismiss", "sanctioned"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be 'dismiss' or 'sanctioned'",
      });
    }

    // Get the report details first
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reported_replies")
      .select(
        `
        id,
        reply_id,
        reporter_id,
        reason,
        reason_context,
        reply:forum_replies!reported_replies_reply_id_fkey(
          id,
          reply_body,
          user_id,
          post_id
        )
      `
      )
      .eq("id", id)
      .single();

    if (reportError || !report) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
        details: reportError?.message,
      });
    }

    // If action is sanctioned, create a violation record and add a strike
    if (action === "sanctioned" && report.reply) {
      try {
        // Get current user status
        const { data: userData, error: userError } = await supabaseAdmin
          .from("users")
          .select("id, strike_count, suspension_count, account_status")
          .eq("id", report.reply.user_id)
          .single();

        if (userError) {
          console.error("Error fetching user:", userError);
          throw new Error("Failed to fetch user data");
        }

        const currentStrikes = userData.strike_count || 0;
        const currentSuspensions = userData.suspension_count || 0;
        const newStrikeCount = currentStrikes + 1;

        // Determine action based on strikes
        let actionTaken = "strike_added";
        let newSuspensionCount = currentSuspensions;
        let suspensionEnd = null;
        let accountStatus = "active";

        if (newStrikeCount >= 3) {
          if (currentSuspensions >= 2) {
            // Permanent ban
            actionTaken = "banned";
            accountStatus = "banned";
            newSuspensionCount = currentSuspensions + 1;
          } else {
            // 7-day suspension
            actionTaken = "suspended";
            accountStatus = "suspended";
            const suspensionDate = new Date();
            suspensionDate.setDate(suspensionDate.getDate() + 7);
            suspensionEnd = suspensionDate.toISOString();
            newSuspensionCount = currentSuspensions + 1;
          }
        }

        // Create violation record
        const violationData = {
          user_id: report.reply.user_id,
          content_id: report.reply_id,
          violation_type: "forum_reply",
          content_text: report.reply.reply_body || "",
          flagged_categories: {
            [report.reason]: true,
          },
          category_scores: {
            [report.reason]: 1.0,
          },
          violation_summary: `Reply reported for ${report.reason}${report.reason_context ? `: ${report.reason_context}` : ""}`,
          action_taken: actionTaken,
          strike_count_after: actionTaken === "banned" || actionTaken === "suspended" ? 0 : newStrikeCount,
          suspension_count_after: newSuspensionCount,
        };

        const { data: violation, error: violationError } = await supabaseAdmin
          .from("user_violations")
          .insert(violationData)
          .select()
          .single();

        if (violationError) {
          console.error("Error creating violation:", violationError);
          throw new Error("Failed to create violation record");
        }

        console.log("✅ Violation created:", violation.id);

        // Update user status
        const userUpdate = {
          strike_count: actionTaken === "banned" || actionTaken === "suspended" ? 0 : newStrikeCount,
          suspension_count: newSuspensionCount,
          account_status: accountStatus,
          last_violation_at: new Date().toISOString(),
        };

        if (suspensionEnd) {
          userUpdate.suspension_end = suspensionEnd;
        }

        if (accountStatus === "banned") {
          userUpdate.banned_at = new Date().toISOString();
          userUpdate.banned_reason = `Automatic ban after ${newSuspensionCount} suspensions`;
        }

        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update(userUpdate)
          .eq("id", report.reply.user_id);

        if (updateError) {
          console.error("Error updating user:", updateError);
          throw new Error("Failed to update user status");
        }

        console.log(`✅ User updated: ${actionTaken}, strikes: ${userUpdate.strike_count}`);

        // Hide the reply
        const { error: hideError } = await supabaseAdmin
          .from("forum_replies")
          .update({ hidden: true })
          .eq("id", report.reply_id);

        if (hideError) {
          console.error("Error hiding reply:", hideError);
        } else {
          console.log("✅ Reply hidden");
        }

        // Send notification to violating user
        try {
          const notificationMessage = actionTaken === "banned" 
            ? `Your reply has been removed and your account has been permanently banned for violating community guidelines: ${report.reason}.`
            : actionTaken === "suspended"
            ? `Your reply has been removed and your account has been suspended for 7 days for violating community guidelines: ${report.reason}. This is suspension #${newSuspensionCount}.`
            : `Your reply has been removed for violating community guidelines: ${report.reason}. A strike has been added to your account (${newStrikeCount} total).`;

          const notificationTitle = actionTaken === "banned" 
            ? "Account Banned" 
            : actionTaken === "suspended" 
            ? "Account Suspended" 
            : "Content Violation Warning";

          const { data: notifData, error: notifError } = await supabaseAdmin
            .from("notifications")
            .insert({
              user_id: report.reply.user_id,
              type: "violation_warning",
              title: notificationTitle,
              message: notificationMessage,
              data: JSON.stringify({
                violation_type: report.reason,
                content_id: report.reply_id,
                strike_count: newStrikeCount,
                action_taken: actionTaken,
              }),
              read: false,
            })
            .select();

          if (notifError) {
            console.error("❌ Error sending notification:", notifError);
            throw notifError;
          }
          
          console.log("✅ Notification sent to user:", notifData);
        } catch (notifError) {
          console.error("❌ Failed to send notification:", notifError.message || notifError);
        }

        // Create suspension record if needed
        if (actionTaken === "suspended" || actionTaken === "banned") {
          const suspensionData = {
            user_id: report.reply.user_id,
            suspension_type: actionTaken === "banned" ? "permanent" : "temporary",
            reason: `Automatic ${actionTaken === "banned" ? "permanent ban" : "suspension"} after ${currentStrikes + 1} strikes`,
            violation_ids: [violation.id],
            suspension_number: newSuspensionCount,
            strikes_at_suspension: currentStrikes + 1,
            ends_at: suspensionEnd,
            status: "active",
          };

          const { error: suspensionError } = await supabaseAdmin
            .from("user_suspensions")
            .insert(suspensionData);

          if (suspensionError) {
            console.error("Error creating suspension:", suspensionError);
          } else {
            console.log("✅ Suspension record created");
          }
        }
      } catch (violationErr) {
        console.error("Error processing violation:", violationErr);
        return res.status(500).json({
          success: false,
          error: "Failed to process violation",
          details: violationErr.message,
        });
      }
    }

    // Update the report status
    const newStatus = action === 'dismiss' ? 'dismissed' : action;

    const { data, error } = await supabaseAdmin
      .from("reported_replies")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Report not found or update failed",
        details: error?.message,
      });
    }

    // Log the resolution
    try {
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_id: adminId,
        action: `reply_report_${action}`,
        target_type: "reported_reply",
        target_id: id,
        details: { 
          status_updated_to: action,
          reply_id: report.reply_id,
          violation_created: action === "sanctioned"
        },
      });
    } catch (auditError) {
      console.warn("Failed to log audit trail:", auditError.message);
    }

    res.json({
      success: true,
      message: `Report ${newStatus === "dismissed" ? "dismissed" : "sanctioned"} successfully`,
      data: data,
    });
  } catch (error) {
    console.error("Resolve reply report error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

module.exports = router;
