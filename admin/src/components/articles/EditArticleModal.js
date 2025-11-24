import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import ConfirmationModal from "../ui/ConfirmationModal";
import { Save } from "lucide-react";

const EditArticleModal = ({ open, onClose, article, onUpdate }) => {
  const [formData, setFormData] = useState({
    enTitle: "",
    filTitle: "",
    enDescription: "",
    filDescription: "",
    content_en: "",
    content_fil: "",
    category: "",
    image: null,
    existingImage: null,
  });

  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationLoading, setConfirmationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [translating, setTranslating] = useState(false);

  const categoryOptions = ["Family", "Criminal", "Civil", "Labor", "Consumer"];

  // Load article data when modal opens
  useEffect(() => {
    if (open && article) {
      const initialData = {
        enTitle: article.enTitle || "",
        filTitle: article.filTitle || "",
        enDescription: article.enDescription || "",
        filDescription: article.filDescription || "",
        content_en: article.enContent || "",
        content_fil: article.filContent || "",
        category: article.category
          ? article.category.charAt(0).toUpperCase() + article.category.slice(1)
          : "",
        image: null,
        existingImage: article.image || null,
      };

      setFormData(initialData);
      setOriginalData(initialData);
      setValidationErrors({});
      setError(null);
      setLoading(false);
      setShowConfirmation(false);
      setConfirmationLoading(false);
      setTranslating(false);
    }
  }, [open, article]);

  const validateForm = () => {
    const errors = {};
    if (!formData.enTitle.trim()) errors.enTitle = "English title is required";
    if (!formData.filTitle.trim())
      errors.filTitle = "Filipino title is required";
    if (!formData.enDescription.trim())
      errors.enDescription = "English description is required";
    if (!formData.filDescription.trim())
      errors.filDescription = "Filipino description is required";
    if (!formData.content_en.trim())
      errors.content_en = "English content is required";
    if (!formData.content_fil.trim())
      errors.content_fil = "Filipino content is required";
    if (!formData.category) errors.category = "Category is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowConfirmation(true);
  };

  // Generate separate audit logs for each field change
  const getAuditLogs = () => {
    const auditLogs = [];

    if (formData.enTitle !== originalData.enTitle) {
      auditLogs.push({
        action: `Edited English Title from "${originalData.enTitle}" to "${formData.enTitle}"`,
        metadata: {
          previous_title: originalData.enTitle,
          new_title: formData.enTitle,
        },
      });
    }

    if (formData.filTitle !== originalData.filTitle) {
      auditLogs.push({
        action: `Edited Filipino Title from "${originalData.filTitle}" to "${formData.filTitle}"`,
        metadata: {
          previous_title: originalData.filTitle,
          new_title: formData.filTitle,
        },
      });
    }

    if (formData.enDescription !== originalData.enDescription) {
      auditLogs.push({
        action: `Edited English Description from "${originalData.enDescription}" to "${formData.enDescription}"`,
        metadata: {
          previous_description: originalData.enDescription,
          new_description: formData.enDescription,
        },
      });
    }

    if (formData.filDescription !== originalData.filDescription) {
      auditLogs.push({
        action: `Edited Filipino Description from "${originalData.filDescription}" to "${formData.filDescription}"`,
        metadata: {
          previous_description: originalData.filDescription,
          new_description: formData.filDescription,
        },
      });
    }

    if (formData.content_en !== originalData.content_en) {
      auditLogs.push({
        action: `Edited English Content from "${originalData.content_en}" to "${formData.content_en}"`,
        metadata: {
          content_updated: true,
        },
      });
    }

    if (formData.content_fil !== originalData.content_fil) {
      auditLogs.push({
        action: `Edited Filipino Content from "${originalData.content_fil}" to "${formData.content_fil}"`,
        metadata: {
          content_updated: true,
        },
      });
    }

    if (formData.category !== originalData.category) {
      auditLogs.push({
        action: `Changed category from "${originalData.category}" to "${formData.category}"`,
        metadata: {
          previous_category: originalData.category,
          new_category: formData.category,
        },
      });
    }

    if (formData.image) {
      auditLogs.push({
        action: "Updated image",
        metadata: {
          image_updated: true,
        },
      });
    }

    return auditLogs;
  };

  const handleConfirmUpdate = async () => {
    try {
      setConfirmationLoading(true);
      setError(null);

      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Admin authentication required");
      }

      const auditLogs = getAuditLogs();

      const data = new FormData();
      data.append("title_en", formData.enTitle);
      data.append("title_fil", formData.filTitle);
      data.append("description_en", formData.enDescription);
      data.append("description_fil", formData.filDescription);
      data.append("content_en", formData.content_en);
      data.append("content_fil", formData.content_fil);
      data.append("category", formData.category.toLowerCase());
      data.append("audit_logs", JSON.stringify(auditLogs));

      if (formData.image) data.append("image", formData.image);

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api'}/legal-articles/${article.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }
      );

      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to update");

      onUpdate(json.data); // update parent table
      setShowConfirmation(false);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update article");
      setShowConfirmation(false);
    } finally {
      setConfirmationLoading(false);
    }
  };

  const translateText = async (text, targetLang) => {
    const res = await fetch(`${process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api'}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang }),
    });

    const data = await res.json();
    return data.translation;
  };

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const newFormData = { ...formData };

      // Titles
      if (formData.enTitle && !formData.filTitle) {
        newFormData.filTitle = await translateText(formData.enTitle, "fil");
      } else if (!formData.enTitle && formData.filTitle) {
        newFormData.enTitle = await translateText(formData.filTitle, "en");
      }

      // Descriptions
      if (formData.enDescription && !formData.filDescription) {
        newFormData.filDescription = await translateText(
          formData.enDescription,
          "fil"
        );
      } else if (!formData.enDescription && formData.filDescription) {
        newFormData.enDescription = await translateText(
          formData.filDescription,
          "en"
        );
      }

      // Contents
      if (formData.content_en && !formData.content_fil) {
        newFormData.content_fil = await translateText(
          formData.content_en,
          "fil"
        );
      } else if (!formData.content_en && formData.content_fil) {
        newFormData.content_en = await translateText(
          formData.content_fil,
          "en"
        );
      }

      setFormData(newFormData);
    } catch (err) {
      console.error("Translation failed:", err);
      setError(err.message);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Legal Article"
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <Select
            value={formData.category}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, category: value }))
            }
            options={categoryOptions}
            variant="form"
            error={!!validationErrors.category}
            disabled={loading}
            placeholder="Select article category"
          />
          {validationErrors.category && (
            <p className="mt-0.5 text-[10px] text-red-600">
              {validationErrors.category}
            </p>
          )}
        </div>

        {/* Titles */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              English Title <span className="text-red-500">*</span>
            </label>
            <input
              name="enTitle"
              value={formData.enTitle}
              onChange={handleChange}
              className={`w-full px-2 py-1.5 border rounded-md text-xs focus:ring-1 focus:ring-[#023D7B] ${
                validationErrors.enTitle ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter English title"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Title <span className="text-red-500">*</span>
            </label>
            <input
              name="filTitle"
              value={formData.filTitle}
              onChange={handleChange}
              className={`w-full px-2 py-1.5 border rounded-md text-xs focus:ring-1 focus:ring-[#023D7B] ${
                validationErrors.filTitle ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter Filipino title"
            />
          </div>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              English Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="enDescription"
              value={formData.enDescription}
              onChange={handleChange}
              rows={2}
              className={`w-full px-2 py-1.5 border rounded-md text-xs resize-none focus:ring-1 focus:ring-[#023D7B] ${
                validationErrors.enDescription
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="Enter short English description"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="filDescription"
              value={formData.filDescription}
              onChange={handleChange}
              rows={2}
              className={`w-full px-2 py-1.5 border rounded-md text-xs resize-none focus:ring-1 focus:ring-[#023D7B] ${
                validationErrors.filDescription
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="Enter short Filipino description"
            />
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Image (optional)
          </label>
          {formData.existingImage && (
            <div className="mb-1">
              <img
                src={formData.existingImage}
                alt="Existing article"
                className="w-20 h-20 object-cover rounded"
              />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            name="image"
            onChange={handleChange}
            className="w-full text-xs border border-gray-300 rounded-md p-1.5"
          />
        </div>

        {/* Contents */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              English Content <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content_en"
              value={formData.content_en}
              onChange={handleChange}
              rows={4}
              className={`w-full px-2 py-1.5 border rounded-md text-xs resize-none focus:ring-1 focus:ring-[#023D7B] ${
                validationErrors.content_en
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="Enter English content"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filipino Content <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content_fil"
              value={formData.content_fil}
              onChange={handleChange}
              rows={4}
              className={`w-full px-2 py-1.5 border rounded-md text-xs resize-none focus:ring-1 focus:ring-[#023D7B] ${
                validationErrors.content_fil
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="Enter Filipino content"
            />
          </div>
        </div>

        {/* Translate Button */}
        <div>
          <button
            type="button"
            onClick={handleTranslate}
            disabled={translating}
            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            {translating ? "Translating..." : "Auto Translate"}
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#023D7B] rounded-md hover:bg-[#013462]"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save size={14} />
                Update Article
              </>
            )}
          </button>
        </div>
      </form>

      <ConfirmationModal
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmUpdate}
        title="Update Legal Article"
        message={`Are you sure you want to update the article "${formData.enTitle}"?`}
        confirmText="Update Article"
        loading={confirmationLoading}
        type="edit"
      />
    </Modal>
  );
};

export default EditArticleModal;
