import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const LineChartCard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/stats/lawyer-applications-status-monthly"
        );
        const result = await response.json();

        let totals = { approved: 0, pending: 0, rejected: 0 };
        result.forEach((item) => {
          totals.approved += item.approved || 0;
          totals.pending += item.pending || 0;
          totals.rejected += item.rejected || 0;
        });

        const chartData = [
          { name: "Approved", value: totals.approved },
          { name: "Pending", value: totals.pending },
          { name: "Rejected", value: totals.rejected },
        ];

        setData(chartData);
      } catch (err) {
        console.error("Error fetching status chart data:", err);
      }
    };
    fetchStatusData();
  }, []);

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2 flex-wrap">
        <div className="flex items-center space-x-3 mb-2 sm:mb-0">
          <h4 className="text-[11px] text-gray-600 font-semibold">
            Lawyer Applications (Last 30 Days)
          </h4>
        </div>

        {/* Legend (auto wraps on small screens) */}
        <div className="flex flex-wrap items-center space-x-3 text-[11px] text-gray-500">
          <div className="flex items-center space-x-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Approved</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            <span>Rejected</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="70%"
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}`, "Applications"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-400 text-sm text-center mt-10">
            No recent applications found.
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChartCard;
