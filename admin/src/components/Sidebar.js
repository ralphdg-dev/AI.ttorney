import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, AlertTriangle, LogOut, Settings } from 'lucide-react';
import { sections } from './menuConfig';
import { useAuth } from '../contexts/AuthContext';

// sections now imported from menuConfig

const Avatar = () => {
  const { admin } = useAuth();
  
  return (
    <div className="flex items-center space-x-3">
      <img
        src="https://i.pravatar.cc/100?img=5"
        alt="avatar"
        className="h-10 w-10 rounded-full object-cover"
      />
      <div className="leading-tight">
        <p className="text-[10px] text-gray-500 uppercase">{admin?.role || 'ADMIN'}</p>
        <p className="text-[11px] font-semibold text-gray-900">{admin?.full_name || 'Admin User'}</p>
      </div>
    </div>
  );
};

const Sidebar = ({ activeItem }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState({});
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Map menu item IDs to routes
  const getRouteForItem = (itemId) => {
    switch (itemId) {
      case 'dashboard': return '/dashboard';
      case 'manage-legal-seekers': return '/users/legal-seekers';
      case 'manage-lawyers': return '/users/lawyers';
      case 'lawyer-applications': return '/users/lawyer-applications';
      case 'suspended-accounts': return '/users/suspended-accounts';
      case 'manage-admins': return '/admin/manage-admins';
      case 'audit-logs': return '/admin/audit-logs';
      case 'manage-glossary-terms': return '/legal-resources/glossary-terms';
      case 'manage-legal-articles': return '/legal-resources/legal-articles';
      case 'manage-topics-threads': return '/forum/topics-threads';
      case 'reported-posts': return '/forum/reported-posts';
      case 'ban-restrict-users': return '/forum/ban-restrict-users';
      case 'open-tickets': return '/tickets/open';
      case 'assigned-tickets': return '/tickets/assigned';
      case 'ticket-history': return '/tickets/history';
      case 'user-analytics': return '/analytics/users';
      case 'content-analytics': return '/analytics/content';
      case 'forum-analytics': return '/analytics/forum';
      case 'settings': return '/settings';
      case 'help': return '/help';
      default: return '/dashboard';
    }
  };

  const handleItemClick = async (itemId) => {
    if (itemId === 'logout') {
      await logout();
      return;
    }
    
    const route = getRouteForItem(itemId);
    navigate(route);
  };

  const toggleGroup = (label) =>
    setOpenGroups((s) => ({ ...s, [label]: !s[label] }));

  const renderGroup = (group) => {
    const Icon = group.icon || Home;
    const isOpen = !!openGroups[group.label];

    return (
      <div key={group.label} className="mb-2">
        <button
          className={`w-full flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50 text-[11px]`}
          onClick={() => (collapsed ? null : toggleGroup(group.label))}
          title={collapsed ? group.label : undefined}
        >
          <div className={`flex items-center ${collapsed ? '' : 'space-x-2'}`}>
            <Icon size={16} className="text-gray-600" />
            {!collapsed && <span className="text-[11px] font-medium">{group.label}</span>}
          </div>
          {!collapsed && (
            <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
              <ChevronRight size={16} className="text-gray-500" />
            </span>
          )}
        </button>

        {/* Items */}
        {!collapsed && isOpen && (
          <div className="relative mt-1 ml-9 after:content-[''] after:absolute after:left-0 after:top-0 after:bottom-0 after:border-l after:border-gray-200">
            {group.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`relative w-full text-left px-3 py-1 my-0.5 rounded-md ml-2 text-[10px] ${
                  activeItem === item.id
                    ? 'bg-gray-50 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
            {/* Cover the lower half of the stem so it ends at the midpoint of the last item */}
            <div className="pointer-events-none absolute left-0 bottom-0 w-[2px] h-3 bg-white" />
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`h-screen sticky top-0 bg-white shadow-sm border-r border-gray-200 flex flex-col relative ${
        collapsed ? 'w-16' : 'w-56'
      } transition-all duration-200`}
    >
      {/* Floating collapse/expand toggle */}
      <button
        className="absolute -right-3 top-10 z-20 h-9 w-9 flex items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-md hover:shadow-lg text-gray-800"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        {collapsed ? (
          <div className="h-10 w-10 rounded-full overflow-hidden">
            <img src="https://i.pravatar.cc/100?img=5" alt="avatar" />
          </div>
        ) : (
          <Avatar />
        )}
        {/* toggle moved to floating button */}
      </div>
      {/* Header divider */}
      <div className="mx-3 border-t border-gray-200" />

      <div className="px-3 mt-2 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            <p className={`px-2 text-[8px] tracking-widest text-gray-400 ${collapsed ? 'text-center' : ''}`}>
              {section.title}
            </p>
            {/* Dashboard button under MAIN */}
            {section.id === 'main' && (
              <div className="mt-2">
                <button
                  onClick={() => handleItemClick('dashboard')}
                  className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start space-x-2'} px-3 py-1.5 rounded-lg text-[11px] ${
                    activeItem === 'dashboard'
                      ? 'bg-gray-50 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={collapsed ? 'Dashboard' : undefined}
                >
                  <Home size={16} className="text-gray-600" />
                  {!collapsed && <span className="text-[11px] font-medium">Dashboard</span>}
                </button>
              </div>
            )}
            {/* Section content */}
            {section.id === 'account' ? (
              <div className="mt-2">
                <button
                  onClick={() => handleItemClick('settings')}
                  className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start space-x-2'} px-3 py-1.5 rounded-lg text-[11px] ${
                    activeItem === 'settings'
                      ? 'bg-gray-50 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={collapsed ? 'Settings' : undefined}
                >
                  <Settings size={16} className="text-gray-600" />
                  {!collapsed && <span className="text-[11px] font-medium">Settings</span>}
                </button>
              </div>
            ) : (
              <div className={`mt-2 ${collapsed ? 'space-y-3' : ''}`}>
                {section.groups.map((g) => renderGroup(g))}
              </div>
            )}
            {/* Divider between MAIN and ACCOUNT */}
            {section.id === 'main' && (
              <div className="my-3 border-t border-gray-200" />
            )}
          </div>
        ))}
      </div>

      {/* Footer actions when expanded/collapsed */}
      <div className="mt-auto p-3">
        <button
          onClick={() => handleItemClick('help')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start space-x-3'} px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50`}
          title={collapsed ? 'Help' : undefined}
        >
          <AlertTriangle size={18} />
          {!collapsed && <span className="text-[10px]">Help</span>}
        </button>
        <button
          onClick={() => handleItemClick('logout')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start space-x-3'} px-3 py-1.5 mt-2 rounded-lg text-red-600 hover:bg-red-50`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-[10px] font-medium">Logout Account</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;