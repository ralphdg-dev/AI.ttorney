import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const RecentLawyerApplicationsCard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/stats/lawyer-applications-monthly");
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching lawyer applications:", err);
      }
    };
    fetchApplications();
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 h-full flex flex-col">
      <h4 className="text-[11px] text-gray-600 font-semibold mb-3">
        Lawyer Applications (Last 30 Days)
      </h4>

      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#023D7B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#023D7B" stopOpacity={0.05} />
                </linearGradient>
              </defs>
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
                formatter={(value) => [`${value} applications`, "Count"]}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#023D7B"     
                fillOpacity={1}
                fill="url(#colorApplications)"
                strokeWidth={2}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
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

export default RecentLawyerApplicationsCard;
