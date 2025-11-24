import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

const ReportsListCard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api'}/stats/forum-reports-last-30-days`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching forum reports:", err);
      }
    };
    fetchReports();
  }, []);

  // Custom tooltip with better styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">
            {new Date(label).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-sm font-semibold text-gray-800">Reports</p>
          <p className="text-lg font-bold text-blue-600">
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="group rounded-xl border border-blue-100 bg-white p-6 flex flex-col shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-[#023D7B] to-[#0E5E9C] rounded-full" />
        <h4 className="text-sm font-bold text-gray-800">
          Community Forum Reports (Last 30 Days)
        </h4>
      </div>

      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#023D7B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#023D7B" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0" 
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                stroke="#e5e7eb"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                stroke="#e5e7eb"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="reports"
                stroke="#023D7B"
                strokeWidth={2}
                fill="url(#colorReports)"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-3">
              <span className="text-2xl text-green-400">✅</span>
            </div>
            <p className="text-gray-400 text-sm font-medium">No reports in the last 30 days</p>
            <p className="text-gray-300 text-xs mt-1">Community is running smoothly</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsListCard;
