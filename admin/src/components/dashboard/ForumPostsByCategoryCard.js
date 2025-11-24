import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const ForumPostsByCategoryCard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchForumPosts = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api'}/stats/forum-posts-by-category`
        );
        const result = await response.json();

        const formatted = result.map((item) => ({
          ...item,
          category:
            item.category.charAt(0).toUpperCase() + item.category.slice(1),
        }));

        setData(formatted);
      } catch (err) {
        console.error("Error fetching forum posts by category:", err);
      }
    };
    fetchForumPosts();
  }, []);

  const COLORS = {
    Civil: { start: "#023D7B", end: "#0E5E9C" }, 
    Consumer: { start: "#0E5E9C", end: "#1D84B5" }, 
    Criminal: { start: "#1D84B5", end: "#479FC8" }, 
    Family: { start: "#479FC8", end: "#74B9D2" },
    Labor: { start: "#74B9D2", end: "#A3BFD9" },
    Others: { start: "#A3BFD9", end: "#C5D4E3" }, 
  };

  // Custom tooltip with better styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <p className="text-lg font-bold text-blue-600">
            {payload[0].value.toLocaleString()} posts
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
          Forum Posts by Category
        </h4>
      </div>

      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient key={`forum-gradient-${index}`} id={`forum-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[entry.category]?.start || '#023D7B'} stopOpacity={1} />
                    <stop offset="100%" stopColor={COLORS[entry.category]?.end || COLORS[entry.category]?.start || '#023D7B'} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0" 
                vertical={false}
              />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-45}
                textAnchor="end"
                height={60}
                stroke="#e5e7eb"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#6b7280' }}
                stroke="#e5e7eb"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[8, 8, 0, 0]}
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#forum-gradient-${index})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-3">
              <span className="text-2xl text-purple-400">💬</span>
            </div>
            <p className="text-gray-400 text-sm font-medium">No forum posts found</p>
            <p className="text-gray-300 text-xs mt-1">Start a conversation in the community</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumPostsByCategoryCard;
