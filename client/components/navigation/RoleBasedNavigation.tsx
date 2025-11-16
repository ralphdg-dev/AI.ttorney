import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LawyerNavbar from '../lawyer/shared/LawyerNavbar';
import Navbar from '../Navbar';

interface RoleBasedNavigationProps {
  activeTab?: string;
  lawyerActiveTab?: 'home' | 'forum' | 'consult' | 'chatbot' | 'profile';
  userActiveTab?: 'home' | 'directory' | 'guides' | 'glossary' | 'booklawyer';
}

const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
  activeTab,
  lawyerActiveTab,
  userActiveTab,
}) => {
  const { user, isLawyer } = useAuth();

  if (!user) {
    return null;
  }

  if (isLawyer()) {
    const lawyerTab = (lawyerActiveTab || activeTab || 'home') as 'home' | 'forum' | 'consult' | 'chatbot' | 'profile';
    return <LawyerNavbar activeTab={lawyerTab} />;
  }

  const userTab = (userActiveTab || activeTab || 'home') as 'home' | 'learn' | 'ask' | 'find' | 'profile';
  return <Navbar activeTab={userTab} />;
};

export default RoleBasedNavigation;
