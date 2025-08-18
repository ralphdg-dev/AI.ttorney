export interface Lawyer {
  id: number;
  name: string;
  specialization: string;
  location: string;
  hours: string;
  days: string;
  available: boolean;
}

export interface Tab {
  id: string;
  label: string;
}

export interface NavItem {
  id: string;
  icon: string;
  activeIcon: string;
}