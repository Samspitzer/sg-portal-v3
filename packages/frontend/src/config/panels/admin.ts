import {
  Settings,
  Users,
  Building2,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import type { PanelTile } from './accounting';

export const ADMIN_PANEL = {
  id: 'admin',
  name: 'Admin',
  basePath: '/admin',
  icon: Settings,
  tiles: [
    { id: 'users', name: 'Manage Users', path: '/admin/users', icon: Users, description: 'Manage user accounts' },
    { id: 'fields', name: 'Field Settings', path: '/admin/fields', icon: SlidersHorizontal, description: 'Departments, positions & dropdowns' },
    { id: 'permissions', name: 'Permissions', path: '/admin/permissions', icon: Shield, description: 'Panel access control' },
    { id: 'company', name: 'Company Settings', path: '/admin/company', icon: Building2, description: 'Company information' },
  ] as PanelTile[],
};