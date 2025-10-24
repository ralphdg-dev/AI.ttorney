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
      reported = "all",
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    const offset = (page - 1) * limit;

    // Query forum_posts with user information
    console.log(
      `Fetching forum posts: page ${page}, limit ${limit}, offset ${offset}`
    );
    const { data: testPosts, error: testError } = await supabaseAdmin
      .from("forum_posts")
      .select(
        `
				*,
				user:users(id, full_name, email, username, role)
			`
      )
      .range(offset, offset + parseInt(limit) - 1)
      .order(sort_by, { ascending: sort_order === "asc" });

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
        corporate: "Corporate Law",
        property: "Property Law",
        tax: "Tax Law",
        constitutional: "Constitutional Law",
        administrative: "Administrative Law",
        other: "Other",
        // Possible variations
        Family: "Family Law",
        Criminal: "Criminal Law",
        Civil: "Civil Law",
        Labor: "Labor Law",
        Corporate: "Corporate Law",
        Property: "Property Law",
        Tax: "Tax Law",
        Constitutional: "Constitutional Law",
        Administrative: "Administrative Law",
        Other: "Other",
        // Numeric IDs (if using numbers)
        1: "Family Law",
        2: "Criminal Law",
        3: "Civil Law",
        4: "Labor Law",
        5: "Corporate Law",
        6: "Property Law",
        7: "Tax Law",
        8: "Constitutional Law",
        9: "Administrative Law",
        10: "Other",
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

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from("forum_posts")
      .select("id", { count: "exact", head: true });

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
    const adminId = req.adminId;

    if (!action || !["delete", "flag", "restore"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be delete, flag, or restore",
      });
    }

    let updateData = {};

    if (action === "delete") {
      updateData = {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
        moderation_reason: reason || "Deleted by admin",
      };
    } else if (action === "flag") {
      updateData = {
        is_flagged: true,
        flagged_at: new Date().toISOString(),
        flagged_by: adminId,
        moderation_reason: reason || "Flagged by admin",
      };
    } else if (action === "restore") {
      updateData = {
        is_deleted: false,
        is_flagged: false,
        deleted_at: null,
        deleted_by: null,
        flagged_at: null,
        flagged_by: null,
        moderation_reason: null,
      };
    }

    const { data, error } = await supabaseAdmin
      .from("forum_posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Forum post not found or update failed",
      });
    }

    // Log the moderation action
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: adminId,
      action: `forum_post_${action}`,
      target_type: "forum_post",
      target_id: id,
      details: { reason, previous_state: data },
    });

    res.json({
      success: true,
      message: `Post ${action}d successfully`,
      data: data,
    });
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

    if (!action || !["dismiss", "sanctioned"].includes(action)) {
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

// Get forum statistics
router.get("/statistics", authenticateAdmin, async (req, res) => {
  try {
    // Get various forum statistics
    const [
      totalPosts,
      activePosts,
      deletedPosts,
      totalReports,
      pendingReports,
      resolvedReports,
    ] = await Promise.all([
      supabaseAdmin
        .from("forum_posts")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("forum_posts")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false),
      supabaseAdmin
        .from("forum_posts")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", true),
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
          deleted: deletedPosts.count || 0,
        },
        reports: {
          total: totalReports.count || 0,
          pending: pendingReports.count || 0,
          resolved: resolvedReports.count || 0,
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

module.exports = router;
