import React from 'react';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import PlaceholderPage from '../pages/PlaceholderPage';
import { getBreadcrumbForItem } from '../components/menuConfig';

const MainContent = ({ activeItem }) => {
  const getContentForItem = () => {
    if (activeItem === 'dashboard') return <Dashboard />;
    if (activeItem === 'settings') return <Settings />;

    // Derive a sensible title from breadcrumbs (last segment)
    const crumbs = getBreadcrumbForItem(activeItem);
    const title = crumbs[crumbs.length - 1] || 'Welcome';
    return <PlaceholderPage title={title} />;
  };

  return (
    <main className="flex-1 bg-gray-50 p-8">
      {getContentForItem()}
    </main>
  );
};

export default MainContent;