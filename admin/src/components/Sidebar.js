import React from 'react';
import { 
  Home, Users, UserCheck, Clock, BookOpen, FileText, 
  MessageSquare, Activity, Settings, LogOut 
} from 'lucide-react';
import NavItem from './NavItem';

const Sidebar = ({ activeItem, onItemClick }) => {
  const mainNavItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'admin', icon: UserCheck, label: 'Admin' },
    { id: 'report-tickets', icon: Clock, label: 'Report Tickets' },
    { id: 'legal-glossary', icon: BookOpen, label: 'Legal Glossary' },
    { id: 'legal-guide', icon: FileText, label: 'Legal Guide' },
    { id: 'forum', icon: MessageSquare, label: 'Forum' },
    { id: 'system-health', icon: Activity, label: 'System Health' }
  ];

  const bottomNavItems = [
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'logout', icon: LogOut, label: 'Logout' }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Make only the main nav scrollable */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeItem === item.id}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </nav>
      {/* Bottom nav stays fixed */}
      <div className="border-t border-gray-200 px-4 py-4 space-y-1">
        {bottomNavItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeItem === item.id}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;