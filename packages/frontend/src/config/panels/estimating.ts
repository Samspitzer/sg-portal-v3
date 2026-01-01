import {
  Calculator,
  LayoutDashboard,
  Users,
  FileStack,
  Send,
} from 'lucide-react';
import type { PanelTile } from './accounting';

export const ESTIMATING_PANEL = {
  id: 'estimating',
  name: 'Estimating',
  basePath: '/estimates',
  icon: Calculator,
  tiles: [] as PanelTile[],
};