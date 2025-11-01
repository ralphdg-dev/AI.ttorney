import { Users, Shield, BookOpen, MessageSquare, Scale } from 'lucide-react';

// Centralized menu configuration used by Sidebar and Header
export const sections = [
  {
    id: 'main',
    title: 'MAIN',
    groups: [
      {
        icon: Users,
        label: 'Users',
        items: [
          { id: 'manage-legal-seekers', label: 'Manage Legal Seekers' },
          { id: 'manage-lawyers', label: 'Manage Lawyers' },
          { id: 'lawyer-applications', label: 'Lawyer Applications' },
        ],
      },
      {
        icon: Shield,
        label: 'Admin',
        items: [
          { id: 'manage-admins', label: 'Manage Admins' },
          { id: 'audit-logs', label: 'Audit Logs' },
        ],
      },
      {
        icon: BookOpen,
        label: 'Legal Resources',
        items: [
          { id: 'manage-glossary-terms', label: 'Manage Glossary Terms' },
          { id: 'manage-legal-articles', label: 'Manage Legal Articles' },
        ],
      },
      {
        icon: MessageSquare,
        label: 'Forum',
        items: [
          { id: 'manage-topics-threads', label: 'Manage Topics & Threads' },
          { id: 'reported-posts', label: 'Reported Posts' },
          { id: 'reported-replies', label: 'Reported Replies' },
        ],
      },
      {
        icon: Scale,
        label: 'Appeals',
        items: [
          { id: 'ban-restrict-users', label: 'User Sanctions' },
        ],
      },
    ],
  },
  {
    id: 'account',
    groups: [
      {
        label: 'Settings',
        items: [
          { id: 'settings', label: 'Settings' },
        ],
      },
    ],
  },
];

export function getBreadcrumbForItem(activeItem) {
  if (!activeItem) return ['Welcome'];
  if (activeItem === 'dashboard') return ['Dashboard'];

  for (const section of sections) {
    for (const group of section.groups ?? []) {
      for (const item of group.items ?? []) {
        if (item.id === activeItem) {
          // Collapse duplicate labels like "Settings / Settings"
          if (group.label === item.label) return [item.label];
          return [group.label, item.label];
        }
      }
    }
  }
  return ['Welcome'];
}
