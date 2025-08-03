import React from 'react';

const MainContent = ({ activeItem }) => {
  const getContentForItem = () => {
    switch (activeItem) {
      case 'dashboard':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-blue-600">1,234</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Active Tickets</h3>
                <p className="text-3xl font-bold text-green-600">56</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">System Status</h3>
                <p className="text-3xl font-bold text-emerald-600">Healthy</p>
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Users</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">User management interface would go here.</p>
              </div>
            </div>
          </div>
        );
      case 'admin':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">Admin controls and settings would go here.</p>
              </div>
            </div>
          </div>
        );
      case 'report-tickets':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Tickets</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">Ticket reporting system would go here.</p>
              </div>
            </div>
          </div>
        );
      case 'legal-glossary':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Legal Glossary</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">Legal terms and definitions would go here.</p>
              </div>
            </div>
          </div>
        );
      case 'legal-guide':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Legal Guide</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">Legal guidance and resources would go here.</p>
              </div>
            </div>
          </div>
        );
      case 'forum':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Forum</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">Community forum would go here.</p>
              </div>
            </div>
          </div>
        );
      case 'system-health':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">System Health</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">System monitoring and health metrics would go here.</p>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">Application settings would go here.</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6">
                <p className="text-gray-600">Select an item from the navigation menu.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="flex-1 bg-gray-50 p-8">
      {getContentForItem()}
    </main>
  );
};

export default MainContent;