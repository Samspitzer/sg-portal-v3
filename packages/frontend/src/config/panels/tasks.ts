import { CheckSquare } from 'lucide-react';
import type { PanelTile } from './accounting';

export const TASKS_PANEL = {
  id: 'tasks',
  name: 'Tasks',
  basePath: '/tasks',
  icon: CheckSquare,
  tiles: [] as PanelTile[], // Empty - single page panel, no sub-navigation needed
};