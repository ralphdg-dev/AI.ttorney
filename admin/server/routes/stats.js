const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");

function computeDelta(current, old) {
  if (old === 0) return { delta: 0, up: true };
  const delta = ((current - old) / old) * 100;
  return {
    delta: Number(delta.toFixed(1)),
    up: delta >= 0,
  };
}

router.get("/user-count", async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Current total users
    const { count: currentCount, error: currentError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "registered_user");

    if (currentError) throw currentError;

    // Count up to 30 days ago
    const { count: oldCount, error: oldError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "registered_user")
      .lte("created_at", thirtyDaysAgo.toISOString());

    if (oldError) throw oldError;

    const { delta, up } = computeDelta(currentCount, oldCount);

    res.json({
      legalSeekers: currentCount,
      delta,
      up,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/lawyer-count", async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const { count: currentCount, error: currentError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "verified_lawyer");

    if (currentError) throw currentError;

    const { count: oldCount, error: oldError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "verified_lawyer")
      .lte("created_at", thirtyDaysAgo.toISOString());

    if (oldError) throw oldError;

    const { delta, up } = computeDelta(currentCount, oldCount);

    res.json({
      verifiedLawyer: currentCount,
      delta,
      up,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/weekly-forum-posts", async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const thirtySevenDaysAgo = new Date();
    thirtySevenDaysAgo.setDate(today.getDate() - 37);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Current week posts
    const { count: currentCount, error: currentError } = await supabaseAdmin
      .from("forum_posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    if (currentError) throw currentError;

    // 30 days ago to 23 days ago (the same 7-day span, shifted)
    const { count: oldCount, error: oldError } = await supabaseAdmin
      .from("forum_posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtySevenDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (oldError) throw oldError;

    const { delta, up } = computeDelta(currentCount, oldCount);

    res.json({
      weeklyForumPosts: currentCount,
      delta,
      up,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/consultations-count", async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const thirtySevenDaysAgo = new Date();
    thirtySevenDaysAgo.setDate(today.getDate() - 37);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Current week
    const { count: currentCount, error: currentError } = await supabaseAdmin
      .from("consultation_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    if (currentError) throw currentError;

    // Same week window, but 30 days ago
    const { count: oldCount, error: oldError } = await supabaseAdmin
      .from("consultation_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtySevenDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (oldError) throw oldError;

    const { delta, up } = computeDelta(currentCount, oldCount);

    res.json({
      consultationsCount: currentCount,
      delta,
      up,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/lawyer-applications-monthly", async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data, error } = await supabaseAdmin
      .from("lawyer_applications")
      .select("submitted_at");

    if (error) throw error;

    const filtered = data.filter(
      (item) => new Date(item.submitted_at) >= oneMonthAgo
    );

    const grouped = {};
    filtered.forEach((item) => {
      const day = new Date(item.submitted_at).toISOString().split("T")[0];
      grouped[day] = (grouped[day] || 0) + 1;
    });

    const chartData = Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, count]) => ({ date, count }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/lawyer-applications-status-monthly", async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data, error } = await supabaseAdmin
      .from("lawyer_applications")
      .select("submitted_at, status");

    if (error) throw error;

    const recent = data.filter(
      (item) => new Date(item.submitted_at) >= oneMonthAgo
    );

    const grouped = {};
    recent.forEach((item) => {
      const date = new Date(item.submitted_at).toISOString().split("T")[0];
      if (!grouped[date]) {
        grouped[date] = { date, approved: 0, pending: 0, rejected: 0 };
      }
      const status = item.status?.toLowerCase();
      if (status === "accepted") grouped[date].approved += 1;
      else if (status === "pending") grouped[date].pending += 1;
      else if (status === "rejected") grouped[date].rejected += 1;
    });

    const chartData = Object.values(grouped).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/forum-reports-last-30-days", async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const { data, error } = await supabaseAdmin
      .from("forum_reports")
      .select("submitted_at");

    if (error) throw error;

    const recent = data.filter(
      (item) => new Date(item.submitted_at) >= thirtyDaysAgo
    );

    const grouped = {};
    recent.forEach((item) => {
      const date = new Date(item.submitted_at).toISOString().split("T")[0];
      if (!grouped[date]) grouped[date] = { date, reports: 0 };
      grouped[date].reports += 1;
    });

    const chartData = Object.values(grouped).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/forum-posts-by-category", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("forum_posts")
      .select("category");

    if (error) throw error;

    const categories = [
      "civil",
      "consumer",
      "criminal",
      "family",
      "labor",
      "others",
    ];
    const counts = categories.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    data.forEach((post) => {
      const category = post.category?.toLowerCase();
      if (counts.hasOwnProperty(category)) {
        counts[category] += 1;
      }
    });

    const chartData = Object.entries(counts).map(([category, count]) => ({
      category,
      count,
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/terms-by-category", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("glossary_terms")
      .select("category");

    if (error) throw error;

    const categories = [
      "civil",
      "consumer",
      "criminal",
      "family",
      "labor",
      "others",
    ];
    const counts = categories.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    data.forEach((term) => {
      const category = term.category?.toLowerCase();
      if (counts.hasOwnProperty(category)) {
        counts[category] += 1;
      }
    });

    const chartData = Object.entries(counts).map(([category, count]) => ({
      category,
      count,
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/articles-by-category", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("legal_articles")
      .select("category");

    if (error) throw error;

    const categories = [
      "civil",
      "consumer",
      "criminal",
      "family",
      "labor",
      "others",
    ];
    const counts = categories.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    // Count per category, anything unrecognized goes to "others"
    data.forEach((article) => {
      const category = article.category?.toLowerCase();
      if (counts.hasOwnProperty(category)) {
        counts[category] += 1;
      } else {
        counts["others"] += 1;
      }
    });

    const chartData = Object.entries(counts).map(([category, count]) => ({
      category,
      count,
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Combined terms and articles by category
router.get("/guides-and-terms-by-category", async (req, res) => {
  try {
    // Fetch terms
    const { data: termsData, error: termsError } = await supabaseAdmin
      .from("glossary_terms")
      .select("category");

    if (termsError) throw termsError;

    // Fetch articles
    const { data: articlesData, error: articlesError } = await supabaseAdmin
      .from("legal_articles")
      .select("category");

    if (articlesError) throw articlesError;

    const categories = [
      "civil",
      "consumer",
      "criminal",
      "family",
      "labor",
    ];
    
    const counts = categories.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    // Count terms
    termsData.forEach((term) => {
      const category = term.category?.toLowerCase();
      if (counts.hasOwnProperty(category)) {
        counts[category] += 1;
      }
    });

    // Count articles
    articlesData.forEach((article) => {
      const category = article.category?.toLowerCase();
      if (counts.hasOwnProperty(category)) {
        counts[category] += 1;
      }
    });

    const chartData = Object.entries(counts).map(([category, count]) => ({
      category,
      count,
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard summary stats
router.get("/dashboard-summary", async (req, res) => {
  try {
    console.log('🔍 Dashboard summary API called');
    
    // Total users (from users table only, excluding admins and superadmins)
    console.log('📊 Fetching total users...');
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .neq("role", "admin")
      .neq("role", "superadmin");

    console.log('👥 Total users result:', { count: totalUsers, error: usersError });
    if (usersError) throw usersError;

    // Lawyers count (verified_lawyer role only)
    console.log('⚖️ Fetching lawyers...');
    const { count: lawyersCount, error: lawyersError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "verified_lawyer");

    console.log('👨‍⚖️ Lawyers result:', { count: lawyersCount, error: lawyersError });
    if (lawyersError) throw lawyersError;

    // Legal seekers count (registered_user + guest roles)
    console.log('🔍 Fetching legal seekers...');
    const { count: seekersCount, error: seekersError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .in("role", ["registered_user", "guest"]);

    console.log('👤 Legal seekers result:', { count: seekersCount, error: seekersError });
    if (seekersError) throw seekersError;

    // Forum posts count
    console.log('💬 Fetching forum posts...');
    const { count: forumPosts, error: forumError } = await supabaseAdmin
      .from("forum_posts")
      .select("*", { count: "exact", head: true });

    console.log('📝 Forum posts result:', { count: forumPosts, error: forumError });
    if (forumError) throw forumError;

    const result = {
      totalUsers,
      lawyersCount,
      seekersCount,
      forumPosts,
    };
    
    console.log('✅ Final result to send:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Dashboard summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forum posts trend by month (last 7 months)
router.get("/forum-posts-trend", async (req, res) => {
  try {
    console.log('📈 Fetching forum posts trend...');
    
    const monthsData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get last 7 months of data
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const { count, error } = await supabaseAdmin
        .from("forum_posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());
      
      if (error) throw error;
      
      monthsData.push({
        month: monthNames[date.getMonth()],
        value: count || 0
      });
    }
    
    console.log('📊 Forum posts trend data:', monthsData);
    res.json(monthsData);
  } catch (error) {
    console.error('❌ Forum posts trend error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
