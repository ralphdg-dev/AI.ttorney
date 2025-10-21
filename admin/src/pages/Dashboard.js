import React from "react";
import CountCards from "../components/dashboard/CountCards";
import LineChartCard from "../components/dashboard/LineChartCard";
import ReportsListCard from "../components/dashboard/ReportsListCard";
import RecentLawyerApplicationsCard from "../components/dashboard/RecentLawyerApplicationsCard";
import ForumPostsByCategoryCard from "../components/dashboard/ForumPostsByCategoryCard";
import TermsByCategoryCard from "../components/dashboard/TermsByCategoryCard";
import ArticlesByCategoryCard from "../components/dashboard/ArticlesByCategoryCard";

const Dashboard = () => (
  <div className=" space-y-6 bg-gray-50 min-h-screen">
    {/* TOP GRID */}
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Count cards */}
      <div className="xl:col-span-9">
        <CountCards />
      </div>

      {/* Lawyer applications */}
      <div className="xl:col-span-3 xl:row-span-2">
        <div className="h-full min-h-[280px] sm:min-h-[320px] md:min-h-[380px]">
          <RecentLawyerApplicationsCard />
        </div>
      </div>

      {/* Charts section */}
      <div className="xl:col-span-9">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LineChartCard />
          <ReportsListCard />
        </div>
      </div>
    </div>

    {/* BOTTOM GRID */}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      <ForumPostsByCategoryCard />
      <TermsByCategoryCard />
      <ArticlesByCategoryCard />
    </div>
  </div>
);

export default Dashboard;
