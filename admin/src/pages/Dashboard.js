import React from "react";
import CountCards from "../components/dashboard/CountCards";
import LineChartCard from "../components/dashboard/LineChartCard";
import ReportsListCard from "../components/dashboard/ReportsListCard";
import RecentLawyerApplicationsCard from "../components/dashboard/RecentLawyerApplicationsCard";
import ForumPostsByCategoryCard from "../components/dashboard/ForumPostsByCategoryCard";
import TermsByCategoryCard from "../components/dashboard/TermsByCategoryCard";
import ArticlesByCategoryCard from "../components/dashboard/ArticlesByCategoryCard";
import ManageAuditLogs from "../pages/system/ManageAuditLogs";

const Dashboard = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
    {/* Header Section */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
      <p className="text-gray-600">Monitor your platform's key metrics and insights</p>
    </div>

    {/* TOP GRID */}
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-8">
      <ForumPostsByCategoryCard />
      <TermsByCategoryCard />
      <ArticlesByCategoryCard />
    </div>

    {/* AUDIT LOGS SECTION */}
    <div className="mb-8 px-2 sm:px-0">
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-6 bg-gradient-to-b from-[#023D7B] to-[#0E5E9C] rounded-full" />
              <h2 className="text-lg font-bold text-gray-800">Recent Audit Logs</h2>
            </div>
            <div className="sm:ml-auto text-xs text-gray-500">
              View detailed system activity and admin actions
            </div>
          </div>
        </div>
        {/* Add horizontal scroll container for mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="min-w-[600px] sm:min-w-0">
            <ManageAuditLogs />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Dashboard;
