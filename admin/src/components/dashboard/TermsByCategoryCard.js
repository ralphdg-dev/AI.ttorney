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

const TermsByCategoryCard = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/stats/terms-by-category"
        );
        const result = await response.json();

        const formatted = result.map((item) => ({
          ...item,
          category:
            item.category.charAt(0).toUpperCase() + item.category.slice(1),
        }));

        setData(formatted);
      } catch (err) {
        console.error("Error fetching terms by category:", err);
      }
    };
    fetchTerms();
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
        Terms by Category
      </h4>

      <div className="flex-1 min-h-[220px] sm:min-h-[260px] md:min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 30, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                dataKey="category"
                type="category"
                tick={{ fontSize: 10 }}
                width={70}
              />
              <Tooltip
                formatter={(value) => [`${value} terms`, ""]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="count" barSize={40} radius={[0, 4, 4, 0]}>
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
            No terms found by category.
          </div>
        )}
      </div>
    </div>
  );
};

export default TermsByCategoryCard;
