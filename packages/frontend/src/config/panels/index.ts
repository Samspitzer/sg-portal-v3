import type { LucideIcon } from 'lucide-react';

export type { PanelTile } from './accounting';

export { ACCOUNTING_PANEL } from './accounting';
export { PROJECTS_PANEL } from './projects';
export { ESTIMATING_PANEL } from './estimating';
export { CUSTOMERS_PANEL } from './customers';
export { ADMIN_PANEL } from './admin';

// Master registry - import all panels
import { ACCOUNTING_PANEL } from './accounting';
import { PROJECTS_PANEL } from './projects';
import { ESTIMATING_PANEL } from './estimating';
import { CUSTOMERS_PANEL } from './customers';
import { ADMIN_PANEL } from './admin';

export interface PanelConfig {
  id: string;
  name: string;
  basePath: string;
  icon: LucideIcon;
  tiles: import('./accounting').PanelTile[];
}

// All panels in one place
export const PANELS: Record<string, PanelConfig> = {
  accounting: ACCOUNTING_PANEL,
  projects: PROJECTS_PANEL,
  estimating: ESTIMATING_PANEL,
  customers: CUSTOMERS_PANEL,
  admin: ADMIN_PANEL,
};

// Helper to get a panel by ID
export function getPanel(panelId: string): PanelConfig | undefined {
  return PANELS[panelId];
}

// Helper to get panel tiles
export function getPanelTiles(panelId: string) {
  return PANELS[panelId]?.tiles || [];
}