import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Calculator,
  FolderKanban,
  FileSpreadsheet,
  Users,
  Settings,
  Code,
  ChevronLeft,
  Pin,
  PinOff,
} from 'lucide-react';
import { useUIStore } from '@/contexts';
import type { PanelId, Permission } from '@sg-portal/shared';
import { useAuthStore } from '@/contexts';

interface NavItem {
  id: PanelId;
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  requiredPermission: Permission;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    requiredPermission: 'dashboard:view',
  },
  {
    id: 'accounting',
    name: 'Accounting',
    path: '/accounting',
    icon: Calculator,
    requiredPermission: 'accounting:view',
  },
  {
    id: 'projects',
    name: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    requiredPermission: 'projects:view',
  },
  {
    id: 'estimating',
    name: 'Estimating',
    path: '/estimates',
    icon: FileSpreadsheet,
    requiredPermission: 'estimating:view',
  },
  {
    id: 'customers',
    name: 'Customers',
    path: '/clients',
    icon: Users,
    requiredPermission: 'customers:view',
  },
  {
    id: 'admin',
    name: 'Admin',
    path: '/admin',
    icon: Settings,
    requiredPermission: 'admin:view',
  },
  {
    id: 'developer',
    name: 'Developer',
    path: '/developer',
    icon: Code,
    requiredPermission: 'developer:view',
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    sidebarExpanded,
    sidebarPinned,
    setSidebarExpanded,
    setSidebarPinned,
    setActivePanel,
  } = useUIStore();

  const handleMouseEnter = useCallback(() => {
    if (!sidebarPinned) {
      setSidebarExpanded(true);
    }
  }, [sidebarPinned, setSidebarExpanded]);

  const handleMouseLeave = useCallback(() => {
    if (!sidebarPinned) {
      setSidebarExpanded(false);
    }
  }, [sidebarPinned, setSidebarExpanded]);

  const togglePin = useCallback(() => {
    setSidebarPinned(!sidebarPinned);
    if (!sidebarPinned) {
      setSidebarExpanded(true);
    }
  }, [sidebarPinned, setSidebarPinned, setSidebarExpanded]);

  // Filter nav items based on user permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'developer') return true;
    return user.permissions.includes(item.requiredPermission);
  });

  return (
    <motion.aside
      initial={false}
      animate={{
        width: sidebarExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ top: 'var(--header-height)' }}
      className={clsx(
        'fixed left-0 bottom-0 z-20',
        'flex flex-col',
        'bg-slate-900 dark:bg-slate-950',
        'border-r border-slate-800',
        'shadow-xl'
      )}
    >
      {/* Pin button */}
      {sidebarExpanded && (
        <div className="px-2 py-2 flex justify-end border-b border-slate-800">
          <button
            onClick={togglePin}
            className={clsx(
              'p-2 rounded-lg',
              'text-slate-400 hover:text-white',
              'hover:bg-slate-800',
              'transition-colors'
            )}
            title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            {sidebarPinned ? (
              <Pin className="w-4 h-4" />
            ) : (
              <PinOff className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1 px-2">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  onClick={() => setActivePanel(item.id)}
                  className={clsx(
                    'flex items-center gap-3',
                    'rounded-lg',
                    'transition-all duration-200',
                    sidebarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center',
                    isActive
                      ? [
                          'bg-brand-600 text-white',
                          'shadow-lg shadow-brand-600/20',
                        ]
                      : [
                          'text-slate-400',
                          'hover:text-white hover:bg-slate-800',
                        ]
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse button (only when pinned) */}
      {sidebarPinned && (
        <div className="p-2 border-t border-slate-800">
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            className={clsx(
              'w-full flex items-center gap-3',
              'px-3 py-2.5 rounded-lg',
              'text-slate-400 hover:text-white',
              'hover:bg-slate-800',
              'transition-colors'
            )}
          >
            <ChevronLeft
              className={clsx(
                'w-5 h-5 transition-transform',
                !sidebarExpanded && 'rotate-180'
              )}
            />
            {sidebarExpanded && (
              <span className="text-sm font-medium">Collapse</span>
            )}
          </button>
        </div>
      )}
    </motion.aside>
  );
}