import React from 'react';
import { User } from 'lucide-react';
import logo from '../assets/images/logo.png';

const Header = ({ username }) => (
  <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
    <div className="flex items-center space-x-3">
      <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
        <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900">Ai.ttorney</h1>
    </div>
    <div className="flex items-center space-x-4">
      <span className="text-lg font-medium text-gray-700">Hi, {username}!</span>
      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
        <User size={18} className="text-gray-600" />
      </div>
    </div>
  </header>
);

export default Header;