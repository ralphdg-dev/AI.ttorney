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
    <div className="group rounded-xl border border-blue-100 bg-white p-6 h-full flex flex-col shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-[#023D7B] to-[#0E5E9C] rounded-full" />
        <h4 className="text-sm font-bold text-gray-800">
          Lawyer Applications (Last 30 Days)
        </h4>
      </div>

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
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-2xl text-gray-400">📄</span>
            </div>
            <p className="text-gray-400 text-sm font-medium">No recent applications</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentLawyerApplicationsCard;
