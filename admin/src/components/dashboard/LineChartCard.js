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
          `${process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api'}/stats/lawyer-applications-status-monthly`
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

  const COLORS = {
    Approved: {
      start: "#10b981",
      end: "#059669"
    },
    Pending: {
      start: "#f59e0b", 
      end: "#d97706"
    },
    Rejected: {
      start: "#ef4444",
      end: "#dc2626"
    }
  };

  // Custom tooltip with better styling
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-lg font-bold" style={{ color: COLORS[payload[0].name]?.start || '#666' }}>
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie slices
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for very small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="group rounded-xl border border-blue-100 bg-white p-6 flex flex-col shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4 flex-wrap">
        <div className="flex items-center space-x-3 mb-2 sm:mb-0">
          <div className="w-1 h-6 bg-gradient-to-b from-[#023D7B] to-[#0E5E9C] rounded-full" />
          <h4 className="text-sm font-bold text-gray-800">
            Lawyer Applications (Last 30 Days)
          </h4>
        </div>

        {/* Legend (auto wraps on small screens) */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <span className="font-medium">Approved</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 shadow-sm" />
            <span className="font-medium">Pending</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 shadow-sm" />
            <span className="font-medium">Rejected</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={COLORS[entry.name]?.start || '#666'} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS[entry.name]?.end || COLORS[entry.name]?.start || '#666'} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={90}
                innerRadius={35}
                fill="#8884d8"
                dataKey="value"
                animationBegin={0}
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradient-${index})`}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-3">
              <span className="text-2xl text-blue-400">📄</span>
            </div>
            <p className="text-gray-400 text-sm font-medium">No recent applications found</p>
            <p className="text-gray-300 text-xs mt-1">Check back later for updates</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChartCard;
