import React from "react";
import ReactDOM from "react-dom";
import {
  FileText,
  Eye,
  Pencil,
  Archive,
  MoreVertical,
  Upload,
  Download,
} from "lucide-react";
import Tooltip from "../../components/ui/Tooltip";
import ListToolbar from "../../components/ui/ListToolbar";
import Pagination from "../../components/ui/Pagination";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import ViewArticleModal from "../../components/articles/ViewArticleModal";
import AddArticleModal from "../../components/articles/AddArticleModal";
import EditArticleModal from "../../components/articles/EditArticleModal";
import PublishModal from "./components/PublishModal";
import { useToast } from "../../components/ui/Toast";

const categories = ["All", "Family", "Criminal", "Civil", "Labor", "Consumer"];
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const ManageLegalArticles = () => {
  const { showSuccess, showError, showWarning, ToastContainer } = useToast();

  // States
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("All");
  const [sortBy, setSortBy] = React.useState("Newest");
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [selectedArticle, setSelectedArticle] = React.useState(null);
  const [openMenuId, setOpenMenuId] = React.useState(null);
  const [dropdownPosition, setDropdownPosition] = React.useState(null);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [articleToEdit, setArticleToEdit] = React.useState(null);
  const [imageModal, setImageModal] = React.useState({
    open: false,
    src: null,
  });
  const [showModal, setShowModal] = React.useState(false);
  const [confirmationModal, setConfirmationModal] = React.useState({
    open: false,
    type: "",
    articleId: null,
    articleTitle: "",
  });
  const [publishModal, setPublishModal] = React.useState({
    open: false,
    article: null,
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(10);

  const [articles, setArticles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showArchives, setShowArchives] = React.useState(false);

  // Get auth token from localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
    return { "Content-Type": "application/json" };
  };

  const fetchArticles = async (archives = false) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/legal-articles?archived=${archives}`);
      const json = await res.json();
      if (json.success) {
        setArticles(json.data);
        setCurrentPage(1); // Reset to first page when data changes
      } else {
        console.error("Failed to fetch articles");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchArticles(showArchives);
  }, [showArchives]);

  // Handle archive filter change
  const handleArchiveFilterChange = (value) => {
    setShowArchives(value === "Archived");
  };

  // Handle fade-in on modal open
  React.useEffect(() => {
    if (imageModal.open) setShowModal(true);
  }, [imageModal.open]);

  const closeImageModal = () => {
    setShowModal(false);
    setTimeout(() => setImageModal({ open: false, src: null }), 300);
  };

  const handleAddArticle = async (formData, token) => {
    try {
      const data = new FormData();
      data.append("title_en", formData.enTitle);
      data.append("title_fil", formData.filTitle);
      data.append("description_en", formData.enDescription);
      data.append("description_fil", formData.filDescription);
      data.append("content_en", formData.content_en);
      data.append("content_fil", formData.content_fil);
      data.append("category", formData.category.toLowerCase());
      if (formData.image) data.append("image", formData.image);

      const res = await fetch(`${API_BASE_URL}/legal-articles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });

      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Failed to add article");

      setArticles((prev) => [json.data, ...prev]);
    } catch (err) {
      console.error("Failed to add article:", err);
      throw err;
    }
  };

  // Handle archive
  const handleArchive = async (articleId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/legal-articles/${articleId}/archive`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Failed to archive article");
      }

      // Remove the archived article from the list
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      const a = articles.find((x) => x.id === articleId);
      showSuccess(`Archived "${a?.enTitle || "Article"}" successfully`);
    } catch (err) {
      console.error("Archive error:", err);
      showError(err.message || "Failed to archive article");
    }
  };

  // Handle restore
  const handleRestore = async (articleId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/legal-articles/${articleId}/restore`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Failed to restore article");
      }

      // Remove the restored article from the archives list
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      const a = articles.find((x) => x.id === articleId);
      showSuccess(`Restored "${a?.enTitle || "Article"}" successfully`);
    } catch (err) {
      console.error("Restore error:", err);
      showError(err.message || "Failed to restore article");
    }
  };

  // Handle publish/unpublish
  const handlePublish = async (articleId, publish) => {
    try {
      const res = await fetch(`${API_BASE_URL}/legal-articles/${articleId}/publish`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ publish }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(
          json.message ||
            `Failed to ${publish ? "publish" : "unpublish"} article`
        );
      }

      return json.data;
    } catch (err) {
      console.error("Publish error:", err);
      throw err;
    }
  };

  // Filtering & sorting
  const filteredData = React.useMemo(() => {
    let rows = [...articles];

    // Search query filter
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    // Category filter (case-insensitive) - only apply if not viewing archives and category is not "All"
    if (!showArchives && category !== "All") {
      rows = rows.filter(
        (r) => (r.category || "").toLowerCase() === category.toLowerCase()
      );
    }

    // Sorting
    const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    const byDateAsc = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    const byTitle = (a, b) => a.enTitle.localeCompare(b.enTitle);
    const byTitleDesc = (a, b) => b.enTitle.localeCompare(a.enTitle);

    switch (sortBy) {
      case "Newest":
        rows.sort(byDate);
        break;
      case "Oldest":
        rows.sort(byDateAsc);
        break;
      case "A-Z (Title)":
        rows.sort(byTitle);
        break;
      case "Z-A (Title)":
        rows.sort(byTitleDesc);
        break;
      default:
        break;
    }

    return rows;
  }, [query, category, sortBy, articles, showArchives]);

  // Pagination calculations
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get current page items
  const currentItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [query, category, sortBy, showArchives]);

  const formatDate = (date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(date));

  const getCategoryClasses = (category) => {
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

  const renderCategoryBadge = (category) => {
    if (!category) return "-";
    const classes = getCategoryClasses(category);
    const displayText = category.charAt(0).toUpperCase() + category.slice(1);
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border ${classes}`}
      >
        {displayText}
      </span>
    );
  };

  // Dropdown logic
  const toggleMenu = (id, event) => {
    event.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - rect.right);
    const bottom = Math.max(8, window.innerHeight - rect.top + 10); // 10px above the trigger
    setDropdownPosition({ right, bottom });
    setOpenMenuId(id);
  };

  const renderDropdown = (row) => {
    if (openMenuId !== row.id) return null;
    return ReactDOM.createPortal(
      <div
        className="absolute z-[9999] bg-white border border-gray-200 rounded-md shadow-md w-36 text-[11px]"
        style={{
          position: "fixed",
          right: dropdownPosition?.right ?? 20,
          bottom: dropdownPosition?.bottom ?? 20,
        }}
      >
        <button
          className="flex items-center w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          onClick={() => {
            setSelectedArticle(row);
            setViewModalOpen(true);
            setOpenMenuId(null);
          }}
        >
          <Eye size={12} className="mr-2 text-gray-500" /> View
        </button>

        <button
          className="flex items-center w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          onClick={() => {
            setArticleToEdit(row);
            setEditModalOpen(true);
            setOpenMenuId(null);
          }}
        >
          <Pencil size={12} className="mr-2 text-gray-500" /> Edit
        </button>

        {showArchives ? (
          <button
            className="flex items-center w-full px-3 py-1.5 text-emerald-600 hover:bg-emerald-50"
            onClick={() => {
              setConfirmationModal({
                open: true,
                type: "restore",
                articleId: row.id,
                articleTitle: row.enTitle,
              });
              setOpenMenuId(null);
            }}
          >
            <Upload size={12} className="mr-2 text-emerald-500" /> Restore
          </button>
        ) : (
          <>
            {row.status === "Unpublished" ? (
              <button
                className="flex items-center w-full px-3 py-1.5 text-emerald-600 hover:bg-emerald-50"
                onClick={() => {
                  setPublishModal({ open: true, article: row });
                  setOpenMenuId(null);
                }}
              >
                <Upload size={12} className="mr-2 text-emerald-500" /> Publish
              </button>
            ) : (
              <button
                className="flex items-center w-full px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  setPublishModal({ open: true, article: row });
                  setOpenMenuId(null);
                }}
              >
                <Download size={12} className="mr-2 text-gray-500" /> Unpublish
              </button>
            )}

            <button
              className="flex items-center w-full px-3 py-1.5 text-red-600 hover:bg-red-50"
              onClick={() => {
                setConfirmationModal({
                  open: true,
                  type: "archive",
                  articleId: row.id,
                  articleTitle: row.enTitle,
                });
                setOpenMenuId(null);
              }}
            >
              <Archive size={12} className="mr-2 text-red-500" /> Archive
            </button>
          </>
        )}
      </div>,
      document.body
    );
  };

  const columns = [
    {
      key: "enTitle",
      header: "English Title",
      render: (r) => (
        <div className="line-clamp-1 text-sm text-gray-700" title={r.enTitle}>
          {r.enTitle}
        </div>
      ),
    },
    {
      key: "filTitle",
      header: "Filipino Title",
      render: (r) => (
        <div className="line-clamp-1 text-sm text-gray-700" title={r.filTitle}>
          {r.filTitle}
        </div>
      ),
    },
    {
      key: "enDescription",
      header: "English Description",
      render: (r) => (
        <div className="line-clamp-2 text-sm text-gray-700">
          {r.enDescription}
        </div>
      ),
    },
    {
      key: "filDescription",
      header: "Filipino Description",
      render: (r) => (
        <div className="line-clamp-2 text-sm text-gray-700">
          {r.filDescription}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (r) => renderCategoryBadge(r.category),
    },
    {
      key: "image",
      header: "Image",
      align: "center",
      render: (r) =>
        r.image ? (
          <div className="relative">
            <img
              src={r.image}
              alt="Article thumbnail"
              className="w-8 h-8 object-cover rounded cursor-pointer"
              onClick={() => setImageModal({ open: true, src: r.image })}
              onError={(e) => {
                e.target.style.display = "none";
                if (e.target.nextSibling)
                  e.target.nextSibling.style.display = "block";
              }}
            />
            <span
              className="text-gray-400 text-[10px] italic hidden"
              style={{ display: "none" }}
            >
              No image
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-[10px] italic">No image</span>
        ),
    },
    {
      key: "enContent",
      header: "English Content",
      render: (r) => (
        <div className="line-clamp-2 text-sm text-gray-700">{r.enContent}</div>
      ),
    },
    {
      key: "filContent",
      header: "Filipino Content",
      render: (r) => (
        <div className="line-clamp-2 text-sm text-gray-700">{r.filContent}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border ${
            r.status === "Published"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-gray-50 border-gray-200 text-gray-600"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="relative flex justify-end">
          <Tooltip content="Actions">
            <button
              onClick={(e) => toggleMenu(r.id, e)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical size={16} />
            </button>
          </Tooltip>
          {renderDropdown(r)}
        </div>
      ),
    },
  ];

  return (
    <div>
      <ToastContainer />
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B]">
            <FileText size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">
              Manage Legal Articles
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              English/Filipino articles categorized by law domain.
            </p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      {/* Toolbar */}
      <div className="w-full mb-3">
        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          filter={{
            value: showArchives ? "Archived" : category,
            onChange: (value) => {
              if (value === "Archived") {
                setShowArchives(true);
                setCategory("All");
              } else {
                setShowArchives(false);
                setCategory(value);
              }
            },
            options: ["All", "Family", "Criminal", "Civil", "Labor", "Consumer", "Archived"],
            label: "Filter",
          }}
          sort={{
            value: sortBy,
            onChange: setSortBy,
            options: ["Newest", "Oldest", "A-Z (Title)", "Z-A (Title)"],
            label: "Sort by",
          }}
          primaryButton={{
            label: "Add New",
            onClick: () => setAddModalOpen(true),
            className: "inline-flex items-center gap-1 bg-[#023D7B] text-white text-[11px] px-3 py-1.5 rounded-md hover:bg-[#013462]"
          }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2 text-[10px] font-medium text-gray-500 ${
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-[11px] text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#023D7B] mr-2"></div>
                      Loading articles...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && currentItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-[11px] text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 text-gray-400 mb-2" />
                      <p>No articles found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 relative">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2 text-[11px] text-gray-700 ${
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : ""
                        }`}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        itemName="articles"
      />

      {/* Modals */}
      <ViewArticleModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        article={selectedArticle}
      />
      <AddArticleModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={handleAddArticle}
      />

      <ConfirmationModal
        open={confirmationModal.open}
        onClose={() => setConfirmationModal({ open: false })}
        type={confirmationModal.type}
        onConfirm={async () => {
          try {
            if (confirmationModal.type === "archive") {
              await handleArchive(confirmationModal.articleId);
            } else if (confirmationModal.type === "restore") {
              await handleRestore(confirmationModal.articleId);
            }
          } catch (err) {
            console.error(err);
          } finally {
            setConfirmationModal({ open: false });
          }
        }}
        title={
          confirmationModal.type === "archive"
            ? "Archive Article"
            : "Restore Article"
        }
        message={
          confirmationModal.type === "archive"
            ? `Are you sure you want to archive "${confirmationModal.articleTitle}"? This article will be hidden from the list.`
            : `Are you sure you want to restore "${confirmationModal.articleTitle}"? This article will be visible in the main list.`
        }
      />

      <EditArticleModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        article={articleToEdit}
        onUpdate={(updatedArticle) => {
          setArticles((prev) =>
            prev.map((a) => (a.id === updatedArticle.id ? updatedArticle : a))
          );
        }}
      />
      <PublishModal
        open={publishModal.open}
        article={publishModal.article}
        onClose={() => setPublishModal({ open: false, article: null })}
        onConfirm={async () => {
          try {
            const articleId = publishModal.article.id;
            const publish = publishModal.article.status === "Unpublished";
            const updatedArticle = await handlePublish(articleId, publish);

            setArticles((prev) =>
              prev.map((a) => (a.id === articleId ? updatedArticle : a))
            );
          } catch (err) {
            console.error(err);
          } finally {
            setPublishModal({ open: false, article: null });
          }
        }}
      />

      {/* Image Modal with fade animation */}
      {imageModal.open && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${
            showModal ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={closeImageModal}
        >
          <img
            src={imageModal.src}
            alt="Full size"
            className={`max-w-[90vw] max-h-[90vh] object-contain rounded shadow-lg transition-transform duration-300 ${
              showModal ? "scale-100" : "scale-90"
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ManageLegalArticles;