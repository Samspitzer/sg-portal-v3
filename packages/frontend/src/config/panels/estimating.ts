import { Calculator, Truck, FileSignature, CheckSquare } from 'lucide-react';
import type { PanelTile } from './accounting';

export const ESTIMATING_PANEL = {
  id: 'estimating',
  name: 'Estimating',
  basePath: '/estimates',
  icon: Calculator,
  tiles: [
    {
      id: 'delivery',
      name: 'Delivery Projects',
      path: '/estimates/delivery',
      icon: Truck,
      description: 'Field delivery and service work estimates',
    },
    {
      id: 'contracts',
      name: 'Contract Projects',
      path: '/estimates/contracts',
      icon: FileSignature,
      description: 'Fixed-price, T&M and retainer contracts',
    },
    {
      id: 'tasks',
      name: 'Tasks',
      path: '/estimates/tasks',
      icon: CheckSquare,
      description: 'All tasks linked to estimating projects',
    },
  ] as PanelTile[],
};