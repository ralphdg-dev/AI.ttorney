import React from "react";
import Modal from "../ui/Modal";
import Tooltip from "../ui/Tooltip";
import {
  Download,
  History,
  Eye,
  AlertCircle,
  Loader2,
} from "lucide-react";

const ViewAppealModal = ({
  open,
  onClose,
  appeal,
  loading = false,
  auditLogs = [],
  auditLoading = false,
  auditError = null,
  recentActivity = [],
  activityLoading = false,
  activityError = null,
}) => {
  const displayValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    return value;
  };

  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const options = { month: "short", day: "numeric", year: "numeric" };
    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }
    return date.toLocaleDateString("en-US", options);
  };

  if (loading) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="View Appeal"
        width="max-w-4xl"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading appeal details...</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (!appeal) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="View Appeal"
        width="max-w-4xl"
      >
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-600">Appeal not found</p>
        </div>
      </Modal>
    );
  }

  const status =
    appeal.status?.charAt(0).toUpperCase() +
    appeal.status?.slice(1).toLowerCase();
  let badgeStyle = "bg-yellow-50 border-yellow-200 text-yellow-700"; // default pending

  if (status === "Approved")
    badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-700";
  else if (status === "Rejected")
    badgeStyle = "bg-red-50 border-red-200 text-red-600";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Appeal Details"
      width="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[9px] text-gray-500">User Name</div>
            <div className="text-xs font-medium text-gray-900">
              {displayValue(appeal.user_full_name)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Suspension ID</div>
            <div className="text-xs font-medium text-gray-900">
              {displayValue(appeal.suspension_id)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Status</div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeStyle}`}
            >
              {status}
            </span>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Suspension Reason</div>
            <div className="text-xs font-medium text-gray-900">
              {displayValue(appeal.suspension_reason)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Reviewed By</div>
            <div className="text-xs font-medium text-gray-900">
              {displayValue(appeal.reviewed_by)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Reviewed At</div>
            <div className="text-xs font-medium text-gray-900">
              {formatDate(appeal.reviewed_at)}
            </div>
          </div>
        </div>

        {/* Appeal Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] text-gray-500">Appeal Reason</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line bg-gray-50 p-2 rounded border min-h-[60px]">
              {displayValue(appeal.appeal_reason)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Additional Context</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line bg-gray-50 p-2 rounded border min-h-[60px]">
              {displayValue(appeal.additional_context)}
            </div>
          </div>
        </div>

        {/* Admin Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] text-gray-500">Admin Notes</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line bg-gray-50 p-2 rounded border min-h-[60px]">
              {displayValue(appeal.admin_notes)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Rejection Reason</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line bg-gray-50 p-2 rounded border min-h-[60px]">
              {displayValue(appeal.rejection_reason)}
            </div>
          </div>
        </div>

        {/* Appeal History & Audit Trail Section */}
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
                    ({auditLogs.length} entries)
                  </span>
                </div>
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
                </div>
              ) : auditLogs.length > 0 ? (
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
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5">
                              <div className="text-[9px] font-medium text-gray-900">
                                {log.action}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <div className="text-[9px]">
                                <div className="font-medium text-gray-900">
                                  {log.metadata?.admin_name || "Unknown Admin"}
                                </div>
                                <div className="text-gray-500 capitalize">
                                  {log.metadata?.admin_role || "Admin"}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-[9px] text-gray-500">
                              {formatDate(log.created_at)}
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
    </Modal>
  );
};

export default ViewAppealModal;
