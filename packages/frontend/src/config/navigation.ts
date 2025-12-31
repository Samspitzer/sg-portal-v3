import {
  Receipt,
  Users,
  FolderKanban,
  Settings,
  Calculator,
  LucideIcon,
} from 'lucide-react';

export interface NavSubItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

export interface NavPanel {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  items: NavSubItem[];
}

// This is the single source of truth for all panel navigation
// Adding items here will automatically update both the header dropdown AND the panel sidebar
export const panelNavigation: NavPanel[] = [
  {
    id: 'accounting',
    name: 'Accounting',
    path: '/accounting',
    icon: Receipt,
    items: [
      // Add sidebar items here later - they will appear in both header dropdown and sidebar
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    path: '/clients',
    icon: Users,
    items: [
      // Add sidebar items here later
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    items: [
      // Add sidebar items here later
    ],
  },
  {
    id: 'estimating',
    name: 'Estimating',
    path: '/estimates',
    icon: Calculator,
    items: [
      // Add sidebar items here later
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    path: '/admin',
    icon: Settings,
    items: [
      // Add sidebar items here later
    ],
  },
];

// Helper to get a specific panel's navigation
export const getPanelNav = (panelId: string) => {
  return panelNavigation.find((panel) => panel.id === panelId);
};