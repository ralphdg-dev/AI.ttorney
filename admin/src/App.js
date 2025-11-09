import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/auth/Login';
import VerifyOTP from './pages/auth/VerifyOTP';

// Import all page components
import Dashboard from './pages/Dashboard';
import ManageLegalSeekers from './pages/users/ManageLegalSeekers';
import ManageLawyers from './pages/users/ManageLawyers';
import ManageLawyerApplications from './pages/users/ManageLawyerApplications';
import ManageAdminsPage from './pages/admin/ManageAdmins';
import ManageAuditLogs from './pages/system/ManageAuditLogs';
import ManageGlossaryTerms from './pages/legal-resources/ManageGlossaryTerms';
import ManageAppeals from './pages/moderation/ManageAppeals';
import ManageLegalArticles from './pages/legal-resources/ManageLegalArticles';

// Forum Management Pages
import ManageTopicsThreadsPage from "./pages/forum/ManageTopicsThreadsPage";
import ReportedPostsPage from "./pages/forum/ReportedPostsPage";
import ReportedRepliesPage from "./pages/forum/ReportedRepliesPage";
import BanRestrictUsersPage from "./pages/forum/BanRestrictUsersPage";

import ManageAppealsPage from "./pages/appeals/ManageAppeals"

// Settings Page
import Settings from "./pages/Settings";

// Placeholder components for missing pages

const Help = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Help & Support</h1>
    <p className="text-gray-600">Help documentation coming soon...</p>
  </div>
);

const LegalArticles = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">
      Manage Legal Articles
    </h1>
    <p className="text-gray-600">Legal articles management coming soon...</p>
  </div>
);


const OpenTickets = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Open Tickets</h1>
    <p className="text-gray-600">Open tickets management coming soon...</p>
  </div>
);

const AssignedTickets = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Assigned Tickets</h1>
    <p className="text-gray-600">Assigned tickets management coming soon...</p>
  </div>
);

const TicketHistory = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Ticket History</h1>
    <p className="text-gray-600">Ticket history coming soon...</p>
  </div>
);

const UserAnalytics = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">User Analytics</h1>
    <p className="text-gray-600">User analytics coming soon...</p>
  </div>
);

const ContentAnalytics = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Content Analytics</h1>
    <p className="text-gray-600">Content analytics coming soon...</p>
  </div>
);

const ForumAnalytics = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">Forum Analytics</h1>
    <p className="text-gray-600">Forum analytics coming soon...</p>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

const AdminDashboard = () => {
  const location = useLocation();

  // Get active item from current path
  const getActiveItemFromPath = (pathname) => {
    if (pathname === "/" || pathname === "/dashboard") return "dashboard";
    if (pathname === "/users/legal-seekers") return "manage-legal-seekers";
    if (pathname === "/users/lawyers") return "manage-lawyers";
    if (pathname === "/users/lawyer-applications") return "lawyer-applications";
    if (pathname === "/admin/manage-admins") return "manage-admins";
    if (pathname === "/admin/audit-logs") return "audit-logs";
    if (pathname === "/legal-resources/glossary-terms")
      return "manage-glossary-terms";
    if (pathname === "/legal-resources/legal-articles")
      return "manage-legal-articles";
    if (pathname === "/forum/topics-threads") return "manage-topics-threads";
    if (pathname === "/forum/reported-posts") return "reported-posts";
    if (pathname === "/forum/reported-replies") return "reported-replies";
    if (pathname === "/appeals/ban-restrict-users") return "ban-restrict-users";
    if (pathname === "/settings") return "settings";
    if (pathname === "/help") return "help";
    return "dashboard";
  };

  const activeItem = getActiveItemFromPath(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeItem={activeItem} />
        <div className="flex-1 flex flex-col">
          <Header activeItem={activeItem} />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Users Routes */}
              <Route
                path="/users/legal-seekers"
                element={<ManageLegalSeekers />}
              />
              <Route path="/users/lawyers" element={<ManageLawyers />} />
              <Route path="/users/lawyer-applications" element={<ManageLawyerApplications />} />
              
              {/* Moderation Routes */}
              <Route path="/moderation/appeals" element={<ManageAppeals />} />
              
              {/* Admin Routes */}
              <Route
                path="/admin/manage-admins"
                element={<ManageAdminsPage />}
              />
              <Route path="/admin/audit-logs" element={<ManageAuditLogs />} />

              {/* Legal Resources Routes */}
              <Route path="/legal-resources/glossary-terms" element={<ManageGlossaryTerms />} />
              <Route path="/legal-resources/legal-articles" element={<ManageLegalArticles />} />
              
              {/* Forum Routes */}
              <Route
                path="/forum/topics-threads"
                element={<ManageTopicsThreadsPage />}
              />
              <Route
                path="/forum/reported-posts"
                element={<ReportedPostsPage />}
              />
              <Route
                path="/forum/reported-replies"
                element={<ReportedRepliesPage />}
              />

              {/* Appeals Routes */}
              <Route
                path="/appeals/ban-restrict-users"
                element={<BanRestrictUsersPage />}
              />

              <Route
                path="/appeals/manage-appeals"
                element={<ManageAppealsPage />}
              />

              {/* Other Routes */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
