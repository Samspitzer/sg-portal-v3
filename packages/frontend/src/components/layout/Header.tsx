import { useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  Bell,
  Moon,
  Sun,
  Monitor,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore, useUIStore, useToast, useCompanyStore } from '@/contexts';
import { useSafeNavigate } from '@/hooks';
import { HeaderDropdown, type HeaderDropdownItem } from '@/components/common';

export function Header({ }: { fullWidth?: boolean }) {
  const navigate = useSafeNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, toggleCommandPalette } = useUIStore();
  const { company } = useCompanyStore();
  const toast = useToast();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Signed out', 'You have been signed out successfully');
    } catch {
      toast.error('Error', 'Failed to sign out');
    }
  }, [logout, toast]);

  // Theme menu items
  const themeItems: HeaderDropdownItem[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun className="w-4 h-4" />,
      onClick: () => setTheme('light'),
      className: theme === 'light' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300',
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon className="w-4 h-4" />,
      onClick: () => setTheme('dark'),
      className: theme === 'dark' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300',
    },
    {
      id: 'system',
      label: 'System',
      icon: <Monitor className="w-4 h-4" />,
      onClick: () => setTheme('system'),
      className: theme === 'system' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300',
    },
  ];

  // User menu items
  const userMenuItems: HeaderDropdownItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/profile'),
    },
    {
      id: 'notifications',
      label: 'Notification Settings',
      icon: <Bell className="w-4 h-4" />,
      onClick: () => navigate('/notifications'),
    },
    {
      id: 'logout',
      label: 'Sign out',
      icon: <LogOut className="w-4 h-4" />,
      onClick: handleLogout,
      className: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
      dividerBefore: true,
    },
  ];

  const CurrentThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  // Get initials from company name (up to 3 characters)
  const companyInitials = company.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  return (
    <header
      style={{ height: 'var(--header-height)' }}
      className={clsx(
        'fixed top-0 left-0 right-0 z-40',
        'bg-white dark:bg-slate-900',
        'border-b border-slate-200 dark:border-slate-800',
        'shadow-md shadow-slate-300/50 dark:shadow-slate-900/50'
      )}
    >
      <div className="h-full flex items-center justify-between px-4">
        {/* Left - Logo & Home */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className={clsx(
              'flex items-center gap-3 px-2 py-1 rounded-lg',
              'transition-colors'
            )}
          >
            {/* Company Logo */}
            {company.logo ? (
              <div className="bg-white rounded-xl p-1">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-10 w-auto max-w-[160px] object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">{companyInitials}</span>
              </div>
            )}
          </button>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-xl mx-4">
          <button
            onClick={toggleCommandPalette}
            className={clsx(
              'w-full flex items-center gap-3',
              'px-4 py-2 rounded-lg',
              'bg-slate-100 dark:bg-slate-800',
              'text-slate-400 dark:text-slate-500',
              'hover:bg-slate-200 dark:hover:bg-slate-700',
              'border border-slate-200 dark:border-slate-700',
              'transition-colors'
            )}
          >
            <Search className="w-4 h-4" />
            <span className="text-sm flex-1 text-left">Search...</span>
            <div className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 font-mono">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 font-mono">
                K
              </kbd>
            </div>
          </button>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          {/* Theme toggle - Using HeaderDropdown */}
          <HeaderDropdown
            trigger={<CurrentThemeIcon className="w-5 h-5" />}
            triggerClassName={clsx(
              'p-2 rounded-lg',
              'text-slate-500 dark:text-slate-400',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              'transition-colors'
            )}
            items={themeItems}
            width="sm"
            align="right"
          />

          {/* Notifications - Using HeaderDropdown */}
          <HeaderDropdown
            trigger={
              <div className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
              </div>
            }
            triggerClassName={clsx(
              'p-2 rounded-lg',
              'text-slate-500 dark:text-slate-400',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              'transition-colors'
            )}
            items={[]}
            header={
              <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            }
            emptyState={
              <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-4">
                No new notifications
              </p>
            }
            width="lg"
            align="right"
          />

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

          {/* User menu - Using HeaderDropdown */}
          <HeaderDropdown
            trigger={
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full',
                    'bg-brand-100 dark:bg-brand-900',
                    'flex items-center justify-center',
                    'text-brand-600 dark:text-brand-400 font-medium text-sm',
                    'overflow-hidden'
                  )}
                >
                  {user?.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user?.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {user?.role}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
              </div>
            }
            triggerClassName={clsx(
              'flex items-center gap-2',
              'px-2 py-1.5 rounded-lg',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              'transition-colors'
            )}
            items={userMenuItems}
            header={
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {user?.displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            }
            width="md"
            align="right"
          />
        </div>
      </div>
    </header>
  );
}