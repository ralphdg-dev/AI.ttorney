import React from "react";
import Modal from "../ui/Modal";

const ViewAppealModal = ({ open, onClose, appeal, loading = false }) => {
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
      <Modal open={open} onClose={onClose} title="View Appeal" width="max-w-3xl">
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
      <Modal open={open} onClose={onClose} title="View Appeal" width="max-w-3xl">
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-600">Appeal not found</p>
        </div>
      </Modal>
    );
  }

  const status =
    appeal.status?.charAt(0).toUpperCase() +
    appeal.status?.slice(1).toLowerCase();
  let badgeStyle =
    "bg-yellow-50 border-yellow-200 text-yellow-700"; // default pending

  if (status === "Approved")
    badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-700";
  else if (status === "Rejected")
    badgeStyle = "bg-red-50 border-red-200 text-red-600";

  return (
    <Modal open={open} onClose={onClose} title="Appeal Details" width="max-w-3xl">
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-gray-500">Appeal Reason</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line">
              {displayValue(appeal.appeal_reason)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Additional Context</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line">
              {displayValue(appeal.additional_context)}
            </div>
          </div>
        </div>

        {/* Admin Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-gray-500">Admin Notes</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line">
              {displayValue(appeal.admin_notes)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-gray-500">Rejection Reason</div>
            <div className="text-xs font-medium text-gray-900 whitespace-pre-line">
              {displayValue(appeal.rejection_reason)}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewAppealModal;
