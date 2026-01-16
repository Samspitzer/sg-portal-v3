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
  ArrowRight,
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
  iconBg: string;
  iconColor: string;
}

const modules: ModuleCard[] = [
  {
    id: 'accounting',
    title: 'Accounting',
    description: 'Invoice management, email inbox, reports and forecasting',
    icon: <Receipt className="w-5 h-5" />,
    path: '/accounting',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'projects',
    title: 'Project Management',
    description: 'Track projects, tasks, and team collaboration',
    icon: <FolderKanban className="w-5 h-5" />,
    path: '/projects',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    id: 'estimating',
    title: 'Estimating',
    description: 'Create and manage project estimates',
    icon: <FileText className="w-5 h-5" />,
    path: '/estimates',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'customers',
    title: 'Customer Database',
    description: 'Manage companies, contacts, and customer information',
    icon: <Users className="w-5 h-5" />,
    path: '/clients',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: 'sales',
    title: 'Sales',
    description: 'CRM, pipeline management, and lead tracking',
    icon: <Handshake className="w-5 h-5" />,
    path: '/sales',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Task management with calendar and list views',
    icon: <CheckSquare className="w-5 h-5" />,
    path: '/tasks',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'admin',
    title: 'Admin Panel',
    description: 'User management and system settings',
    icon: <Settings className="w-5 h-5" />,
    path: '/admin',
    iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'developer',
    title: 'Developer Tools',
    description: 'Panel testing, system status, and diagnostics',
    icon: <Code className="w-5 h-5" />,
    path: '/developer',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
];

export function LandingPage() {
  useDocumentTitle();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { company } = useCompanyStore();

  const firstName = user?.firstName || user?.displayName?.split(' ')[0] || 'there';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main 
        className="flex-1 flex flex-col overflow-hidden"
        style={{ paddingTop: 'var(--header-height)' }}
      >
        <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-6 py-6">
          {/* Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6"
          >
            <div className="text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                Welcome back
              </p>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {firstName}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                What would you like to work on today?
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 dark:bg-brand-600 hover:bg-slate-700 dark:hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Open My Dashboard
              </motion.button>
            </div>
          </motion.div>

          {/* Modules Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Modules
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              {modules.map((module, index) => (
                <motion.button
                  key={module.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(module.path)}
                  className="group bg-white dark:bg-slate-800 rounded-xl p-5 text-left transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md flex flex-col h-full"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={clsx(
                      'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                      module.iconBg,
                      module.iconColor
                    )}>
                      {module.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                        {module.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Link at bottom */}
                  <div className="mt-auto pt-4">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                      Open module
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 py-2 text-center border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} {company.name || 'S&G Portal'}
          </p>
        </footer>
      </main>
    </div>
  );
}