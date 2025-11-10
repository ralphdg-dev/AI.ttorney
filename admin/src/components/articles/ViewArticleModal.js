import React, { useState, useEffect, useContext } from "react";
import Modal from "../ui/Modal";
import Tooltip from "../ui/Tooltip";
import {
  X,
  Download,
  History,
  Activity,
  ChevronUp,
  ChevronDown,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  exportArticleAuditTrailPDF,
  exportArticleActivityPDF,
} from "./ArticlePDFExportUtils";

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case "published":
        return "bg-green-100 text-green-800 border border-green-200";
      case "unpublished":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      case "archived":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getDisplayStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "published":
        return "Published";
      case "unpublished":
        return "Unpublished";
      case "archived":
        return "Archived";
      default:
        return "Unpublished";
    }
  };

  const styles = getStatusStyles(status);
  const displayStatus = getDisplayStatus(status);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${styles}`}
    >
      {displayStatus}
    </span>
  );
};

const CategoryBadge = ({ category }) => {
  const getCategoryStyles = (category) => {
    switch ((category || "").toLowerCase()) {
      case "family":
        return "bg-red-50 border-red-200 text-rose-700";
      case "civil":
        return "bg-violet-50 border-violet-200 text-violet-700";
      case "criminal":
        return "bg-red-50 border-red-200 text-red-600";
      case "labor":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "consumer":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  const styles = getCategoryStyles(category);
  const displayCategory = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "Uncategorized";

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium ${styles}`}
    >
      {displayCategory}
    </span>
  );
};

