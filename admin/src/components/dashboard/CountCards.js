import React, { useEffect, useState } from "react";
import { Users, UserCheck, MessageSquare, Calendar } from "lucide-react";

const StatCard = ({ title, value, delta, up, Icon }) => (
  <div className="group relative overflow-hidden rounded-xl border border-blue-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-blue-200">
    {/* Gradient overlay on hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</h4>
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 group-hover:from-blue-100 group-hover:to-blue-200/50 transition-all duration-300">
          {Icon ? <Icon size={20} className="text-[#023D7B]" /> : <span>▢</span>}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold bg-gradient-to-br from-[#023D7B] to-[#0E5E9C] bg-clip-text text-transparent">
          {value?.toLocaleString?.() || 0}
        </p>
        {delta != null && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100">
            <span className={`text-xs font-semibold ${
              up ? "text-emerald-600" : "text-red-600"
            }`}>
              {up ? "+" : ""}{delta}%
            </span>
            <span className={`text-sm ${
              up ? "text-emerald-500" : "text-red-500"
            }`}>
              {up ? "↗" : "↙"}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const CountCards = () => {
  // State for each stat
  const [legalSeekers, setLegalSeekers] = useState({
    value: 0,
    delta: 0,
    up: true,
  });
  const [verifiedLawyers, setVerifiedLawyers] = useState({
    value: 0,
    delta: 0,
    up: true,
  });
  const [weeklyForumPosts, setWeeklyForumPosts] = useState({
    value: 0,
    delta: 0,
    up: true,
  });
  const [consultations, setConsultations] = useState({
    value: 0,
    delta: 0,
    up: true,
  });

  // Helper for fetching and setting data
  const fetchData = async (endpoint, setter, keyName) => {
    try {
      const res = await fetch(`http://localhost:5001/api/stats/${endpoint}`);
      const data = await res.json();

      // Extract correct key dynamically
      setter({
        value: data[keyName],
        delta: data.delta ?? 0,
        up: data.up ?? true,
      });
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
    }
  };

  useEffect(() => {
    fetchData("user-count", setLegalSeekers, "legalSeekers");
    fetchData("lawyer-count", setVerifiedLawyers, "verifiedLawyer");
    fetchData("weekly-forum-posts", setWeeklyForumPosts, "weeklyForumPosts");
    fetchData("consultations-count", setConsultations, "consultationsCount");
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Legal Seekers"
        value={legalSeekers.value}
        delta={legalSeekers.delta}
        up={legalSeekers.up}
        Icon={Users}
      />
      <StatCard
        title="Lawyers"
        value={verifiedLawyers.value}
        delta={verifiedLawyers.delta}
        up={verifiedLawyers.up}
        Icon={UserCheck}
      />
      <StatCard
        title="Forum Posts (This Week)"
        value={weeklyForumPosts.value}
        delta={weeklyForumPosts.delta}
        up={weeklyForumPosts.up}
        Icon={MessageSquare}
      />
      <StatCard
        title="Consultations (This Week)"
        value={consultations.value}
        delta={consultations.delta}
        up={consultations.up}
        Icon={Calendar}
      />
    </div>
  );
};

export default CountCards;
