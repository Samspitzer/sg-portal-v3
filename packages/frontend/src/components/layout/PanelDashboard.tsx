import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/common';

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

const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
  brand: {
    bg: 'bg-brand-100 dark:bg-brand-900/30',
    icon: 'text-brand-600 dark:text-brand-400',
    hover: 'hover:border-brand-300 dark:hover:border-brand-700',
  },
  accent: {
    bg: 'bg-accent-100 dark:bg-accent-900/30',
    icon: 'text-accent-600 dark:text-accent-400',
    hover: 'hover:border-accent-300 dark:hover:border-accent-700',
  },
  success: {
    bg: 'bg-success-100 dark:bg-success-900/30',
    icon: 'text-success-600 dark:text-success-400',
    hover: 'hover:border-success-300 dark:hover:border-success-700',
  },
  warning: {
    bg: 'bg-warning-100 dark:bg-warning-900/30',
    icon: 'text-warning-600 dark:text-warning-400',
    hover: 'hover:border-warning-300 dark:hover:border-warning-700',
  },
  danger: {
    bg: 'bg-danger-100 dark:bg-danger-900/30',
    icon: 'text-danger-600 dark:text-danger-400',
    hover: 'hover:border-danger-300 dark:hover:border-danger-700',
  },
};

export function PanelDashboard({ 
  title, 
  description, 
  icon: Icon, 
  tiles,
  iconGradient = 'from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800'
}: PanelDashboardProps) {
  return (
    <div className="p-6">
      {/* Panel Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4">
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
      </motion.div>

      {/* Divider */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-8" />

      {/* Tiles Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {tiles.map((tile, index) => {
  const colorKey = tile.color || 'brand';
  const colors = colorClasses[colorKey] ?? colorClasses.brand;
  
  // Safety check - should never happen but satisfies TypeScript
  if (!colors) return null;
          return (
            <motion.div
              key={tile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.1 }}
            >
              <Link to={tile.path}>
                <Card
                  hover
                  className={clsx(
                    'h-full transition-all duration-200 border-2 border-transparent',
                    colors.hover
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className={clsx(
                        'w-14 h-14 rounded-xl flex items-center justify-center',
                        colors.bg
                      )}>
                        <tile.icon className={clsx('w-7 h-7', colors.icon)} />
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    </div>
                    
                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                      {tile.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {tile.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}