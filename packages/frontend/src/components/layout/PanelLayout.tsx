import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { SideRibbon } from './SideRibbon';

interface PanelLayoutProps {
  panelId: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds SideRibbon to any panel
 * Usage: <PanelLayout panelId="accounting">{children}</PanelLayout>
 */
export function PanelLayout({ panelId, children, className }: PanelLayoutProps) {
  return (
    <div className={clsx('flex h-[calc(100vh-var(--header-height))]', className)}>
      <SideRibbon panelId={panelId} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// Pre-configured panel layouts for convenience
export function AccountingLayout({ children }: { children: ReactNode }) {
  return <PanelLayout panelId="accounting">{children}</PanelLayout>;
}

export function ProjectsLayout({ children }: { children: ReactNode }) {
  return <PanelLayout panelId="projects">{children}</PanelLayout>;
}

export function EstimatingLayout({ children }: { children: ReactNode }) {
  return <PanelLayout panelId="estimating">{children}</PanelLayout>;
}

export function CustomersLayout({ children }: { children: ReactNode }) {
  return <PanelLayout panelId="customers">{children}</PanelLayout>;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return <PanelLayout panelId="admin">{children}</PanelLayout>;
}