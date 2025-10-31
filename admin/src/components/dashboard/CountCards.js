import React, { useEffect, useState } from "react";
import { Users, UserCheck, MessageSquare, Calendar } from "lucide-react";

const StatCard = ({ title, value, delta, up, Icon }) => (
  <div
    className="rounded-lg border p-4"
    style={{ backgroundColor: "#023D7B0D", borderColor: "#023D7B26" }}
  >
    <div className="flex items-center justify-between">
      <h4 className="text-[11px] text-gray-600 font-semibold">{title}</h4>
      {Icon ? <Icon size={16} style={{ color: "#023D7B" }} /> : <span>▢</span>}
    </div>
    <div className="mt-2 flex items-end justify-between">
      <p className="text-2xl font-semibold" style={{ color: "#023D7B" }}>
        {value?.toLocaleString?.() || 0}
      </p>
      {delta != null && (
        <div className="flex items-center space-x-1">
          <span
            className={`text-[10px] ${
              up ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {up ? "+" : ""}
            {delta}%
          </span>
          <span className="text-gray-400">{up ? "↗" : "↙"}</span>
        </div>
      )}
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
