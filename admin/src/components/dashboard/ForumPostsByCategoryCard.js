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
          "http://localhost:5001/api/stats/forum-posts-by-category"
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
    Civil: "#023D7B", 
    Consumer: "#0E5E9C", 
    Criminal: "#1D84B5", 
    Family: "#479FC8",
    Labor: "#74B9D2",
    Others: "#A3BFD9", 
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col">
      <h4 className="text-[11px] text-gray-600 font-semibold mb-3">
        Forum Posts by Category
      </h4>

      <div className="flex-1 min-h-[200px] sm:min-h-[250px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => [`${value} posts`, ""]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                label={{ position: "top", fontSize: 10 }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.category] || "#023D7B"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-400 text-sm text-center mt-10">
            No forum posts found by category.
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumPostsByCategoryCard;
