const express = require("express");
const router = express.Router();
const { supabaseAdmin } = require("../config/supabase");
const multer = require("multer");
const { authenticateAdmin } = require("../middleware/auth");
const {
  notifyArticlePublished,
  notifyArticleUpdated,
} = require("../utils/notificationHelper");
const upload = multer({ storage: multer.memoryStorage() });

// Audit logging utility function
const logAuditEvent = async (
  action,
  targetTable,
  targetId,
  actorId,
  role,
  metadata = {}
) => {
  try {
    const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
      action,
      target_table: targetTable,
      target_id: targetId,
      actor_id: actorId,
      role: role,
      metadata: metadata,
    });

    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
};

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

// POST /api/legal-articles — add new article (NOW WITH AUTH)
router.post(
  "/",
  authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

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
            created_by: adminId,
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

      // Log audit event for article creation
      await logAuditEvent(
        "Added new article",
        "legal_articles",
        article.id,
        adminId,
        role,
        {
          title_en,
          title_fil,
          category,
          has_image: !!req.file,
          image_path: imagePath,
        }
      );

      if (!process.env.SUPABASE_URL) {
        throw new Error("SUPABASE_URL environment variable is required");
      }
      const getImageUrl = (path) =>
        path
          ? `${
              process.env.SUPABASE_URL
            }/storage/v1/object/public/legal-articles/${encodeURIComponent(
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
  }
);

// PUT /api/legal-articles/:id — update article
router.put(
  "/:id",
  authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin.id;
    const role = req.admin.role || "admin";

    try {
      const { data: currentArticle, error: fetchError } = await supabaseAdmin
        .from("legal_articles")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const {
        title_en,
        title_fil,
        description_en,
        description_fil,
        content_en,
        content_fil,
        category,
        audit_logs,
      } = req.body;

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
          updated_at: new Date().toISOString(),
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

      if (audit_logs) {
        try {
          const logs = JSON.parse(audit_logs);
          for (const log of logs) {
            await logAuditEvent(
              log.action,
              "legal_articles",
              id,
              adminId,
              role,
              {
                article_title: currentArticle.title_en,
                ...log.metadata,
              }
            );
          }
        } catch (parseError) {
          console.error("Error parsing audit logs:", parseError);
        }
      }

      if (!process.env.SUPABASE_URL) {
        throw new Error("SUPABASE_URL environment variable is required");
      }
      const getImageUrl = (path) =>
        path
          ? `${
              process.env.SUPABASE_URL
            }/storage/v1/object/public/legal-articles/${encodeURIComponent(
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

      if (updatedArticle.is_verified) {
        notifyArticleUpdated(
          id,
          updatedArticle.title_en || "Article",
          updatedArticle.title_fil || "Artikulo"
        ).catch((err) => {
          console.error(
            "⚠️ Failed to send update notifications (non-blocking):",
            err
          );
        });
      }

      res.status(200).json({ success: true, data: formattedArticle });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ success: false, message: err.message || "Server error" });
    }
  }
);

// PATCH /api/legal-articles/:id/publish
router.patch("/:id/publish", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { publish } = req.body;
  const adminId = req.admin.id;
  const role = req.admin.role || "admin";

  try {
    const { data: currentArticle, error: fetchError } = await supabaseAdmin
      .from("legal_articles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const updateData = {
      is_verified: publish,
      verified_at: publish ? new Date().toISOString() : null,
      verified_by: publish ? adminId : null,
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

    await logAuditEvent(
      publish
        ? 'Article status changed to "Published"'
        : 'Article status changed to "Unpublished"',
      "legal_articles",
      id,
      adminId,
      role,
      {
        article_title: updatedArticle.title_en,
        previous_status: currentArticle.is_verified
          ? "published"
          : "unpublished",
        new_status: publish ? "published" : "unpublished",
        verified_by: publish ? adminId : null,
        verified_at: publish ? new Date().toISOString() : null,
      }
    );

    if (!process.env.SUPABASE_URL) {
      throw new Error("SUPABASE_URL environment variable is required");
    }
    const getImageUrl = (path) =>
      path
        ? `${
            process.env.SUPABASE_URL
          }/storage/v1/object/public/legal-articles/${encodeURIComponent(path)}`
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

    if (publish) {
      notifyArticlePublished(
        id,
        updatedArticle.title_en || "New Article",
        updatedArticle.title_fil || "Bagong Artikulo"
      ).catch((err) => {
        console.error(
          "⚠️ Failed to send publish notifications (non-blocking):",
          err
        );
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
router.patch("/:id/archive", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin.id;
  const role = req.admin.role || "admin";

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

    await logAuditEvent(
      "Archived Article",
      "legal_articles",
      id,
      adminId,
      role,
      {
        article_title: article.title_en,
        was_published: article.is_verified,
        archived_at: new Date().toISOString(),
      }
    );

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
router.patch("/:id/restore", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin.id;
  const role = req.admin.role || "admin";

  try {
    const { data: currentArticle, error: fetchError } = await supabaseAdmin
      .from("legal_articles")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const { data: restoredArticle, error } = await supabaseAdmin
      .from("legal_articles")
      .update({ deleted_at: null })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent(
      "Article Restored",
      "legal_articles",
      id,
      adminId,
      role,
      {
        article_title: restoredArticle.title_en,
        restored_at: new Date().toISOString(),
        previous_status: currentArticle.is_verified
          ? "published"
          : "unpublished",
      }
    );

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

// Get article audit logs - Real data only
router.get("/:id/audit-logs", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // First verify the article exists
    const { data: article, error: articleError } = await supabaseAdmin
      .from("legal_articles")
      .select("id, title_en, category, created_at")
      .eq("id", id)
      .single();

    if (articleError || !article) {
      return res.status(404).json({
        success: false,
        error: "Article not found",
      });
    }

    // Get all audit logs for this article (removed actor_id filter)
    const { data: auditLogs, error: auditError } = await supabaseAdmin
      .from("admin_audit_logs")
      .select(
        `
        id,
        action,
        target_table,
        actor_id,
        role,
        target_id,
        metadata,
        created_at
      `
      )
      .eq("target_id", id)
      .eq("target_table", "legal_articles")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch audit logs: " + auditError.message,
      });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("target_id", id)
      .eq("target_table", "legal_articles");

    res.json({
      success: true,
      data: auditLogs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Get article audit logs error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get article recent activity - Real data only
router.get("/:id/recent-activity", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify the article exists
    const { data: article, error: articleError } = await supabaseAdmin
      .from("legal_articles")
      .select("id, title_en, category, created_at, updated_at")
      .eq("id", id)
      .single();

    if (articleError || !article) {
      return res.status(404).json({
        success: false,
        error: "Article not found",
      });
    }

    // Get all recent activity for this article
    const { data: recentActivity, error: activityError } = await supabaseAdmin
      .from("admin_audit_logs")
      .select(
        `
        id,
        action,
        target_table,
        actor_id,
        role,
        target_id,
        metadata,
        created_at
      `
      )
      .eq("target_id", id)
      .eq("target_table", "legal_articles")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (activityError) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch recent activity: " + activityError.message,
      });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("target_id", id)
      .eq("target_table", "legal_articles");

    res.json({
      success: true,
      data: recentActivity || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Get article recent activity error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});
module.exports = router;