const ViewArticleModal = ({ open, onClose, article }) => {
  const [activeTab, setActiveTab] = useState("audit");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const { admin: currentAdmin } = useAuth();

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    if (open && article?.id) {
      loadAuditLogs();
      loadRecentActivity();
    }
  }, [open, article?.id]);

  if (!article) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);

      const response = await fetch(
        `http://localhost:5001/api/legal-articles/${article.id}/audit-logs`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }

      const json = await response.json();

      if (json.success) {
        setAuditLogs(json.data || []);
      } else {
        throw new Error(json.message || "Failed to load audit logs");
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      setAuditError(error.message);
      setAuditLogs([
        {
          id: 1,
          action: "Article created",
          actor_name: "System",
          role: "system",
          created_at: article.createdAt,
          metadata: { action: "Legal article created" },
        },
      ]);
    } finally {
      setAuditLoading(false);
    }
  };

  const auditTrail = auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    admin: log.actor_name || "Unknown Admin",
    role: log.role || "Admin",
    date: log.created_at,
    details: (() => {
      try {
        const metadata =
          typeof log.metadata === "string"
            ? JSON.parse(log.metadata)
            : log.metadata;
        return metadata?.action || log.action;
      } catch {
        return log.action;
      }
    })(),
  }));

  const loadRecentActivity = async () => {
    try {
      setActivityLoading(true);
      setActivityError(null);

      const response = await fetch(
        `http://localhost:5001/api/legal-articles/${article.id}/recent-activity`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }

      const json = await response.json();

      if (json.success) {
        setRecentActivity(json.data || []);
      } else {
        throw new Error(json.message || "Failed to load recent activity");
      }
    } catch (error) {
      console.error("Failed to load recent activity:", error);
      setActivityError(error.message);
      setRecentActivity([
        {
          id: 1,
          action: "Article viewed",
          target_table: "legal_articles",
          created_at: new Date().toISOString(),
          metadata: { action_type: "view" },
        },
      ]);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleExportAuditTrail = async () => {
    try {
      await exportArticleAuditTrailPDF(
        auditLogs,
        article.enTitle,
        article.category,
        currentAdmin,
        article.id
      );
      console.log("Article audit trail PDF exported and logged successfully");

      setTimeout(() => {
        loadAuditLogs();
        loadRecentActivity();
      }, 1000);
    } catch (error) {
      console.error("Failed to export audit trail PDF:", error);
      alert("Failed to export audit trail PDF. Please try again.");
    }
  };

  const handleExportActivity = async () => {
    try {
      const activityData = recentActivity.map((activity) => ({
        action: activity.action,
        date: activity.created_at,
        details: activity.metadata?.action_type || activity.action,
      }));

      await exportArticleActivityPDF(
        activityData,
        article.enTitle,
        article.category,
        currentAdmin,
        article.id
      );
      console.log("Article activity PDF exported and logged successfully");

      setTimeout(() => {
        loadAuditLogs();
        loadRecentActivity();
      }, 1000);
    } catch (error) {
      console.error("Failed to export activity PDF:", error);
      alert("Failed to export activity PDF. Please try again.");
    }
  };

  const handleViewActivity = (activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setSelectedActivity(null);
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="Article Details"
      width="max-w-4xl"
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Article Basic Info - Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                English Title
              </label>
              <div className="text-xs text-gray-900">
                {article.enTitle || "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Filipino Title
              </label>
              <div className="text-xs text-gray-900">
                {article.filTitle || "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Created Date
              </label>
              <div className="text-xs text-gray-900">
                {formatDate(article.createdAt)}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Category
              </label>
              <div>
                <CategoryBadge category={article.category} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                English Description
              </label>
              <div className="text-xs text-gray-900 line-clamp-3">
                {article.enDescription || "No description"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Status
              </label>
              <div>
                <StatusBadge status={article.status} />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Last Updated
              </label>
              <div className="text-xs text-gray-900">
                {article.updatedAt
                  ? formatDate(article.updatedAt)
                  : article.createdAt
                  ? formatDate(article.createdAt)
                  : "Never"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Published Date
              </label>
              <div className="text-xs text-gray-900">
                {article.verifiedAt
                  ? formatDate(article.verifiedAt)
                  : "Not published"}
              </div>
            </div>
          </div>
        </div>

        {/* Article History & Audit Trail Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity Column */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-gray-600" />
                  <h4 className="text-xs font-medium text-gray-900">
                    Recent Activity
                  </h4>
                  <span className="text-[10px] text-gray-500">
                    ({recentActivity.length} entries)
                  </span>
                </div>
                <Tooltip content="Download as PDF">
                  <button
                    onClick={handleExportActivity}
                    disabled={!recentActivity || recentActivity.length === 0}
                    className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={14} />
                  </button>
                </Tooltip>
              </div>

              {activityLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-1 animate-spin" />
                  <p className="text-[10px] text-gray-500">
                    Loading recent activity...
                  </p>
                </div>
              ) : activityError ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-1" />
                  <p className="text-[10px] text-red-500 mb-2">
                    {activityError}
                  </p>
                  <button
                    onClick={loadRecentActivity}
                    className="text-[9px] text-blue-600 hover:text-blue-800 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <div className="max-h-32 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                          <th className="px-2 py-1.5 text-right text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentActivity.map((activity) => (
                          <tr key={activity.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5">
                              <div className="text-[9px] font-medium text-gray-900">
                                {activity.action}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                              {formatDate(activity.created_at)}
                            </td>
                            <td className="px-2 py-1.5 max-w-32">
                              <div
                                className="text-[9px] text-gray-700 truncate"
                                title={
                                  activity.metadata?.action_type ||
                                  activity.action ||
                                  "-"
                                }
                              >
                                {activity.metadata?.action_type ||
                                  activity.action ||
                                  "-"}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <Tooltip content="View Details">
                                <button
                                  onClick={() => handleViewActivity(activity)}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                                >
                                  <Eye size={12} />
                                </button>
                              </Tooltip>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">
                    No recent activity found
                  </p>
                </div>
              )}
            </div>

            {/* Audit Trail Column */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <History className="h-3 w-3 text-gray-600" />
                  <h4 className="text-xs font-medium text-gray-900">
                    Audit Trail
                  </h4>
                  <span className="text-[10px] text-gray-500">
                    ({auditTrail.length} entries)
                  </span>
                </div>
                <Tooltip content="Download as PDF">
                  <button
                    onClick={handleExportAuditTrail}
                    disabled={
                      auditLoading || !auditTrail || auditTrail.length === 0
                    }
                    className="p-1.5 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {auditLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                  </button>
                </Tooltip>
              </div>

              {auditLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="h-6 w-6 text-gray-400 mx-auto mb-1 animate-spin" />
                  <p className="text-[10px] text-gray-500">
                    Loading audit trail...
                  </p>
                </div>
              ) : auditError ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-1" />
                  <p className="text-[10px] text-red-500 mb-2">{auditError}</p>
                  <button
                    onClick={loadAuditLogs}
                    className="text-[9px] text-blue-600 hover:text-blue-800 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : auditTrail.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <div className="max-h-32 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                          </th>
                          <th className="px-2 py-1.5 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {auditTrail.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5">
                              <div className="text-[9px] font-medium text-gray-900">
                                {log.action}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-[9px]">
                                <div className="font-medium text-gray-900">
                                  {log.admin || "Unknown Admin"}
                                </div>
                                <div className="text-gray-500 capitalize">
                                  {log.role || "Admin"}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                              {formatDate(log.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <History className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-500">
                    No audit trail found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#023D7B]"
          >
            Close
          </button>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {showActivityModal && selectedActivity && (
        <Modal
          open={showActivityModal}
          onClose={handleCloseActivityModal}
          title="Activity Details"
          width="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  {selectedActivity.action}
                </h3>
                <span className="text-xs text-gray-500">
                  {formatDate(selectedActivity.created_at)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Action Type
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedActivity.action}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatDate(selectedActivity.created_at)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Details
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md min-h-[60px]">
                  {selectedActivity.metadata?.action_type ||
                    selectedActivity.action ||
                    "No additional details available"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Article Information
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between">
                    <span>{article.enTitle}</span>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={article.category} />
                      <StatusBadge status={article.status} />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {article.category} • Created:{" "}
                    {formatDate(article.createdAt)}
                  </div>
                </div>
              </div>

              {selectedActivity.id && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Activity ID
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md font-mono">
                    {selectedActivity.id}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleCloseActivityModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};

export default ViewArticleModal;
