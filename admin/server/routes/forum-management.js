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

    console.log("Reports query result:", { count: allReports?.length, error: reportsError });

    // Get sample posts
    const { data: allPosts, error: postsError } = await supabaseAdmin
      .from("forum_posts")
      .select("id, content, created_at")
      .limit(10);

    console.log("Posts query result:", { count: allPosts?.length, error: postsError });

    if (reportsError || postsError) {
      return res.json({
        success: false,
        reportsError: reportsError?.message,
        postsError: postsError?.message,
      });
    }

    // Analyze data types and values
    const reportAnalysis = allReports?.map(r => ({
      id: r.id,
      target_id: r.target_id,
      target_id_type: typeof r.target_id,
      target_id_length: r.target_id?.toString()?.length,
      target_type: r.target_type,
      reason: r.reason,
    })) || [];

    const postAnalysis = allPosts?.map(p => ({
      id: p.id,
      id_type: typeof p.id,
      id_length: p.id?.toString()?.length,
      content_preview: p.content?.substring(0, 50),
    })) || [];

    // Try to find matches
    const matches = [];
    const mismatches = [];
    
    for (const report of allReports || []) {
      if (report.target_type === 'post') {
        const matchingPost = allPosts?.find(p => 
          p.id === report.target_id || 
          p.id.toString() === report.target_id?.toString() ||
          String(p.id) === String(report.target_id)
        );
        
        if (matchingPost) {
          matches.push({
            report_id: report.id,
            target_id: report.target_id,
            post_id: matchingPost.id,
            match_type: 'found'
          });
        } else {
          mismatches.push({
            report_id: report.id,
            target_id: report.target_id,
            target_id_type: typeof report.target_id,
            available_post_ids: allPosts?.slice(0, 5).map(p => ({ id: p.id, type: typeof p.id }))
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

// Get all reported posts
router.get("/reported-posts", authenticateAdmin, async (req, res) => {
  try {
    console.log("Reported posts endpoint called with query:", req.query);

    const {
      page = 1,
      limit = 50,
      status = "pending",
      category = "all",
      sort_by = "submitted_at",
      sort_order = "desc",
    } = req.query;

    const offset = (page - 1) * limit;

    // First, let's check what reports exist in the database
    const { data: allReports, error: checkError } = await supabaseAdmin
      .from("forum_reports")
      .select("id, reason, target_type")
      .eq("target_type", "post")
      .limit(10);

    console.log("Sample reports in database:", allReports);
    console.log("Unique reasons found:", [
      ...new Set(allReports?.map((r) => r.reason) || []),
    ]);

    // Build the base query
    let query = supabaseAdmin
      .from("forum_reports")
      .select(
        `
        id,
        reason,
        reason_context,
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
      .eq("target_type", "post"); // Only get post reports for now

    // Apply search filter if provided
    if (req.query.search && req.query.search.trim() !== "") {
      const searchTerm = req.query.search.trim();
      console.log(`Applying search filter: ${searchTerm}`);
      // Search in reason, reason_context, and reporter name
      query = query.or(
        `reason.ilike.%${searchTerm}%,reason_context.ilike.%${searchTerm}%`
      );
    }

    // Apply category filter
    if (category !== "all") {
      console.log(`Category filter requested: ${category}`);

      // Map category filter to reason field - try both exact match and case variations
      const possibleReasons = [
        category, // exact match
        category.toLowerCase(), // lowercase
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(), // capitalize first letter
      ];

      console.log(`Trying to match reasons: ${possibleReasons.join(", ")}`);

      // Use 'in' filter to match any of the possible variations
      query = query.in("reason", possibleReasons);
    } else {
      console.log("No category filter applied (showing all)");
    }

    // Note: Status filtering is not implemented since your table doesn't have a status column
    // All reports are considered 'pending' by default

    // Sort by submitted_at (your table's timestamp column)
    const sortColumn = sort_by === "created_at" ? "submitted_at" : sort_by;
    query = query.order(sortColumn, { ascending: sort_order === "asc" });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: reports, error } = await query;

    if (error) {
      console.error("Get reports error:", error);
      return res.status(500).json({
        success: false,
        error: `Failed to fetch reports: ${error.message}`,
      });
    }

    console.log(`Found ${reports?.length || 0} reports after filtering`);

    if (reports && reports.length > 0) {
      console.log("First report sample:", {
        id: reports[0].id,
        reason: reports[0].reason,
        target_type: reports[0].target_type,
        target_id: reports[0].target_id,
        submitted_at: reports[0].submitted_at,
      });
    }

    // Test: Check if we can access forum_posts table at all
    console.log("Testing forum_posts table access...");
    const { data: testPosts, error: testPostsError } = await supabaseAdmin
      .from("forum_posts")
      .select("id, body, created_at, is_flagged")
      .limit(10);

    if (testPostsError) {
      console.error("Cannot access forum_posts table:", testPostsError);
    } else {
      console.log(
        `forum_posts table accessible: found ${testPosts?.length || 0} posts`
      );
      if (testPosts && testPosts.length > 0) {
        console.log("=== AVAILABLE POSTS IN DATABASE ===");
        testPosts.forEach((post, index) => {
          console.log(`Post ${index + 1}: ID="${post.id}", is_flagged=${post.is_flagged}, created_at=${post.created_at}, body_preview="${post.body?.substring(0, 30)}..."`);
        });
        
        // Check if any of the reported target_ids match existing posts
        console.log("=== CHECKING REPORT TARGET_IDS AGAINST EXISTING POSTS ===");
        if (reports && reports.length > 0) {
          reports.forEach((report, index) => {
            const matchingPost = testPosts.find(p => p.id === report.target_id);
            console.log(`Report ${index + 1} (${report.target_id}): ${matchingPost ? '✅ MATCH FOUND' : '❌ NO MATCH'}`);
            if (matchingPost) {
              console.log(`  -> Matching post: is_flagged=${matchingPost.is_flagged}, body="${matchingPost.body?.substring(0, 50)}..."`);
            }
          });
        }
      }
    }

    // For each report, get the associated post data
    const reportsWithPosts = await Promise.all(
      (reports || []).map(async (report) => {
        if (report.target_type === "post") {
          console.log(
            `\n=== FETCHING POST FOR REPORT ${report.id} ===`
          );
          console.log(`Target ID: "${report.target_id}" (type: ${typeof report.target_id}, length: ${report.target_id?.toString()?.length})`);

          let post = null;
          let postError = null;

          // Method 1: Direct UUID match (including deleted posts)
          console.log("Method 1: Direct UUID match (including deleted posts)");
          const { data: post1, error: error1 } = await supabaseAdmin
            .from("forum_posts")
            .select(
              `
              id,
              body,
              category,
              is_anonymous,
              created_at,
              user:users(id, full_name, email, username, role)
            `
            )
            .eq("id", report.target_id)
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors
          
          console.log(`Query result for ${report.target_id}:`, { 
            found: !!post1, 
            error: error1?.message,
            post_preview: post1 ? `ID=${post1.id}, body="${post1.body?.substring(0, 30)}..."` : 'null'
          });

          if (post1) {
            console.log("✅ Method 1 SUCCESS: Direct UUID match found");
            post = post1;
          } else {
            console.log("❌ Method 1 FAILED:", error1?.message || "No match found");
            
            // Method 2: String conversion
            console.log("Method 2: String conversion");
            const { data: post2, error: error2 } = await supabaseAdmin
              .from("forum_posts")
              .select(
                `
                id,
                body,
                category,
                is_anonymous,
                created_at,
                user:users(id, full_name, email, username, role)
              `
              )
              .eq("id", String(report.target_id))
              .maybeSingle();

            if (post2) {
              console.log("✅ Method 2 SUCCESS: String conversion match found");
              post = post2;
            } else {
              console.log("❌ Method 2 FAILED:", error2?.message || "No match found");
              
              // Method 3: Check if target_id exists at all in posts table
              console.log("Method 3: Checking if any posts exist with similar IDs");
              const { data: allPosts, error: error3 } = await supabaseAdmin
                .from("forum_posts")
                .select("id")
                .limit(10);

              if (allPosts && allPosts.length > 0) {
                console.log("Available post IDs (first 10):", allPosts.map(p => `"${p.id}"`));
                
                // Try to find exact match in the list
                const exactMatch = allPosts.find(p => p.id === report.target_id || String(p.id) === String(report.target_id));
                if (exactMatch) {
                  console.log("🔍 FOUND EXACT MATCH in list, trying to fetch again...");
                  const { data: post3, error: error3b } = await supabaseAdmin
                    .from("forum_posts")
                    .select(
                      `
                      id,
                      body,
                      category,
                      is_anonymous,
                      created_at,
                      user:users(id, full_name, email, username, role)
                    `
                    )
                    .eq("id", exactMatch.id)
                    .maybeSingle();
                  
                  if (post3) {
                    console.log("✅ Method 3 SUCCESS: Found via exact match");
                    post = post3;
                  } else {
                    console.log("❌ Method 3 FAILED:", error3b?.message);
                  }
                } else {
                  console.log("❌ No exact match found in available post IDs");
                }
              } else {
                console.log("❌ Method 3 FAILED: Could not fetch post IDs:", error3?.message);
              }
            }
          }

          if (post) {
            console.log(`✅ FINAL SUCCESS: Post found for report ${report.id}`);
            console.log(`Post ID: "${post.id}", Content preview: "${post.body?.substring(0, 50)}..."`);
          } else {
            console.log(`❌ FINAL FAILURE: No post found for report ${report.id} with target_id "${report.target_id}"`);
          }

          return {
            ...report,
            status: "pending", // Default status since your table doesn't have this
            category: report.reason, // Use reason as category
            created_at: report.submitted_at, // Map to expected field name
            post: post || null,
          };
        }
        return report;
      })
    );

    // Get total count with same filters
    let countQuery = supabaseAdmin
      .from("forum_reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "post");

    // Apply same search filter to count
    if (req.query.search && req.query.search.trim() !== "") {
      const searchTerm = req.query.search.trim();
      countQuery = countQuery.or(
        `reason.ilike.%${searchTerm}%,reason_context.ilike.%${searchTerm}%`
      );
    }

    // Apply same category filter to count
    if (category !== "all") {
      const possibleReasons = [
        category,
        category.toLowerCase(),
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
      ];
      countQuery = countQuery.in("reason", possibleReasons);
    }

    const { count, error: countError } = await countQuery;

    res.json({
      success: true,
      data: reportsWithPosts || [],
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
    const { action, resolution_notes } = req.body; // action: 'dismiss' | 'action_taken'
    const adminId = req.adminId;

    if (!action || !["dismiss", "action_taken"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be dismiss or action_taken",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("forum_reports")
      .update({
        status: "resolved",
        resolution: action,
        resolution_notes: resolution_notes || "",
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: "Report not found or update failed",
      });
    }

    // Log the resolution
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_id: adminId,
      action: `report_${action}`,
      target_type: "forum_report",
      target_id: id,
      details: { resolution_notes },
    });

    res.json({
      success: true,
      message: `Report ${
        action === "dismiss" ? "dismissed" : "resolved with action"
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
      supabaseAdmin
        .from("forum_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("forum_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved"),
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
