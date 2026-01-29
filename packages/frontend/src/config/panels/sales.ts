import { 
  Handshake, 
  Target, 
  TrendingUp, 
  Activity, 
  Map,
  Inbox,
} from 'lucide-react';
import type { PanelTile } from './accounting';

export const SALES_PANEL = {
  id: 'sales',
  name: 'Sales',
  basePath: '/sales',
  icon: Handshake,
  tiles: [
    {
      id: 'leads',
      name: 'Leads',
      path: '/sales/leads',
      icon: Target,
      description: 'Manage leads and prospects',
    },
    {
      id: 'deals',
      name: 'Deals',
      path: '/sales/deals',
      icon: TrendingUp,
      description: 'Track deals and opportunities',
    },
    {
      id: 'activities',
      name: 'Activities',
      path: '/sales/activities',
      icon: Activity,
      description: 'Sales activities and follow-ups',
    },
    {
      id: 'routes',
      name: 'Routes',
      path: '/sales/routes',
      icon: Map,
      description: 'Plan sales rep routes',
      badge: 'Coming Soon',
    },
    {
      id: 'inbox',
      name: 'Inbox',
      path: '/sales/inbox',
      icon: Inbox,
      description: 'Sales email inbox',
      badge: 'Coming Soon',
    },
  ] as PanelTile[],
};
