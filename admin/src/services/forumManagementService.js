const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// Test server connectivity
const testServerConnection = async () => {
  try {
    const response = await fetch("http://localhost:5001/health");
    const data = await response.json();
    console.log("Server health check:", data);
    return true;
  } catch (error) {
    console.error("Server connection test failed:", error);
    return false;
  }
};

class ForumManagementService {
  getAuthHeader() {
    // Try different possible token storage keys
    const token =
      localStorage.getItem("admin_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("authToken");

    console.log("=== AUTH DEBUG ===");
    console.log("Checking localStorage keys:");
    console.log("- admin_token:", !!localStorage.getItem("admin_token"));
    console.log("- token:", !!localStorage.getItem("token"));
    console.log("- access_token:", !!localStorage.getItem("access_token"));
    console.log("- authToken:", !!localStorage.getItem("authToken"));
    console.log("Selected token found:", !!token);
    if (token) {
      console.log("Token length:", token.length);
      console.log("Token preview:", token.substring(0, 20) + "...");
    }

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get all forum posts with filtering and pagination
  async getForumPosts(params = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        search = "",
        category = "all",
        status = "all",
        reported = "all",
        sort_by = "created_at",
        sort_order = "desc",
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
        status,
        reported,
        sort_by,
        sort_order,
      });

      console.log("=== FETCHING FORUM POSTS ===");
      console.log("Query params:", params);
      console.log("URL:", `${API_BASE_URL}/forum/posts?${queryParams}`);

      const response = await fetch(
        `${API_BASE_URL}/forum/posts?${queryParams}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch forum posts");
      }

      console.log("Forum posts response:", {
        success: data.success,
        count: data.data?.length || 0,
        pagination: data.pagination,
        sampleIds: data.data?.slice(0, 3).map(p => ({ id: p.id, content: p.content?.substring(0, 30) })) || []
      });

      // Validate that all returned posts have valid IDs
      if (data.data) {
        const invalidPosts = data.data.filter(post => !post.id);
        if (invalidPosts.length > 0) {
          console.warn("Found posts without IDs:", invalidPosts);
        }
        
        // Log all post IDs for debugging
        console.log("All post IDs returned:", data.data.map(p => p.id));
      }

      return data;
    } catch (error) {
      console.error("Get forum posts error:", error);
      throw error;
    }
  }

  // Get single forum post details
  async getForumPost(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeader(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch forum post");
      }

      return data;
    } catch (error) {
      console.error("Get forum post error:", error);
      throw error;
    }
  }

  // Moderate a forum post (delete, flag, or restore)
  async moderatePost(id, action, reason = "") {
    try {
      console.log("=== MODERATION ATTEMPT ===");
      console.log("Post ID:", id);
      console.log("Action:", action);
      console.log("Reason:", reason);

      // Check if post exists first
      console.log("=== CHECKING POST EXISTENCE ===");
      try {
        const existsCheck = await this.checkPostExists(id);
        console.log("Post existence check result:", existsCheck);
        
        if (!existsCheck.exists) {
          throw new Error(`Post with ID ${id} does not exist in the database. It may have been deleted or the ID is incorrect.`);
        }
      } catch (existsError) {
        console.error("Post existence check failed:", existsError);
        throw new Error(`Unable to verify post existence: ${existsError.message}`);
      }

      const url = `${API_BASE_URL}/forum/posts/${id}/moderate`;
      const headers = {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      };
      const body = { action, reason };

      console.log("=== MODERATION DEBUG ===");
      console.log("URL:", url);
      console.log("Method: PATCH");
      console.log("Headers:", headers);
      console.log("Body:", body);
      console.log("Post ID:", id, "Type:", typeof id);
      console.log("Action:", action);
      console.log("API_BASE_URL:", API_BASE_URL);

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError);
        const textResponse = await response.text();
        console.log("Raw response text:", textResponse);
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }

      if (!response.ok) {
        console.error("Request failed with status:", response.status);
        console.error("Error data:", data);
        throw new Error(data.error || `Failed to ${action} post`);
      }

      console.log("Moderation successful:", data);
      return data;
    } catch (error) {
      console.error(`Moderate post (${action}) error:`, error);
      throw error;
    }
  }

  // Delete a forum post (actually flags it since there's no soft delete)
  async deletePost(id, reason = "") {
    return this.moderatePost(id, "flag", reason);
  }

  // Flag a forum post
  async flagPost(id, reason = "") {
    return this.moderatePost(id, "flag", reason);
  }

  // Restore a forum post
  async restorePost(id, reason = "") {
    return this.moderatePost(id, "restore", reason);
  }

  // Get all reported replies
  async getReportedReplies(params = {}) {
    try {
      // First test server connectivity
      console.log("Testing server connectivity...");
      const serverOnline = await testServerConnection();
      if (!serverOnline) {
        throw new Error(
          "Server is not running or not accessible at http://localhost:5001"
        );
      }

      const {
        page = 1,
        limit = 50,
        status = "all",
        category = "all",
        sort_by = "created_at",
        sort_order = "desc",
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status,
        category,
        sort_by,
        sort_order,
      });

      const url = `${API_BASE_URL}/forum/reported-replies?${queryParams}`;
      const headers = {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      };

      console.log("API_BASE_URL:", API_BASE_URL);
      console.log("Fetching reported replies from:", url);
      console.log("Request headers:", headers);

      let response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers,
        });
        console.log("Fetch completed successfully");
      } catch (fetchError) {
        console.error("Fetch failed:", fetchError);
        throw new Error(
          `Network error: ${fetchError.message}. Check if server is running on ${API_BASE_URL}`
        );
      }

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `HTTP ${response.status}: Failed to fetch reported replies`
        );
      }

      return data;
    } catch (error) {
      console.error("Get reported replies error:", error);
      throw error;
    }
  }

  // Get all reported posts
  async getReportedPosts(params = {}) {
    try {
      // First test server connectivity
      console.log("Testing server connectivity...");
      const serverOnline = await testServerConnection();
      if (!serverOnline) {
        throw new Error(
          "Server is not running or not accessible at http://localhost:5001"
        );
      }

      const {
        page = 1,
        limit = 50,
        status = "all",
        category = "all",
        sort_by = "created_at",
        sort_order = "desc",
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status,
        category,
        sort_by,
        sort_order,
      });

      const url = `${API_BASE_URL}/forum/reported-posts?${queryParams}`;
      const headers = {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      };

      console.log("API_BASE_URL:", API_BASE_URL);
      console.log("Fetching reported posts from:", url);
      console.log("Request headers:", headers);

      let response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers,
        });
        console.log("Fetch completed successfully");
      } catch (fetchError) {
        console.error("Fetch failed:", fetchError);
        throw new Error(
          `Network error: ${fetchError.message}. Check if server is running on ${API_BASE_URL}`
        );
      }

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `HTTP ${response.status}: Failed to fetch reported posts`
        );
      }

      return data;
    } catch (error) {
      console.error("Get reported posts error:", error);
      throw error;
    }
  }

  async resolveReport(id, action) {
    // ✅ REMOVED: resolution_notes
    try {
      const response = await fetch(
        `${API_BASE_URL}/forum/reports/${id}/resolve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
          },
          // ✅ REMOVED: resolution_notes from body
          body: JSON.stringify({ action }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resolve report");
      }

      return data;
    } catch (error) {
      console.error("Resolve report error:", error);
      throw error;
    }
  }

  async resolveReplyReport(id, action) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/forum/reply-reports/${id}/resolve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
          },
          body: JSON.stringify({ action }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resolve reply report");
      }

      return data;
    } catch (error) {
      console.error("Resolve reply report error:", error);
      throw error;
    }
  }

  // Dismiss a report
  async dismissReport(id, notes = "") {
    // ✅ REMOVED: notes parameter is no longer passed
    return this.resolveReport(id, "dismiss");
  }

  // Mark report as action taken
  async markReportActionTaken(id, notes = "") {
    // ✅ REMOVED: notes parameter is no longer passed
    return this.resolveReport(id, "sanctioned");
  }
  // Get forum statistics
  async getForumStatistics() {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/statistics`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeader(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch forum statistics");
      }

      return data;
    } catch (error) {
      console.error("Get forum statistics error:", error);
      throw error;
    }
  }

  // Check if a specific post exists in the database
  async checkPostExists(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts/${id}/exists`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeader(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check post existence");
      }

      return data;
    } catch (error) {
      console.error("Check post exists error:", error);
      throw error;
    }
  }

  // Debug reported posts data mismatch
  async debugReportedPosts() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/forum/reported-posts/debug`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeader(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to debug reported posts");
      }

      return data;
    } catch (error) {
      console.error("Debug reported posts error:", error);
      throw error;
    }
  }

  // Utility methods for formatting
  formatPostContent(content, maxLength = 100) {
    if (!content) return "No content";
    return content.length > maxLength
      ? content.substring(0, maxLength) + "..."
      : content;
  }

  formatUserDisplay(user, isAnonymous = false) {
    if (isAnonymous || !user) {
      return "Anonymous User";
    }
    return user.full_name || user.username || user.email || "Unknown User";
  }

  getCategoryDisplayName(categoryId) {
    const categories = {
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
    };
    return categories[categoryId] || categoryId;
  }

  getReportCategoryDisplayName(category) {
    const categories = {
      spam: "Spam",
      harassment: "Harassment",
      hate_speech: "Hate Speech",
      misinformation: "Misinformation",
      inappropriate: "Inappropriate Content",
      other: "Other",
    };
    return categories[category] || category;
  }

  getStatusBadgeColor(status) {
    const colors = {
      active: "bg-green-100 text-green-800",
      deleted: "bg-red-100 text-red-800",
      flagged: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
      resolved: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  }
}

export default new ForumManagementService();
