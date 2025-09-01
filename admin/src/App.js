import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import Header from './components/Header';
import Login from './pages/auth/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Toaster from './components/Toaster';
import { useToast } from './context/ToastContext';

function ProtectedLayout({ activeItem, onItemClick }) {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading...</div>;
  }
  if (!isAuthenticated) {
    return null; // Redirect handled by effect; avoids flicker
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeItem={activeItem} onItemClick={onItemClick} />
        <div className="flex-1 flex flex-col">
          <Header activeItem={activeItem} />
          <MainContent activeItem={activeItem} />
        </div>
      </div>
    </div>
  );
}

const App = () => {
  const [activeItem, setActiveItem] = React.useState('dashboard');
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleNavItemClick = (itemId) => {
    if (itemId === 'logout') {
      logout();
      navigate('/login', { replace: true });
      toast.success('Logged out');
      return;
    }
    setActiveItem(itemId);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={<ProtectedLayout activeItem={activeItem} onItemClick={handleNavItemClick} />}
      />
    </Routes>
  );
};

export default function AppWithProviders() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
        <Toaster />
      </ToastProvider>
    </BrowserRouter>
  );
}

export { App };