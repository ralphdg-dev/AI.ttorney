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
  exportTermAuditTrailPDF,
  exportTermActivityPDF,
} from "./TermPDFExportUtils";

const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case "verified":
        return "bg-green-100 text-green-800 border border-green-200";
      case "unverified":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getDisplayStatus = (status) => {
    if (status === null || status === undefined) return "Pending";
    return status ? "Verified" : "Unverified";
  };

  const styles = getStatusStyles(getDisplayStatus(status));
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

const ViewTermModal = ({ open, onClose, term }) => {
  const [activeTab, setActiveTab] = useState("audit");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
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
    if (open && term?.id) {
      loadAuditLogs();
    }
  }, [open, term?.id]);

  if (!term) return null;

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
        `${process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api'}/glossary-terms/${term.id}/audit-logs`,
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
          action: "Term created",
          actor_name: "System",
          role: "system",
          created_at: term.created_at,
          metadata: { action: "Glossary term created" },
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

  // Removed recent activity loader

  const handleExportAuditTrail = async () => {
    try {
      await exportTermAuditTrailPDF(
        auditLogs,
        term.term_en,
        term.category,
        currentAdmin,
        term.id
      );

      setTimeout(() => {
        loadAuditLogs();
      }, 1000);
    } catch (error) {
      console.error("Failed to export audit trail PDF:", error);
      alert("Failed to export audit trail PDF. Please try again.");
    }
  };

  // Removed export activity handler

  // Removed activity view modal handlers

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="Term Details"
      width="max-w-4xl"
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Term Basic Info - Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                English Term
              </label>
              <div className="text-xs text-gray-900">
                {term.term_en || "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Filipino Term
              </label>
              <div className="text-xs text-gray-900">
                {term.term_fil || "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Created Date
              </label>
              <div className="text-xs text-gray-900">
                {formatDate(term.created_at)}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Category
              </label>
              <div>
                <CategoryBadge category={term.category} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                English Definition
              </label>
              <div className="text-xs text-gray-900 line-clamp-3">
                {term.definition_en || "No definition"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Status
              </label>
              <div>
                <StatusBadge status={term.is_verified} />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Last Updated
              </label>
              <div className="text-xs text-gray-900">
                {term.updated_at
                  ? formatDate(term.updated_at)
                  : term.created_at
                  ? formatDate(term.created_at)
                  : "Never"}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-medium text-gray-700 mb-1">
                Verified By
              </label>
              <div className="text-xs text-gray-900">
                {term.verified_by || "Not verified"}
              </div>
            </div>
          </div>
        </div>

        {/* Term History & Audit Trail Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Audit Trail */}
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

      {/* Removed Activity Detail Modal */}
    </Modal>
  );
};

export default ViewTermModal;
