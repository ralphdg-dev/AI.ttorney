const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// Enhanced service functions for glossaryTermsService.js

const createAuditLog = async (termId, action, metadata = {}) => {
  try {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(
      `${API_BASE_URL}/glossary-terms/audit-log`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          target_id: termId,
          metadata,
        }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

const logViewAction = async (termId) => {
  try {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(
      `http://localhost:5001/api/glossary-terms/${termId}/view`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

const getTermAuditLogs = async (termId, page = 1, limit = 50) => {
  try {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(
      `http://localhost:5001/api/glossary-terms/${termId}/audit-logs?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

const getTermRecentActivity = async (termId, page = 1, limit = 50) => {
  try {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(
      `http://localhost:5001/api/glossary-terms/${termId}/recent-activity?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

// Export the enhanced functions
export {
  createAuditLog,
  logViewAction,
  getTermAuditLogs,
  getTermRecentActivity,
};

const glossaryTermsService = {
  getAuthHeader() {
    const token = localStorage.getItem("admin_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Get all glossary terms with filtering and pagination
  async getGlossaryTerms(params = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        search = "",
        category = "all",
        status = "all",
      } = params;

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        category,
        status,
      });

      const response = await fetch(
        `${API_BASE_URL}/glossary-terms?${queryParams}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...glossaryTermsService.getAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get single glossary term by ID
  async getGlossaryTerm(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/glossary-terms/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...glossaryTermsService.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Create new glossary term
  async createGlossaryTerm(termData) {
    try {
      const response = await fetch(`${API_BASE_URL}/glossary-terms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...glossaryTermsService.getAuthHeader(),
        },
        body: JSON.stringify(termData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Bulk create glossary terms from CSV
  async bulkCreateGlossaryTerms(termsArray) {
    try {
      const response = await fetch(`${API_BASE_URL}/glossary-terms/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...glossaryTermsService.getAuthHeader(),
        },
        body: JSON.stringify({ terms: termsArray }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Update glossary term
  async updateGlossaryTerm(id, termData) {
    try {
      const response = await fetch(`${API_BASE_URL}/glossary-terms/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...glossaryTermsService.getAuthHeader(),
        },
        body: JSON.stringify(termData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Delete glossary term
  async deleteGlossaryTerm(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/glossary-terms/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...glossaryTermsService.getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Archive glossary term (soft delete)
  async archiveGlossaryTerm(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/glossary-terms/${id}/archive`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...glossaryTermsService.getAuthHeader(),
        },
      });

      if (!response.ok) {
        // If archive route is not available, fallback to DELETE
        if (response.status === 404 || response.status === 405) {
          const delResp = await fetch(`${API_BASE_URL}/glossary-terms/${id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...glossaryTermsService.getAuthHeader(),
            },
          });
          if (!delResp.ok) {
            const delErr = await delResp.json().catch(() => ({}));
            throw new Error(delErr.error || `HTTP error! status: ${delResp.status}`);
          }
          return await delResp.json();
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Restore archived glossary term
  async restoreGlossaryTerm(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/glossary-terms/${id}/restore`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...glossaryTermsService.getAuthHeader(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Create audit log entry for glossary term actions
  async createAuditLog(termId, action, metadata = {}) {
    try {
      const auditData = {
        target_table: "glossary_terms",
        target_id: termId,
        action: action,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      const response = await fetch(
        `${API_BASE_URL}/glossary-terms/${termId}/audit-logs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...glossaryTermsService.getAuthHeader(),
          },
          body: JSON.stringify(auditData),
        }
      );

      if (!response.ok) {
        // Don't throw error for audit logging failures, just log them
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  },
};

export default glossaryTermsService;
