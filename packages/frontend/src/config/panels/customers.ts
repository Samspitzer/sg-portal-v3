import { Users, Building2, Contact } from 'lucide-react';
import type { PanelTile } from './accounting';

export const CUSTOMERS_PANEL = {
  id: 'customers',
  name: 'Customers',
  basePath: '/clients',
  icon: Users,
  tiles: [
    {
      id: 'companies',
      name: 'Companies',
      path: '/clients/companies',
      icon: Building2,
      description: 'Manage client companies',
    },
    {
      id: 'contacts',
      name: 'Contacts',
      path: '/clients/contacts',
      icon: Contact,
      description: 'Manage client contacts',
    },
  ] as PanelTile[],
};