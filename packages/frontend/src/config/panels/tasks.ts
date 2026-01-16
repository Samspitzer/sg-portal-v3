import { CheckSquare, Calendar, List } from 'lucide-react';
import type { PanelTile } from './accounting';

export const TASKS_PANEL = {
  id: 'tasks',
  name: 'Tasks',
  basePath: '/tasks',
  icon: CheckSquare,
  tiles: [
    {
      id: 'my-tasks',
      name: 'My Tasks',
      path: '/tasks',
      icon: CheckSquare,
      description: 'Your assigned tasks',
    },
    {
      id: 'calendar',
      name: 'Calendar',
      path: '/tasks/calendar',
      icon: Calendar,
      description: 'Calendar view of tasks',
    },
    {
      id: 'list',
      name: 'List',
      path: '/tasks/list',
      icon: List,
      description: 'List view of tasks',
    },
  ] as PanelTile[],
};