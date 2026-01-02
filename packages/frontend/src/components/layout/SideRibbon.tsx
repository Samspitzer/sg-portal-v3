import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { getPanel } from '@/config/panels';
import { useSafeNavigate } from '@/hooks';
import type { LucideIcon } from 'lucide-react';

interface SideRibbonProps {
  panelId: string;
  className?: string;
}

// Extended tile type to handle the main panel link
interface SideRibbonTile {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  description?: string;
}

export function SideRibbon({ panelId, className }: SideRibbonProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  
  // Get panel config from the registry
  const panel = getPanel(panelId);
  const tiles = panel?.tiles || [];

  if (!panel) return null;

  // Create the main panel tile
  const mainTile: SideRibbonTile = {
    id: `${panelId}-main`,
    name: panel.name,
    path: panel.basePath,
    icon: panel.icon || LayoutDashboard,
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 48 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={clsx(
        'h-full flex flex-col',
        'bg-slate-50 dark:bg-slate-900',
        'border-r border-slate-200 dark:border-slate-700',
        className
      )}
    >
      {/* Collapse Toggle */}
      <div className="flex justify-end p-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            'p-1.5 rounded-md',
            'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
            'hover:bg-slate-200 dark:hover:bg-slate-800',
            'transition-colors'
          )}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {/* Main Panel Link - Always First */}
          <SideRibbonItem
            tile={mainTile}
            isCollapsed={isCollapsed}
            isActive={location.pathname === panel.basePath}
          />

          {/* Divider */}
          {tiles.length > 0 && (
            <li className="py-2">
              <div className={clsx(
                'border-t border-slate-200 dark:border-slate-700',
                isCollapsed ? 'mx-1' : 'mx-2'
              )} />
            </li>
          )}

          {/* Panel Tiles */}
          {tiles.map((tile) => (
            <SideRibbonItem
              key={tile.id}
              tile={tile}
              isCollapsed={isCollapsed}
              isActive={location.pathname === tile.path}
            />
          ))}
        </ul>
      </nav>

      {/* Panel Info Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-1000 dark:text-slate-400">
            {panel.name} Panel
          </p>
        </div>
      )}
    </motion.aside>
  );
}

// Individual navigation item
interface SideRibbonItemProps {
  tile: SideRibbonTile;
  isCollapsed: boolean;
  isActive: boolean;
}

function SideRibbonItem({ tile, isCollapsed, isActive }: SideRibbonItemProps) {
  const Icon = tile.icon;
  const navigate = useSafeNavigate();

  return (
    <li>
      <button
        onClick={() => navigate(tile.path)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
          'transition-all duration-150',
          isActive
            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? tile.name : undefined}
      >
        <Icon className={clsx('flex-shrink-0', isCollapsed ? 'w-5 h-5' : 'w-4 h-4')} />
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden"
            >
              {tile.name}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </li>
  );
}

export default SideRibbon;