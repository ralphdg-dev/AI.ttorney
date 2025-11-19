import React, { useState } from "react";
import Modal from "../ui/Modal";

const ActionAppealModal = ({
  open,
  onClose,
  type,
  appeal,
  onSubmit,
  loading,
}) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const validateFields = () => {
    const newErrors = {};

    if (!adminNotes.trim()) {
      newErrors.adminNotes = "Admin Notes are required.";
    }

    if (type === "rejected" && !rejectionReason.trim()) {
      newErrors.rejectionReason = "Rejection Reason is required for rejection.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePrimaryConfirm = () => {
    if (!validateFields()) return;
    setConfirmOpen(true);
  };

  const handleFinalConfirm = () => {
    const payload = {
      admin_notes: adminNotes,
    };
    if (type === "rejected") payload.rejection_reason = rejectionReason;

    onSubmit(payload);
    setConfirmOpen(false);
  };

  return (
    <>
      {/* ========== Main Action Modal (Collect Notes/Reasons) ========== */}
      <Modal
        open={open}
        onClose={onClose}
        title={`${type === "approved" ? "Approve" : "Reject"} Appeal`}
        width="max-w-md"
      >
        <div className="space-y-4">
          {/* Admin Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Admin Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => {
                setAdminNotes(e.target.value);
                setErrors((prev) => ({ ...prev, adminNotes: "" }));
              }}
              rows={3}
              className={`w-full border rounded-md p-2 text-sm focus:ring-[#023D7B] focus:border-[#023D7B] ${
                errors.adminNotes ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your admin notes..."
            />
            {errors.adminNotes && (
              <p className="mt-1 text-[11px] text-red-500">
                {errors.adminNotes}
              </p>
            )}
          </div>

          {/* Rejection Reason (only if reject) */}
          {type === "rejected" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setErrors((prev) => ({ ...prev, rejectionReason: "" }));
                }}
                rows={2}
                className={`w-full border rounded-md p-2 text-sm focus:ring-[#023D7B] focus:border-[#023D7B] ${
                  errors.rejectionReason ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter rejection reason..."
              />
              {errors.rejectionReason && (
                <p className="mt-1 text-[11px] text-red-500">
                  {errors.rejectionReason}
                </p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={handlePrimaryConfirm}
              className={`px-3 py-1.5 text-xs rounded-md text-white ${
                type === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading
                ? "Processing..."
                : type === "approved"
                ? "Approve"
                : "Reject"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== Confirmation Modal (Irreversible Action) ========== */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Action"
        width="max-w-sm"
      >
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Are you sure you want to{" "}
            <span
              className={`font-semibold ${
                type === "approved" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {type === "approved" ? "approve" : "reject"}
            </span>{" "}
            this appeal?
          </p>
          <p className="text-xs text-gray-500">
            This action is <strong>irreversible</strong>. Please confirm to
            proceed.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-3 py-1.5 text-xs border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={handleFinalConfirm}
              className={`px-3 py-1.5 text-xs rounded-md text-white ${
                type === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Saving..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ActionAppealModal;
