import React from "react";

const PublishModal = ({ open, onClose, article, onConfirm }) => {
  if (!open || !article) return null;

  const action = article.status === "Published" ? "Unpublish" : "Publish";
  const buttonColor =
    article.status === "Published" ? "bg-gray-600 hover:bg-gray-700" : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">{action} Article</h3>
        <p className="text-sm text-gray-700 mb-6">
          Are you sure you want to {action.toLowerCase()} &quot;{article.enTitle}&quot;?
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-[11px] rounded-md bg-gray-200 hover:bg-gray-300 text-gray-900"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-3 py-1.5 text-[11px] rounded-md text-white ${buttonColor}`}
            onClick={onConfirm}
          >
            {action}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
