import React from "react";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Archive,
  Upload,
  MoreVertical,
} from "lucide-react";
import Tooltip from "../../components/ui/Tooltip";
import ListToolbar from "../../components/ui/ListToolbar";
import Pagination from "../../components/ui/Pagination";

const ManageAppeals = () => {
  const [appeals, setAppeals] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("Newest");
  const [filteredData, setFilteredData] = React.useState([]);
  const [openMenuId, setOpenMenuId] = React.useState(null);
  const [dropdownPosition, setDropdownPosition] = React.useState(null);

  // 🔹 Fetch data from Supabase API
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/appeals-management");
        const json = await res.json();
        if (json.success) {
          setAppeals(json.data || []);
          setFilteredData(json.data || []);
        } else {
          console.error("Error fetching appeals:", json.error);
        }
      } catch (err) {
        console.error("Error fetching appeals:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔹 Filtering and sorting logic
  React.useEffect(() => {
    let data = [...appeals];
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((item) =>
        Object.values(item).some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (sortBy === "Newest")
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === "Oldest")
      data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    setFilteredData(data);
  }, [query, sortBy, appeals]);

  const toggleMenu = (id, event) => {
    event.stopPropagation();
    if (openMenuId === id) return setOpenMenuId(null);
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({ top: rect.bottom + 4, left: rect.right - 130 });
    setOpenMenuId(id);
  };

  const renderDropdown = (row) => {
    if (openMenuId !== row.id) return null;
    return (
      <div
        className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-md w-36 text-[11px]"
        style={{
          position: "fixed",
          top: dropdownPosition?.top ?? 0,
          left: dropdownPosition?.left ?? 0,
        }}
      >
        <button className="flex items-center w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50">
          <Eye size={12} className="mr-2 text-gray-500" /> View
        </button>
        <button className="flex items-center w-full px-3 py-1.5 text-emerald-600 hover:bg-emerald-50">
          <CheckCircle size={12} className="mr-2 text-emerald-500" /> Approve
        </button>
        <button className="flex items-center w-full px-3 py-1.5 text-red-600 hover:bg-red-50">
          <XCircle size={12} className="mr-2 text-red-500" /> Reject
        </button>
      </div>
    );
  };

  // 🔹 Helper to safely display data or fallback
  const displayValue = (value) => {
    if (value === null || value === undefined || value === "") return "N/A";
    return value;
  };

  const columns = [
    { key: "user_full_name", header: "User Name" },
    { key: "suspension_id", header: "Suspension ID" },
    { key: "suspension_reason", header: "Suspension Reason" },
    { key: "appeal_reason", header: "Appeal Reason" },
    { key: "additional_context", header: "Additional Context" },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const statusRaw = r.status || "pending";
        const status =
          statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();

        let badgeStyle = "bg-yellow-50 border-yellow-200 text-yellow-700"; // default pending

        if (status === "Approved")
          badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-700";
        else if (status === "Rejected")
          badgeStyle = "bg-red-50 border-red-200 text-red-600";

        return (
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border ${badgeStyle}`}
          >
            {status}
          </span>
        );
      },
    },
    { key: "reviewed_by", header: "Reviewed By" },
    { key: "reviewed_at", header: "Reviewed At" },
    { key: "admin_notes", header: "Admin Notes" },
    { key: "rejection_reason", header: "Rejection Reason" },
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
      <div className="mb-3">
        <div className="flex items-stretch gap-2">
          <div className="flex items-center justify-center px-2 rounded-md bg-[#023D7B]/10 text-[#023D7B]">
            <FileText size={14} />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className="text-[12px] font-semibold text-gray-900">
              Manage Appeals
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              View and manage user suspension appeals.
            </p>
          </div>
        </div>
        <div className="mt-2 border-t border-gray-200" />
      </div>

      <div className="w-full mb-3 flex items-center gap-2">
        <div className="flex-1">
          <ListToolbar
            query={query}
            onQueryChange={setQuery}
            sort={{
              value: sortBy,
              onChange: setSortBy,
              options: ["Newest", "Oldest"],
              label: "Sort by",
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : (
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
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-[11px] text-gray-500"
                    >
                      <div className="flex flex-col items-center">
                        <FileText className="h-8 w-8 text-gray-400 mb-2" />
                        <p>No appeals found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
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
                          {col.render
                            ? col.render(row)
                            : displayValue(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={filteredData.length}
        itemsPerPage={10}
        onPageChange={() => {}}
        itemName="appeals"
      />
    </div>
  );
};

export default ManageAppeals;
