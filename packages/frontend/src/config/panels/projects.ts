import { FolderKanban } from 'lucide-react';
import type { PanelTile } from './accounting';

export const PROJECTS_PANEL = {
  id: 'projects',
  name: 'Projects',
  basePath: '/projects',
  icon: FolderKanban,
  tiles: [] as PanelTile[],
};