// ============================================================================
// EstimatesPage - Router
// Location: src/components/panels/EstimatesPage.tsx
// ============================================================================

import { Routes, Route } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { PanelDashboard } from '@/components/layout';
import { ESTIMATING_PANEL } from '@/config/panels/estimating';
import {
  DeliveryProjectsPage,
  ContractProjectsPage,
  DeliveryProjectDetailPage,
  ContractProjectDetailPage,
} from './estimating';

function EstimatingLandingPage() {
  return (
    <PanelDashboard
      title="Estimating"
      description="Build and manage delivery and contract project estimates."
      icon={Calculator}
      iconGradient="from-teal-500 to-teal-700 dark:from-teal-600 dark:to-teal-800"
      tiles={ESTIMATING_PANEL.tiles.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        icon: t.icon,
        path: t.path,
        color: 'accent' as const,
      }))}
    />
  );
}

export function EstimatesPage() {
  return (
    <Routes>
      <Route index element={<EstimatingLandingPage />} />
      <Route path="delivery" element={<DeliveryProjectsPage />} />
      <Route path="delivery/:id" element={<DeliveryProjectDetailPage />} />
      <Route path="contracts" element={<ContractProjectsPage />} />
      <Route path="contracts/:id" element={<ContractProjectDetailPage />} />
    </Routes>
  );
}

export default EstimatesPage;