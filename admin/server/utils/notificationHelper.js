const { supabaseAdmin } = require("../config/supabase");

/**
 * Notification Helper for Admin Web App
 * Sends notifications to mobile app users when admins publish/update content
 * 
 * IMPORTANT: Notifications appear in the MOBILE APP, not the admin web app
 */

/**
 * Send notification to all registered users about new article
 * @param {string} articleId - Article ID
 * @param {string} titleEn - Article title in English
 * @param {string} titleFil - Article title in Filipino
 */
async function notifyArticlePublished(articleId, titleEn, titleFil) {
  try {
    console.log(`📬 Sending article published notifications for: ${titleEn}`);

    // Get first 100 registered users (FAANG pattern: don't spam everyone)
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "registered_user")
      .limit(100);

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      return { success: false, error: usersError.message };
    }

    if (!users || users.length === 0) {
      console.log("⚠️ No users found to notify");
      return { success: true, notified: 0 };
    }

    // Create notifications for all users
    const notifications = users.map((user) => ({
      user_id: user.id,
      type: "article_published",
      title: "New Legal Article Published",
      message: `Check out: ${titleEn.substring(0, 80)}${titleEn.length > 80 ? "..." : ""}`,
      data: {
        article_id: articleId,
        title_en: titleEn,
        title_fil: titleFil,
      },
      read: false,
    }));

    // Batch insert notifications
    const { data: insertedNotifications, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications)
      .select("id");

    if (insertError) {
      console.error("❌ Error inserting notifications:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`✅ Sent article published notifications to ${users.length} users`);
    return { 
      success: true, 
      notified: users.length,
      notificationIds: insertedNotifications?.map(n => n.id) || []
    };
  } catch (error) {
    console.error("❌ Failed to send article published notifications:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to users who bookmarked the article about updates
 * @param {string} articleId - Article ID
 * @param {string} titleEn - Article title in English
 * @param {string} titleFil - Article title in Filipino
 */
async function notifyArticleUpdated(articleId, titleEn, titleFil) {
  try {
    console.log(`📬 Sending article updated notifications for: ${titleEn}`);

    // Get users who bookmarked this article
    const { data: bookmarks, error: bookmarksError } = await supabaseAdmin
      .from("user_guide_bookmarks")
      .select("user_id")
      .eq("guide_id", articleId);

    if (bookmarksError) {
      console.error("❌ Error fetching bookmarks:", bookmarksError);
      return { success: false, error: bookmarksError.message };
    }

    if (!bookmarks || bookmarks.length === 0) {
      console.log("⚠️ No users have bookmarked this article");
      return { success: true, notified: 0 };
    }

    // Get unique user IDs
    const userIds = [...new Set(bookmarks.map((b) => b.user_id))];

    // Create notifications for users who bookmarked
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: "article_updated",
      title: "Bookmarked Article Updated",
      message: `Updated: ${titleEn.substring(0, 80)}${titleEn.length > 80 ? "..." : ""}`,
      data: {
        article_id: articleId,
        title_en: titleEn,
        title_fil: titleFil,
      },
      read: false,
    }));

    // Batch insert notifications
    const { data: insertedNotifications, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications)
      .select("id");

    if (insertError) {
      console.error("❌ Error inserting notifications:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`✅ Sent article updated notifications to ${userIds.length} users`);
    return { 
      success: true, 
      notified: userIds.length,
      notificationIds: insertedNotifications?.map(n => n.id) || []
    };
  } catch (error) {
    console.error("❌ Failed to send article updated notifications:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to all registered users about new guide
 * @param {string} guideId - Guide ID
 * @param {string} titleEn - Guide title in English
 * @param {string} titleFil - Guide title in Filipino
 */
async function notifyGuidePublished(guideId, titleEn, titleFil) {
  try {
    console.log(`📬 Sending guide published notifications for: ${titleEn}`);

    // Get first 100 registered users
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "registered_user")
      .limit(100);

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      return { success: false, error: usersError.message };
    }

    if (!users || users.length === 0) {
      console.log("⚠️ No users found to notify");
      return { success: true, notified: 0 };
    }

    // Create notifications for all users
    const notifications = users.map((user) => ({
      user_id: user.id,
      type: "guide_published",
      title: "New Legal Guide Published",
      message: `Check out: ${titleEn.substring(0, 80)}${titleEn.length > 80 ? "..." : ""}`,
      data: {
        guide_id: guideId,
        title_en: titleEn,
        title_fil: titleFil,
      },
      read: false,
    }));

    // Batch insert notifications
    const { data: insertedNotifications, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications)
      .select("id");

    if (insertError) {
      console.error("❌ Error inserting notifications:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`✅ Sent guide published notifications to ${users.length} users`);
    return { 
      success: true, 
      notified: users.length,
      notificationIds: insertedNotifications?.map(n => n.id) || []
    };
  } catch (error) {
    console.error("❌ Failed to send guide published notifications:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to users who bookmarked the guide about updates
 * @param {string} guideId - Guide ID
 * @param {string} titleEn - Guide title in English
 * @param {string} titleFil - Guide title in Filipino
 */
async function notifyGuideUpdated(guideId, titleEn, titleFil) {
  try {
    console.log(`📬 Sending guide updated notifications for: ${titleEn}`);

    // Get users who bookmarked this guide
    const { data: bookmarks, error: bookmarksError } = await supabaseAdmin
      .from("user_guide_bookmarks")
      .select("user_id")
      .eq("guide_id", guideId);

    if (bookmarksError) {
      console.error("❌ Error fetching bookmarks:", bookmarksError);
      return { success: false, error: bookmarksError.message };
    }

    if (!bookmarks || bookmarks.length === 0) {
      console.log("⚠️ No users have bookmarked this guide");
      return { success: true, notified: 0 };
    }

    // Get unique user IDs
    const userIds = [...new Set(bookmarks.map((b) => b.user_id))];

    // Create notifications for users who bookmarked
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: "guide_updated",
      title: "Bookmarked Guide Updated",
      message: `Updated: ${titleEn.substring(0, 80)}${titleEn.length > 80 ? "..." : ""}`,
      data: {
        guide_id: guideId,
        title_en: titleEn,
        title_fil: titleFil,
      },
      read: false,
    }));

    // Batch insert notifications
    const { data: insertedNotifications, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(notifications)
      .select("id");

    if (insertError) {
      console.error("❌ Error inserting notifications:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`✅ Sent guide updated notifications to ${userIds.length} users`);
    return { 
      success: true, 
      notified: userIds.length,
      notificationIds: insertedNotifications?.map(n => n.id) || []
    };
  } catch (error) {
    console.error("❌ Failed to send guide updated notifications:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  notifyArticlePublished,
  notifyArticleUpdated,
  notifyGuidePublished,
  notifyGuideUpdated,
};
