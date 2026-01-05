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
  /**
   * When true, children fill remaining viewport height and handle their own scrolling.
   * The page itself won't scroll - useful for pages with DataTable.
   * Other pages without fillHeight will scroll normally.
   */
  fillHeight?: boolean;
}

export function Page({ title, description, actions, children, className, centered, fillHeight }: PageProps) {
  // Calculate available height for content when fillHeight is true
  // This accounts for: header (var(--header-height)) + page padding (24px top + 24px gap) + title area (~60px) + divider
  // Approximate: header + 24px padding + 60px title + 16px gap + 1px divider = ~100px below header
  const contentHeight = fillHeight ? 'calc(100vh - var(--header-height) - 130px)' : undefined;

  return (
    <div className={clsx('', className)}>
      {/* Sticky Page header - stays at top while content scrolls */}
      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 px-6 pt-6 pb-6">
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
        <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
      </div>

      {/* Page content - scrolls under the sticky header */}
      <div 
        className="px-6 pb-6"
        style={contentHeight ? { height: contentHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
}