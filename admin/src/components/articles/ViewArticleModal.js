import React from "react";
import Modal from "../ui/Modal";
import { CheckCircle, XCircle, Calendar, UserCheck } from "lucide-react";

const ViewArticleModal = ({ open, onClose, article }) => {
  const formatCategory = (category) =>
    category ? category.charAt(0).toUpperCase() + category.slice(1) : "N/A";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!article) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="View Legal Article"
        width="max-w-3xl"
      >
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-600">Article not found</p>
        </div>
      </Modal>
    );
  }

  const renderScrollableField = (label, content) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-900 whitespace-pre-line max-h-40 overflow-y-auto">
        {content || "N/A"}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="View Legal Article"
      width="max-w-5xl"
    >
      {/* Modal body scrollable */}
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Category
          </label>
          <div className="px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-900">
            {formatCategory(article.category)}
          </div>
        </div>

        {/* Titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {renderScrollableField("English Title", article.enTitle)}
          {renderScrollableField("Filipino Title", article.filTitle)}
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {renderScrollableField("English Description", article.enDescription)}
          {renderScrollableField(
            "Filipino Description",
            article.filDescription
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {renderScrollableField("English Content", article.enContent)}
          {renderScrollableField("Filipino Content", article.filContent)}
        </div>

        {/* Image */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Image
          </label>
          {article.image ? (
            <div className="max-h-60 overflow-y-auto border rounded-md">
              <img
                src={article.image}
                alt="Article"
                className="w-full object-cover rounded-md"
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = "block";
                  }
                }}
              />
              <div
                className="px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-500 italic hidden text-center"
                style={{ display: "none" }}
              >
                Image failed to load
              </div>
            </div>
          ) : (
            <div className="px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-500 italic">
              No image provided
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Publication Status
          </label>
          <div className="flex items-center gap-2">
            {article.status === "Published" ? (
              <>
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Published
                </span>
              </>
            ) : (
              <>
                <XCircle size={16} className="text-gray-500" />
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                  Unpublished
                </span>
              </>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Created At
            </label>
            <div className="flex items-center gap-1 px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-900">
              <Calendar size={12} className="text-gray-500" />
              {formatDate(article.createdAt)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Updated At
            </label>
            <div className="flex items-center gap-1 px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-900">
              <Calendar size={12} className="text-gray-500" />
              {formatDate(article.updatedAt)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Verified By
            </label>
            <div className="flex items-center gap-1 px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-900">
              <UserCheck size={12} className="text-gray-500" />
              {article.verifiedBy || "Not yet verified"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Verified At
            </label>
            <div className="flex items-center gap-1 px-2 py-1.5 border rounded-md bg-gray-50 text-xs text-gray-900">
              <Calendar size={12} className="text-gray-500" />
              {article.verifiedAt
                ? formatDate(article.verifiedAt)
                : "Not yet verified"}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewArticleModal;
