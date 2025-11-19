export interface LegalCategory {
  id: string;
  label: string;
}

// Shared categories used by Legal Guides, Legal Terms, and Create Post
export const LEGAL_CATEGORIES: LegalCategory[] = [
  { id: 'family', label: 'Family' },
  { id: 'labor', label: 'Labor' },
  { id: 'civil', label: 'Civil' },
  { id: 'criminal', label: 'Criminal' },
  { id: 'consumer', label: 'Consumer' },
  { id: 'others', label: 'Others' },
];
