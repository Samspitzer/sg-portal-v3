import { Handshake } from 'lucide-react';
import type { PanelTile } from './accounting';

export const SALES_PANEL = {
  id: 'sales',
  name: 'Sales',
  basePath: '/sales',
  icon: Handshake,
  tiles: [
    {
      id: 'pipeline',
      name: 'Pipeline',
      path: '/sales/pipeline',
      icon: Handshake,
      description: 'Sales pipeline and opportunities',
    },
    {
      id: 'leads',
      name: 'Leads',
      path: '/sales/leads',
      icon: Handshake,
      description: 'Manage leads and prospects',
    },
    {
      id: 'activities',
      name: 'Activities',
      path: '/sales/activities',
      icon: Handshake,
      description: 'Sales activities and follow-ups',
    },
  ] as PanelTile[],
};