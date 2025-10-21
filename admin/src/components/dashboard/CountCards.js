import React, { useEffect, useState } from "react";
import { Users, UserCheck, MessageSquare, Calendar } from "lucide-react";

const StatCard = ({ title, value, delta, up = true, Icon }) => (
  <div
    className="rounded-lg border p-4"
    style={{ backgroundColor: "#023D7B0D", borderColor: "#023D7B26" }}
  >
    <div className="flex items-center justify-between">
      <h4 className="text-[11px] text-gray-600 font-semibold">{title}</h4>
      {Icon ? (
        <Icon size={16} style={{ color: "#023D7B" }} />
      ) : (
        <span className="text-gray-300">▢</span>
      )}
    </div>
    <div className="mt-2 flex items-end justify-between">
      <p className="text-2xl font-semibold" style={{ color: "#023D7B" }}>
        {value}
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
          <span className="text-gray-400">↗</span>
        </div>
      )}
    </div>
  </div>
);

const CountCards = () => {
  const [legalSeekers, setLegalSeekers] = useState(0);
  const [verifiedLawyer, setVerifiedLawyers] = useState(0);
  const [weeklyForumPosts, setWeeklyForumPosts] = useState(0);
  const [consultations, setConsulations] = useState(0);

  useEffect(() => {
    const fetchLegalSeekers = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/stats/user-count"
        );
        console.log("Response status:", response.status);
        const data = await response.json();

        console.log("Parsed data:", data);

        setLegalSeekers(data.legalSeekers);
      } catch (error) {
        console.error("Error fetching legal seekers:", error);
      }
    };

    fetchLegalSeekers();
  }, []);

  useEffect(() => {
    const fetchVerifiedLawyers = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/stats/lawyer-count"
        );
        console.log("Response status:", response.status);
        const data = await response.json();

        console.log("Parsed data:", data);

        setVerifiedLawyers(data.verifiedLawyer);
      } catch (error) {
        console.error("Error fetching legal seekers:", error);
      }
    };

    fetchVerifiedLawyers();
  }, []);

  useEffect(() => {
    const fetchWeeklyForumPosts = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/stats/weekly-forum-posts"
        );
        console.log("Response status:", response.status);
        const data = await response.json();

        console.log("Parsed data:", data);

        setWeeklyForumPosts(data.weeklyForumPosts);
      } catch (error) {
        console.error("Error fetching legal seekers:", error);
      }
    };

    fetchWeeklyForumPosts();
  }, []);

  useEffect(() => {
    const fetchConsultationsCount = async () => {
      try {
        const response = await fetch(
          "http://localhost:5001/api/stats/consultations-count"
        );
        console.log("Response status:", response.status);
        const data = await response.json();

        console.log("Parsed data:", data);

        setConsulations(data.consultationsCount);
      } catch (error) {
        console.error("Error fetching legal seekers:", error);
      }
    };

    fetchConsultationsCount();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Legal Seekers"
        value={legalSeekers.toLocaleString()}
        delta={2.4}
        up
        Icon={Users}
      />
      <StatCard
        title="Lawyers"
        value={verifiedLawyer.toLocaleString()}
        delta={1.1}
        up
        Icon={UserCheck}
      />
      <StatCard
        title="Forum Posts (This Week)"
        value={weeklyForumPosts.toLocaleString()}
        delta={15.0}
        up
        Icon={MessageSquare}
      />
      <StatCard
        title="Consultations (This Week)"
        value={consultations}
        delta={6.1}
        up
        Icon={Calendar}
      />
    </div>
  );
};

export default CountCards;
