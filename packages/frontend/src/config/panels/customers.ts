import {
  Users,
  LayoutDashboard,
  Building2,
  UserPlus,
  History,
} from 'lucide-react';
import type { PanelTile } from './accounting';

export const CUSTOMERS_PANEL = {
  id: 'customers',
  name: 'Customers',
  basePath: '/clients',
  icon: Users,
  tiles: [] as PanelTile[],
};