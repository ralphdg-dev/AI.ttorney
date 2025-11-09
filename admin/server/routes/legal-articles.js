const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const multer = require("multer");
const { authenticateAdmin } = require("../middleware/auth");
const { notifyArticlePublished, notifyArticleUpdated } = require("../utils/notificationHelper");
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/legal-articles — get all articles with admin full_name
router.get("/", async (req, res) => {
  const { archived } = req.query;
  try {
    let query = supabaseAdmin
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
        is_verified,
        deleted_at,
        admin:verified_by (
          full_name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (archived === "true") {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    const getImageUrl = (imagePath) => {
      if (!imagePath) return "";
      if (imagePath.startsWith("http")) return imagePath;
      
      // SECURITY: Never use hardcoded URLs - fail if env var missing
      if (!process.env.SUPABASE_URL) {
        throw new Error("SUPABASE_URL environment variable is required");
      }
      
      const bucketName = "legal-articles";
      const cleanPath = imagePath.replace(/^\//, "");
      const encodedPath = encodeURIComponent(cleanPath);
      return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/${encodedPath}`;
    };

    const formattedData = data.map((article) => ({
      ...article,
      enTitle: article.title_en,
      filTitle: article.title_fil,
      enDescription: article.description_en,
      filDescription: article.description_fil,
      enContent: article.content_en,
      filContent: article.content_fil,
      image: getImageUrl(article.image_article),
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      verifiedAt: article.verified_at,
      verifiedBy: article.verified_by,
      verifiedByName: article.admin?.full_name || null,
      status: article.is_verified ? "Published" : "Unpublished",
    }));

    res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error("Error fetching legal articles:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/legal-articles — add new article
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      title_en,
      title_fil,
      description_en,
      description_fil,
      content_en,
      content_fil,
      category,
    } = req.body;

    const { data: article, error: insertError } = await supabaseAdmin
      .from("legal_articles")
      .insert([
        {
          title_en,
          title_fil,
          description_en,
          description_fil,
          content_en,
          content_fil,
          category,
          is_verified: false,
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    let imagePath = null;

    if (req.file) {
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `${article.id}_article-image.${fileExtension}`;
      const storagePath = `articles-img/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("legal-articles")
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) throw uploadError;
      imagePath = storagePath;

      const { error: updateError } = await supabaseAdmin
        .from("legal_articles")
        .update({ image_article: imagePath })
        .eq("id", article.id);
      if (updateError) throw updateError;
    }

    // SECURITY: Fail if SUPABASE_URL not set
    if (!process.env.SUPABASE_URL) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    const getImageUrl = (path) =>
      path
        ? `${process.env.SUPABASE_URL}/storage/v1/object/public/legal-articles/${encodeURIComponent(
            path
          )}`
        : "";

    const formattedArticle = {
      ...article,
      enTitle: article.title_en,
      filTitle: article.title_fil,
      enDescription: article.description_en,
      filDescription: article.description_fil,
      enContent: article.content_en,
      filContent: article.content_fil,
      image: getImageUrl(imagePath),
      createdAt: article.created_at,
      updatedAt: article.updated_at,
      verifiedAt: article.verified_at,
      verifiedBy: article.verified_by,
      verifiedByName: null,
      status: article.is_verified ? "Published" : "Unpublished",
    };

    res.status(201).json({ success: true, data: formattedArticle });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

// PUT /api/legal-articles/:id — update article
router.put("/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const {
    title_en,
    title_fil,
    description_en,
    description_fil,
    content_en,
    content_fil,
    category,
  } = req.body;

  try {
    const { data: updatedArticle, error: updateError } = await supabaseAdmin
      .from("legal_articles")
      .update({
        title_en,
        title_fil,
        description_en,
        description_fil,
        content_en,
        content_fil,
        category,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    let imagePath = updatedArticle.image_article || null;
    if (req.file) {
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `${id}_article-image.${fileExtension}`;
      const storagePath = `articles-img/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("legal-articles")
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });
      if (uploadError) throw uploadError;
      imagePath = storagePath;

      const { error: imageUpdateError } = await supabaseAdmin
        .from("legal_articles")
        .update({ image_article: imagePath })
        .eq("id", id);
      if (imageUpdateError) throw imageUpdateError;
    }

    // SECURITY: Fail if SUPABASE_URL not set
    if (!process.env.SUPABASE_URL) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    const getImageUrl = (path) =>
      path
        ? `${process.env.SUPABASE_URL}/storage/v1/object/public/legal-articles/${encodeURIComponent(
            path
          )}`
        : "";

    const formattedArticle = {
      ...updatedArticle,
      enTitle: updatedArticle.title_en,
      filTitle: updatedArticle.title_fil,
      enDescription: updatedArticle.description_en,
      filDescription: updatedArticle.description_fil,
      enContent: updatedArticle.content_en,
      filContent: updatedArticle.content_fil,
      image: getImageUrl(imagePath),
      createdAt: updatedArticle.created_at,
      updatedAt: updatedArticle.updated_at,
      verifiedAt: updatedArticle.verified_at,
      verifiedBy: updatedArticle.verified_by,
      verifiedByName: null,
      status: updatedArticle.is_verified ? "Published" : "Unpublished",
    };

    // Send notifications to users who bookmarked this article (if published)
    if (updatedArticle.is_verified) {
      notifyArticleUpdated(
        id,
        updatedArticle.title_en || "Article",
        updatedArticle.title_fil || "Artikulo"
      ).catch((err) => {
        console.error("⚠️ Failed to send update notifications (non-blocking):", err);
      });
    }

    res.status(200).json({ success: true, data: formattedArticle });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

// PATCH /api/legal-articles/:id/publish - NOW WITH AUTH
router.patch("/:id/publish", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { publish } = req.body;
  const adminId = req.admin.id; // Get logged-in admin ID from middleware

  try {
    // Prepare update data
    const updateData = {
      is_verified: publish,
      verified_at: publish ? new Date().toISOString() : null,
      verified_by: publish ? adminId : null, // Set verified_by to admin ID
    };

    const { data: updatedArticle, error } = await supabaseAdmin
      .from("legal_articles")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        admin:verified_by (
          full_name
        )
      `
      )
      .single();

    if (error) throw error;

    // SECURITY: Fail if SUPABASE_URL not set
    if (!process.env.SUPABASE_URL) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    const getImageUrl = (path) =>
      path
        ? `${process.env.SUPABASE_URL}/storage/v1/object/public/legal-articles/${encodeURIComponent(
            path
          )}`
        : "";

    const formattedArticle = {
      ...updatedArticle,
      enTitle: updatedArticle.title_en,
      filTitle: updatedArticle.title_fil,
      enDescription: updatedArticle.description_en,
      filDescription: updatedArticle.description_fil,
      enContent: updatedArticle.content_en,
      filContent: updatedArticle.content_fil,
      image: getImageUrl(updatedArticle.image_article),
      createdAt: updatedArticle.created_at,
      updatedAt: updatedArticle.updated_at,
      verifiedAt: updatedArticle.verified_at,
      verifiedBy: updatedArticle.verified_by,
      verifiedByName: updatedArticle.admin?.full_name || null,
      status: updatedArticle.is_verified ? "Published" : "Unpublished",
    };

    // Send notifications to mobile app users
    if (publish) {
      // Article was just published - notify all users
      notifyArticlePublished(
        id,
        updatedArticle.title_en || "New Article",
        updatedArticle.title_fil || "Bagong Artikulo"
      ).catch((err) => {
        console.error("⚠️ Failed to send publish notifications (non-blocking):", err);
      });
    }

    res.status(200).json({ success: true, data: formattedArticle });
  } catch (err) {
    console.error("Publish/Unpublish error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

// PATCH /api/legal-articles/:id/archive
router.patch("/:id/archive", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: article, error: fetchError } = await supabaseAdmin
      .from("legal_articles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !article)
      throw fetchError || new Error("Article not found");

    let updateData = { deleted_at: new Date().toISOString() };
    if (article.is_verified) {
      updateData.is_verified = false;
      updateData.verified_at = null;
      updateData.verified_by = null;
    }

    const { data: updatedArticle, error: updateError } = await supabaseAdmin
      .from("legal_articles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: "Article archived successfully",
      data: updatedArticle,
    });
  } catch (err) {
    console.error("Archive error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

// PATCH /api/legal-articles/:id/restore
router.patch("/:id/restore", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: restoredArticle, error } = await supabaseAdmin
      .from("legal_articles")
      .update({ deleted_at: null })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Article restored successfully",
      data: restoredArticle,
    });
  } catch (err) {
    console.error("Restore error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

module.exports = router;
