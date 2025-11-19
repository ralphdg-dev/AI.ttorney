import React from 'react';

const NavItem = ({ icon: Icon, label, isActive = false, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
      isActive 
        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon size={20} className={isActive ? 'text-blue-700' : 'text-gray-500'} />
    <span className="font-medium">{label}</span>
  </button>
);

export default NavItem;