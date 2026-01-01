import {
  Settings,
  Users,
  Building2,
  Shield,
} from 'lucide-react';
import type { PanelTile } from './accounting';

export const ADMIN_PANEL = {
  id: 'admin',
  name: 'Admin',
  basePath: '/admin',
  icon: Settings,
  tiles: [
    { id: 'users', name: 'Manage Users', path: '/admin/users', icon: Users, description: 'Manage user accounts' },
    { id: 'company', name: 'Company Settings', path: '/admin/company', icon: Building2, description: 'Company information' },
    { id: 'permissions', name: 'Permissions', path: '/admin/permissions', icon: Shield, description: 'Role permissions' },
  ] as PanelTile[],
};