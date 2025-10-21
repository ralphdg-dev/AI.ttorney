import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const ReportsListCard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/stats/forum-reports-last-30-days");
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching forum reports:", err);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col">
      <h4 className="text-[11px] text-gray-600 font-semibold mb-3">
        Community Forum Reports (Last 30 Days)
      </h4>

      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`${value} reports`, "Reports"]}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <Line
                type="monotone"
                dataKey="reports"
                stroke="#023D7B"     
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-400 text-sm text-center mt-10">
            No reports found in the last 30 days.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsListCard;
