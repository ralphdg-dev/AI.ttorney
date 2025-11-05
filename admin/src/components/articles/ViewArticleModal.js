import React from "react";
import Modal from "../ui/Modal";
import { CheckCircle, XCircle } from "lucide-react";

const ViewArticleModal = ({ open, onClose, article, loading = false }) => {
  const formatCategory = (category) =>
    category ? category.charAt(0).toUpperCase() + category.slice(1) : "N/A";

  const formatDate = (dateString, includeTime = true) => {
    if (!dateString) return "-";
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
        title="View Legal Article"
        width="max-w-4xl"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#023D7B] mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading article details...</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (!article) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="View Legal Article"
        width="max-w-4xl"
      >
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-600">Article not found</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Legal Article Details"
      width="max-w-4xl"
    >
      {/* Fixed height container with scroll */}
      <div className="overflow-y-auto max-h-[60vh] pr-2">
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[9px] text-gray-500">Category</div>
              <div className="text-xs font-medium text-gray-900">
                {formatCategory(article.category)}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500">Publication Status</div>
              <div className="flex items-center gap-2">
                {article.status === "Published" ? (
                  <>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Published
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      Unpublished
                    </span>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500">Verified By</div>
              <div className="text-xs font-medium text-gray-900">
                {article.verifiedBy || "Not yet verified"}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500">Verified At</div>
              <div className="text-xs font-medium text-gray-900">
                {article.verifiedAt
                  ? formatDate(article.verifiedAt)
                  : "Not yet verified"}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500">Created At</div>
              <div className="text-xs font-medium text-gray-900">
                {formatDate(article.createdAt)}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500">Updated At</div>
              <div className="text-xs font-medium text-gray-900">
                {formatDate(article.updatedAt)}
              </div>
            </div>
          </div>

          {/* Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-gray-500 mb-1">English Title</div>
              <div className="text-xs font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                {article.enTitle || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500 mb-1">
                Filipino Title
              </div>
              <div className="text-xs font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                {article.filTitle || "N/A"}
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-gray-500 mb-1">
                English Description
              </div>
              <div className="text-xs font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-y-auto whitespace-pre-line">
                {article.enDescription || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500 mb-1">
                Filipino Description
              </div>
              <div className="text-xs font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 max-h-32 overflow-y-auto whitespace-pre-line">
                {article.filDescription || "N/A"}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-gray-500 mb-1">
                English Content
              </div>
              <div className="text-xs font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 max-h-40 overflow-y-auto whitespace-pre-line">
                {article.enContent || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-gray-500 mb-1">
                Filipino Content
              </div>
              <div className="text-xs font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 max-h-40 overflow-y-auto whitespace-pre-line">
                {article.filContent || "N/A"}
              </div>
            </div>
          </div>

          {/* Image */}
          <div>
            <div className="text-[9px] text-gray-500 mb-1">Image</div>
            {article.image ? (
              <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50 max-h-60 overflow-y-auto">
                <img
                  src={article.image}
                  alt="Article"
                  className="w-full object-contain rounded-md"
                  onError={(e) => {
                    e.target.style.display = "none";
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = "block";
                    }
                  }}
                />
                <div
                  className="text-xs text-gray-500 italic hidden text-center py-2 bg-gray-50"
                  style={{ display: "none" }}
                >
                  Image failed to load
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic border border-gray-200 rounded-md p-2 bg-gray-50">
                No image provided
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ViewArticleModal;
