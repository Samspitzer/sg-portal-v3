import {
  Receipt,
  LayoutDashboard,
  FileText,
  Mail,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PanelTile {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  description?: string;
}

export const ACCOUNTING_PANEL = {
  id: 'accounting',
  name: 'Accounting',
  basePath: '/accounting',
  icon: Receipt,
  tiles: [
    // Add tiles here - they'll automatically appear in SideRibbon AND header dropdown
  ] as PanelTile[],
};