import React from 'react';
import CountCards from '../components/dashboard/CountCards';
import LineChartCard from '../components/dashboard/LineChartCard';
import ReportsListCard from '../components/dashboard/ReportsListCard';
import RecentLawyerApplicationsCard from '../components/dashboard/RecentLawyerApplicationsCard';
import ForumPostsByCategoryCard from '../components/dashboard/ForumPostsByCategoryCard';
import TermsByCategoryCard from '../components/dashboard/TermsByCategoryCard';
import ArticlesByCategoryCard from '../components/dashboard/ArticlesByCategoryCard';

const Dashboard = () => (
  <div className="space-y-4">
    {/* KPIs + Summary (row-span) + second row in one grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* KPIs area */}
      <div className="lg:col-span-9">
        <CountCards />
      </div>
      {/* Summary card spans two rows */}
      <div className="lg:col-span-3 lg:row-span-2 h-full">
        <RecentLawyerApplicationsCard />
      </div>
      {/* Second row content aligned with KPIs width */}
      <div className="lg:col-span-9">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LineChartCard />
          <ReportsListCard />
        </div>
      </div>
    </div>

    {/* Bottom row: three cards */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <ForumPostsByCategoryCard />
      <TermsByCategoryCard />
      <ArticlesByCategoryCard />
    </div>
  </div>
);

export default Dashboard;
