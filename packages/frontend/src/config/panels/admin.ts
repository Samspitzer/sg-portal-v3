import {
  Settings,
  Users,
  Building2,
  Shield,
  Briefcase,
} from 'lucide-react';
import type { PanelTile } from './accounting';

export const ADMIN_PANEL = {
  id: 'admin',
  name: 'Admin',
  basePath: '/admin',
  icon: Settings,
  tiles: [
    { id: 'users', name: 'Manage Users', path: '/admin/users', icon: Users, description: 'Manage user accounts' },
    { id: 'departments', name: 'Departments', path: '/admin/departments', icon: Briefcase, description: 'Departments & positions' },
    { id: 'roles', name: 'Roles', path: '/admin/roles', icon: Shield, description: 'Roles & permissions' },
    { id: 'company', name: 'Company Settings', path: '/admin/company', icon: Building2, description: 'Company information' },
  ] as PanelTile[],
};