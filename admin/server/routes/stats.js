const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");

router.get("/user-count", async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "registered_user");

    if (error) throw error;

    res.json({ legalSeekers: count });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/lawyer-count", async (req, res) => {
  try {
    const { count, error } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "verified_lawyer");

    if (error) throw error;

    res.json({ verifiedLawyer: count });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/weekly-forum-posts", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const { count, error } = await supabaseAdmin
      .from("forum_posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) throw error;

    res.json({ weeklyForumPosts: count });
  } catch (error) {
    console.error("Error fetching weekly forum posts:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/consultations-count", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const { count, error } = await supabaseAdmin
      .from("consultation_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) throw error;

    res.json({ consultationsCount: count });
  } catch (error) {
    console.error("Error fetching weekly forum posts:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
