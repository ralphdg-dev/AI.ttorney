import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState([
    { title: 'Total Users', value: 0, color: 'bg-blue-500' },
    { title: 'Lawyers', value: 0, color: 'bg-green-500' },
    { title: 'Legal Seekers', value: 0, color: 'bg-blue-600' },
    { title: 'Forum Posts', value: 0, color: 'bg-purple-500' },
  ]);
  const [lineChartData, setLineChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [pieChartData, setPieChartData] = useState([]);

  const getAuthHeader = () => {
    const token = localStorage.getItem('admin_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting dashboard data fetch...');

      // Fetch dashboard summary
      console.log('📊 Fetching dashboard summary...');
      const summaryResponse = await fetch(`${API_BASE_URL}/stats/dashboard-summary`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });
      
      console.log('📋 Summary response status:', summaryResponse.status);
      const summaryData = await summaryResponse.json();
      console.log('📈 Summary data received:', summaryData);

      if (!summaryResponse.ok) {
        console.error('❌ Summary API error:', summaryData);
        throw new Error(summaryData.error || 'Failed to fetch dashboard summary');
      }

      // Update metrics
      setMetrics([
        { title: 'Total Users', value: summaryData.totalUsers || 0, color: 'bg-blue-500' },
        { title: 'Lawyers', value: summaryData.lawyersCount || 0, color: 'bg-green-500' },
        { title: 'Legal Seekers', value: summaryData.seekersCount || 0, color: 'bg-blue-600' },
        { title: 'Forum Posts', value: summaryData.forumPosts || 0, color: 'bg-purple-500' },
      ]);

      // Fetch forum posts by category for the line chart and category list
      console.log('📝 Fetching category data...');
      const categoryResponse = await fetch(`${API_BASE_URL}/stats/forum-posts-by-category`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });
      
      console.log('📂 Category response status:', categoryResponse.status);
      const categoryDataRaw = await categoryResponse.json();
      console.log('📊 Category data received:', categoryDataRaw);
      
      if (!categoryResponse.ok) {
        console.error('❌ Category API error:', categoryDataRaw);
        // Set empty data instead of throwing error to prevent crashes
        setCategoryData([]);
      } else {
        // Transform for category list (top 5)
        const sortedCategories = (categoryDataRaw || [])
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 5)
          .map(item => ({
            name: item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Unknown',
            count: item.count || 0
          }));
        setCategoryData(sortedCategories);
      }

      // Fetch forum posts trend for line chart
      console.log('📈 Fetching forum posts trend...');
      const trendResponse = await fetch(`${API_BASE_URL}/stats/forum-posts-trend`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });
      
      console.log('📊 Trend response status:', trendResponse.status);
      const trendData = await trendResponse.json();
      console.log('📉 Trend data received:', trendData);
      
      if (!trendResponse.ok) {
        console.error('❌ Trend API error:', trendData);
        // Set empty data instead of throwing error
        setLineChartData([]);
      } else {
        setLineChartData(trendData);
      }

      // Fetch guides and terms by category for bar chart
      console.log('📚 Fetching guides and terms data...');
      const guidesResponse = await fetch(`${API_BASE_URL}/stats/guides-and-terms-by-category`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });
      
      console.log('📖 Guides response status:', guidesResponse.status);
      const guidesData = await guidesResponse.json();
      console.log('📚 Guides data received:', guidesData);
      
      if (!guidesResponse.ok) {
        console.error('❌ Guides API error:', guidesData);
        // Set empty data instead of throwing error to prevent crashes
        setBarChartData([]);
      } else {
        // Transform and assign colors
        const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#2563EB', '#1D4ED8'];
        const transformedBarData = (guidesData || [])
          .filter(item => item && item.category && item.category !== 'others')
          .map((item, index) => ({
            category: item.category.charAt(0).toUpperCase() + item.category.slice(1) + ' Law',
            count: item.count || 0,
            color: colors[index % colors.length]
          }));
        setBarChartData(transformedBarData);
      }

      // Calculate pie chart data for user distribution
      const totalUsers = summaryData.seekersCount + summaryData.lawyersCount;
      const seekersPercentage = totalUsers > 0 
        ? Math.round((summaryData.seekersCount / totalUsers) * 100) 
        : 0;
      const lawyersPercentage = totalUsers > 0 
        ? Math.round((summaryData.lawyersCount / totalUsers) * 100) 
        : 0;

      setPieChartData([
        { 
          name: 'Legal Seekers', 
          value: seekersPercentage, 
          count: summaryData.seekersCount, 
          color: '#3B82F6' 
        },
        { 
          name: 'Verified Lawyers', 
          value: lawyersPercentage, 
          count: summaryData.lawyersCount, 
          color: '#60A5FA' 
        },
      ]);

      console.log('✅ Dashboard data fetch completed successfully!');
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="p-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading dashboard data...</div>
        </div>
      ) : (
        <>
          {/* Top Row - Metrics Cards */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => (
              <div key={index} className="p-4 bg-blue-100 border border-blue-300 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-black">{metric.title}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-black">{metric.value.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Section */}
          <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-3">
            {/* Line Chart - Legal Consultations */}
            <div className="p-6 border border-gray-300 lg:col-span-2 bg-gray-50 rounded-xl">
              <h3 className="mb-8 text-base font-semibold text-gray-900">Forum Posts Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category List */}
            <div className="p-6 border border-gray-300 bg-gray-50 rounded-xl">
              <h3 className="mb-3 text-base font-semibold text-gray-900">Category with Highest Post Count</h3>
              <div className="space-y-2">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center justify-between py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full">
                        <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-900">{category.name}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-right">
                      <span className="text-xs font-semibold text-gray-900">
                        {category.count}
                      </span>
                      <span className="text-xs text-gray-500">posts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Bar Chart - Category Distribution */}
            <div className="p-6 border border-gray-300 bg-gray-50 rounded-xl">
              <h3 className="mb-8 text-base font-semibold text-gray-900">Category Distribution (Guides & Terms)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[8, 8, 0, 0]}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - User Distribution */}
            <div className="p-6 border border-gray-300 bg-gray-50 rounded-xl">
              <h3 className="mb-4 text-base font-semibold text-gray-900">User Distribution</h3>
              <div className="flex items-center space-x-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => {
                        const entry = props.payload;
                        return [`${entry.count} users`, entry.name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {pieChartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
