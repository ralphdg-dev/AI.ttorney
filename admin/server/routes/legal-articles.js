// routes/legalArticles.js
const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");

// GET /api/legal-articles — get all articles regardless of verification
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("legal_articles")
      .select(
        `
        id,
        title_en,
        title_fil,
        description_en,
        description_fil,
        category,
        image_article,
        content_en,
        content_fil,
        created_at,
        updated_at,
        created_by,
        verified_by,
        verified_at,
        is_verified
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Map is_verified to status for frontend
    const formattedData = data.map((article) => ({
      ...article,
      enTitle: article.title_en,
      filTitle: article.title_fil,
      enDescription: article.description_en,
      filDescription: article.description_fil,
      enContent: article.content_en,
      filContent: article.content_fil,
      image: article.image_article || "",
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      status: article.is_verified ? "Published" : "Unpublished",
    }));

    res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error("Error fetching legal articles:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
