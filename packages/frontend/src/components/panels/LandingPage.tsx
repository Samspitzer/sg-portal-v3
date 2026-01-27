// =============================================================================
// LandingPage - Main landing/home page with module navigation
// Location: packages/frontend/src/components/panels/LandingPage.tsx
//
// REDESIGNED: Fluid grid layout, no scroll on desktop, responsive
// - Desktop: 2 rows of cards that fill the screen
// - Mobile: Allow scroll for smaller screens
// =============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Receipt,
  FolderKanban,
  FileText,
  Users,
  Settings,
  Code,
  Handshake,
  CheckSquare,
} from 'lucide-react';
import { useAuthStore, useCompanyStore } from '@/contexts';
import { Header } from '@/components/layout';
import { useDocumentTitle } from '@/hooks';

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  gradient: string;
  iconColor: string;
}

const modules: ModuleCard[] = [
  {
    id: 'accounting',
    title: 'Accounting',
    description: 'Invoices, reports & forecasting',
    icon: <Receipt className="w-8 h-8" />,
    path: '/accounting',
    gradient: 'from-emerald-500 to-emerald-600',
    iconColor: 'text-white',
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Track projects & collaboration',
    icon: <FolderKanban className="w-8 h-8" />,
    path: '/projects',
    gradient: 'from-violet-500 to-violet-600',
    iconColor: 'text-white',
  },
  {
    id: 'estimating',
    title: 'Estimating',
    description: 'Create & manage estimates',
    icon: <FileText className="w-8 h-8" />,
    path: '/estimates',
    gradient: 'from-amber-500 to-amber-600',
    iconColor: 'text-white',
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'Companies & contacts',
    icon: <Users className="w-8 h-8" />,
    path: '/clients',
    gradient: 'from-orange-500 to-orange-600',
    iconColor: 'text-white',
  },
  {
    id: 'sales',
    title: 'Sales',
    description: 'CRM & pipeline management',
    icon: <Handshake className="w-8 h-8" />,
    path: '/sales',
    gradient: 'from-teal-500 to-teal-600',
    iconColor: 'text-white',
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Calendar & task management',
    icon: <CheckSquare className="w-8 h-8" />,
    path: '/tasks',
    gradient: 'from-cyan-500 to-cyan-600',
    iconColor: 'text-white',
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Users & system settings',
    icon: <Settings className="w-8 h-8" />,
    path: '/admin',
    gradient: 'from-rose-500 to-rose-600',
    iconColor: 'text-white',
  },
  {
    id: 'developer',
    title: 'Developer',
    description: 'Tools & diagnostics',
    icon: <Code className="w-8 h-8" />,
    path: '/developer',
    gradient: 'from-indigo-500 to-indigo-600',
    iconColor: 'text-white',
  },
];

export function LandingPage() {
  useDocumentTitle();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { company } = useCompanyStore();

  const firstName = user?.firstName || user?.displayName?.split(' ')[0] || 'there';

  // Keyboard shortcuts for modules (1-8)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = parseInt(e.key);
      if (key >= 1 && key <= modules.length) {
        const module = modules[key - 1];
        if (module) {
          navigate(module.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <Header />

      {/* Main Content - No scroll on desktop, scroll on mobile */}
      <main 
        className="flex-1 flex flex-col min-h-0 overflow-hidden md:overflow-hidden overflow-y-auto"
        style={{ paddingTop: 'var(--header-height)' }}
      >
        <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          
          {/* Welcome Banner - Bigger */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 px-8 py-6 mb-4 flex-shrink-0"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wide mb-1">
                  Welcome back
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {firstName}
                </h1>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold rounded-xl shadow-sm transition-all text-base"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Open Dashboard</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Modules Section - In a container card */}
          <div className="flex-1 flex flex-col min-h-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col"
            >
              <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex-shrink-0">
                Modules
              </h2>
              
              {/* Grid - 2 rows with reduced gap */}
              <div 
                className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-0"
                style={{ gridTemplateRows: '1fr 1fr' }}
              >
                {modules.map((module, index) => (
                  <motion.button
                    key={module.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * index, duration: 0.2 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(module.path)}
                    className="group flex flex-col items-center justify-center text-center p-3 rounded-xl transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 h-full relative"
                  >
                    {/* Keyboard shortcut hint */}
                    <span className="absolute top-2 right-2 w-5 h-5 rounded text-[10px] font-medium text-slate-300 dark:text-slate-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {index + 1}
                    </span>

                    {/* Icon with gradient and glow */}
                    <div className="relative mb-3">
                      {/* Glow effect on hover */}
                      <div className={clsx(
                        'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-300 bg-gradient-to-br',
                        module.gradient
                      )} />
                      <div className={clsx(
                        'relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br transition-all duration-200 group-hover:shadow-xl group-hover:scale-105',
                        module.gradient,
                        module.iconColor
                      )}>
                        {module.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-0.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-snug group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                      {module.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer - Minimal */}
        <footer className="flex-shrink-0 py-2 text-center border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} {company.name || 'S&G Builders Supply Inc.'}
          </p>
        </footer>
      </main>
    </div>
  );
}     