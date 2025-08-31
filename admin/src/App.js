import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import Header from './components/Header';
import Login from './pages/auth/Login';

const App = () => {
  const [activeItem, setActiveItem] = React.useState('dashboard');

  const handleNavItemClick = (itemId) => {
    if (itemId === 'logout') {
      console.log('Logout clicked');
      return;
    }
    setActiveItem(itemId);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
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
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;