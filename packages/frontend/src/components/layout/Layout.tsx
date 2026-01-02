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
  centered?: boolean;
}

export function Page({ title, description, actions, children, className, centered }: PageProps) {
  return (
    <div className={clsx('p-6 space-y-6', className)}>
      {/* Page header */}
      <div className={clsx(
        centered ? 'text-center' : 'flex items-start justify-between gap-4'
      )}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className={clsx(
              'mt-1 text-slate-500 dark:text-slate-400',
              centered && 'text-brand-500 dark:text-brand-400'
            )}>
              {description}
            </p>
          )}
        </div>
        {!centered && actions && (
          <div className="flex items-center gap-3">{actions}</div>
        )}
      </div>

      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}