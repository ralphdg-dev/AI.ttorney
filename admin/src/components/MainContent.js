import React from 'react';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import PlaceholderPage from '../pages/PlaceholderPage';
import ManageLegalSeekers from '../pages/users/ManageLegalSeekers';
import ManageLawyers from '../pages/users/ManageLawyers';
import ManageLawyerApplications from '../pages/users/ManageLawyerApplications';
import ManageAdmins from '../pages/users/ManageAdmins';
import ManageGlossaryTerms from '../pages/legal-resources/ManageGlossaryTerms';
import ManageLegalArticles from '../pages/legal-resources/ManageLegalArticles';
import Login from '../pages/auth/Login';
import { getBreadcrumbForItem } from '../components/menuConfig';

const MainContent = ({ activeItem }) => {
  const getContentForItem = () => {
    if (activeItem === 'dashboard') return <Dashboard />;
    if (activeItem === 'settings') return <Settings />;
    if (activeItem === 'manage-legal-seekers') return <ManageLegalSeekers />;
    if (activeItem === 'manage-lawyers') return <ManageLawyers />;
    if (activeItem === 'lawyer-applications') return <ManageLawyerApplications />;
    if (activeItem === 'manage-admins') return <ManageAdmins />;
    if (activeItem === 'manage-glossary-terms') return <ManageGlossaryTerms />;
    if (activeItem === 'manage-legal-articles') return <ManageLegalArticles />;
    if (activeItem === 'login') return <Login />;

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