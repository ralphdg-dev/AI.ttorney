import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import Header from './components/Header';
import Login from './pages/auth/Login';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
  const [activeItem, setActiveItem] = React.useState('dashboard');

  const handleNavItemClick = (itemId) => {
    if (itemId === 'logout') {
      // Logout will be handled by the Sidebar component
      return;
    }
    setActiveItem(itemId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar
          activeItem={activeItem}
          onItemClick={handleNavItemClick}
        />
        <div className="flex-1 flex flex-col">
          <Header activeItem={activeItem} />
          <MainContent activeItem={activeItem} />
        </div>
      </div>
    </div>
  );
};

export default App;