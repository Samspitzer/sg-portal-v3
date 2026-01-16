import { CheckSquare } from 'lucide-react';
import type { PanelTile } from './accounting';

export const TASKS_PANEL = {
  id: 'tasks',
  name: 'Tasks',
  basePath: '/tasks',
  icon: CheckSquare,
  tiles: [
    {
      id: 'tasks',
      name: 'Tasks',
      path: '/tasks',
      icon: CheckSquare,
      description: 'Manage tasks and activities',
    },
  ] as PanelTile[],
};