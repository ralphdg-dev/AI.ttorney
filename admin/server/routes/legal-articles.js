// routes/legalArticles.js
const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

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

    // Function to generate proper Supabase Storage URL
    const getImageUrl = (imagePath) => {
      if (!imagePath) return "";

      // If it's already a full URL, return as is
      if (imagePath.startsWith("http")) return imagePath;

      // If it's a storage path, construct the proper URL
      // Based on your bucket structure: articles-img/arrest.jpg
      const bucketName = "legal-articles"; // Adjust to your actual bucket name

      // Remove any leading slashes and encode the path
      const cleanPath = imagePath.replace(/^\//, "");
      const encodedPath = encodeURIComponent(cleanPath);

      // Construct the Supabase Storage URL
      const supabaseUrl =
        process.env.SUPABASE_URL || "https://vmlbrckrlgwlobhnpstx.supabase.co";
      return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
    };

    // Map is_verified to status for frontend
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
      status: article.is_verified ? "Published" : "Unpublished",
    }));

    res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error("Error fetching legal articles:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

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

    // Step 1: Insert article WITHOUT image first
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

    // Step 2: If image uploaded, store it with ID in filename
    if (req.file) {
      const fileExtension = req.file.originalname.split(".").pop(); // keep extension
      const fileName = `${article.id}_article-image.${fileExtension}`;
      const storagePath = `articles-img/${fileName}`;

      const { data: uploadData, error: uploadError } =
        await supabaseAdmin.storage
          .from("legal-articles")
          .upload(storagePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true, // overwrite if exists
          });

      if (uploadError) throw uploadError;
      imagePath = storagePath;

      // Step 3: Update article with image path
      const { error: updateError } = await supabaseAdmin
        .from("legal_articles")
        .update({ image_article: imagePath })
        .eq("id", article.id);

      if (updateError) throw updateError;
    }

    // Step 4: Construct public URL
    const supabaseUrl =
      process.env.SUPABASE_URL || "https://vmlbrckrlgwlobhnpstx.supabase.co";
    const getImageUrl = (path) =>
      path
        ? `${supabaseUrl}/storage/v1/object/public/legal-articles/${encodeURIComponent(
            path
          )}`
        : "";

    // Step 5: Return formatted article
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
    // Step 1: Update fields
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

    // Step 2: If image uploaded, save to storage
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

      // Update article with new image path
      const { error: imageUpdateError } = await supabaseAdmin
        .from("legal_articles")
        .update({ image_article: imagePath })
        .eq("id", id);

      if (imageUpdateError) throw imageUpdateError;
    }

    const supabaseUrl =
      process.env.SUPABASE_URL || "https://vmlbrckrlgwlobhnpstx.supabase.co";
    const getImageUrl = (path) =>
      path
        ? `${supabaseUrl}/storage/v1/object/public/legal-articles/${encodeURIComponent(
            path
          )}`
        : "";

    // Return formatted article
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
      status: updatedArticle.is_verified ? "Published" : "Unpublished",
    };

    res.status(200).json({ success: true, data: formattedArticle });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

// PATCH /api/legal-articles/:id/publish
router.patch("/:id/publish", async (req, res) => {
  const { id } = req.params;
  const { publish } = req.body; // boolean: true = publish, false = unpublish

  try {
    const { data: updatedArticle, error } = await supabaseAdmin
      .from("legal_articles")
      .update({
        is_verified: publish,
        verified_at: publish ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const supabaseUrl =
      process.env.SUPABASE_URL || "https://vmlbrckrlgwlobhnpstx.supabase.co";
    const getImageUrl = (path) =>
      path
        ? `${supabaseUrl}/storage/v1/object/public/legal-articles/${encodeURIComponent(
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
      status: updatedArticle.is_verified ? "Published" : "Unpublished",
    };

    res.status(200).json({ success: true, data: formattedArticle });
  } catch (err) {
    console.error("Publish/Unpublish error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

module.exports = router;
