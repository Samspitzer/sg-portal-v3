import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

export interface PanelDashboardTile {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color?: 'brand' | 'accent' | 'success' | 'warning' | 'danger';
}

interface PanelDashboardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  tiles: PanelDashboardTile[];
  iconGradient?: string;
}

// Gradient colors for tiles matching landing page style
const colorGradients: Record<string, { gradient: string }> = {
  brand: { gradient: 'from-blue-500 to-blue-600' },
  accent: { gradient: 'from-violet-500 to-violet-600' },
  success: { gradient: 'from-emerald-500 to-emerald-600' },
  warning: { gradient: 'from-amber-500 to-amber-600' },
  danger: { gradient: 'from-rose-500 to-rose-600' },
};

export function PanelDashboard({ 
  title, 
  description, 
  icon: Icon, 
  tiles,
  iconGradient = 'from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800'
}: PanelDashboardProps) {
  const navigate = useNavigate();

  // Keyboard shortcuts for tiles (1-9)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = parseInt(e.key);
      if (key >= 1 && key <= tiles.length && key <= 9) {
        const tile = tiles[key - 1];
        if (tile) {
          navigate(tile.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, tiles]);

  // Determine grid layout based on number of tiles
  const getGridClass = () => {
    if (tiles.length <= 2) return 'grid-cols-1 sm:grid-cols-2 max-w-2xl';
    if (tiles.length <= 3) return 'grid-cols-1 sm:grid-cols-3 max-w-4xl';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-6xl';
  };

  return (
    <div className="p-6">
      {/* Container card - includes header and tiles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
      >
        {/* Panel Header - inside the card */}
        <div className="flex items-center gap-4 mb-6">
          <div className={clsx(
            'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg',
            iconGradient
          )}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-slate-200 dark:border-slate-700 mb-6" />

        {/* Tiles Grid - centered */}
        <div className={clsx('grid gap-4 mx-auto', getGridClass())}>
          {tiles.map((tile, index) => {
            const colorKey = tile.color && colorGradients[tile.color] ? tile.color : 'brand';
            const colors = colorGradients[colorKey]!;
            
            return (
              <motion.button
                key={tile.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index, duration: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(tile.path)}
                className="group flex flex-col items-center justify-center text-center p-6 rounded-xl transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 relative min-h-[160px]"
              >
                {/* Keyboard shortcut hint */}
                <span className="absolute top-3 right-3 w-5 h-5 rounded text-[10px] font-medium text-slate-300 dark:text-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {index + 1}
                </span>

                {/* Icon with gradient */}
                <div className={clsx(
                  'w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br transition-all duration-200 group-hover:shadow-xl group-hover:scale-110 mb-4',
                  colors.gradient
                )}>
                  <tile.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-semibold text-slate-800 dark:text-white text-base mb-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {tile.name}
                </h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 leading-snug group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                  {tile.description}
                </p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}