import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { PanelHeader } from './PanelHeader';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Panel Header with navigation */}
      <PanelHeader />

      {/* Main content */}
      <main
        style={{ paddingTop: 'var(--header-height)' }}
        className="min-h-screen"
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Page wrapper component for consistent page layout
 * Use this for pages WITHOUT a SideRibbon (like Profile, Settings)
 */
interface PageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Page({ title, description, actions, children, className }: PageProps) {
  return (
    <div className={clsx('p-6 space-y-6', className)}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}