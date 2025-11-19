import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import Modal from "../ui/Modal";

const SuccessModal = ({ open, onClose, message, type = "success" }) => {
  const isSuccess = type === "success";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isSuccess ? "Action Successful" : "Action Failed"}
      width="max-w-sm"
    >
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        {/* Icon */}
        {isSuccess ? (
          <CheckCircle className="text-emerald-600 w-10 h-10" />
        ) : (
          <XCircle className="text-red-600 w-10 h-10" />
        )}

        {/* Message */}
        <p className="text-sm text-gray-700">{message}</p>
      </div>
    </Modal>
  );
};

export default SuccessModal;
