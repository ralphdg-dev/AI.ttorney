import React from 'react';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';


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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar 
          activeItem={activeItem} 
          onItemClick={handleNavItemClick} 
        />
        <MainContent activeItem={activeItem} />
      </div>
    </div>
  );
};

export default App;