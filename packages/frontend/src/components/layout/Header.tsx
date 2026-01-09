import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

export function Header({ }: { fullWidth?: boolean }) {
  const navigate = useSafeNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, toggleCommandPalette } = useUIStore();
  const { company } = useCompanyStore();
  const toast = useToast();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Signed out', 'You have been signed out successfully');
    } catch {
      toast.error('Error', 'Failed to sign out');
    }
  }, [logout, toast]);

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
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
              <div className="bg-white rounded-xl">
                <img 
                  src={company.logo} 
                  alt={company.name} 
                  className="h-12 w-auto max-w-[180px] object-contain"
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
          {/* Theme toggle */}
          <div ref={themeMenuRef} className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={clsx(
                'p-2 rounded-lg',
                'text-slate-500 dark:text-slate-400',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'transition-colors'
              )}
            >
              {CurrentThemeIcon && <CurrentThemeIcon className="w-5 h-5" />}
            </button>

            <AnimatePresence>
              {showThemeMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={clsx(
                    'absolute right-0 top-full mt-2',
                    'w-36 py-1',
                    'bg-white dark:bg-slate-800',
                    'rounded-lg shadow-lg',
                    'border border-slate-200 dark:border-slate-700'
                  )}
                >
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTheme(option.value);
                        setShowThemeMenu(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2',
                        'px-3 py-2 text-sm',
                        'hover:bg-slate-100 dark:hover:bg-slate-700',
                        theme === option.value
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={clsx(
                'relative p-2 rounded-lg',
                'text-slate-500 dark:text-slate-400',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'transition-colors'
              )}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={clsx(
                    'absolute right-0 top-full mt-2',
                    'w-80 py-2',
                    'bg-white dark:bg-slate-800',
                    'rounded-lg shadow-lg',
                    'border border-slate-200 dark:border-slate-700'
                  )}
                >
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No new notifications
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

          {/* User menu */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={clsx(
                'flex items-center gap-2',
                'px-2 py-1.5 rounded-lg',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'transition-colors'
              )}
            >
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
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={clsx(
                    'absolute right-0 top-full mt-2',
                    'w-56 py-1',
                    'bg-white dark:bg-slate-800',
                    'rounded-lg shadow-lg',
                    'border border-slate-200 dark:border-slate-700'
                  )}
                >
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {user?.displayName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowUserMenu(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2',
                        'px-4 py-2 text-sm',
                        'text-slate-700 dark:text-slate-300',
                        'hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate('/notifications');
                        setShowUserMenu(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2',
                        'px-4 py-2 text-sm',
                        'text-slate-700 dark:text-slate-300',
                        'hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      <Bell className="w-4 h-4" />
                      Notification Settings
                    </button>
                  </div>

                  <div className="py-1 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={handleLogout}
                      className={clsx(
                        'w-full flex items-center gap-2',
                        'px-4 py-2 text-sm',
                        'text-red-600 dark:text-red-400',
                        'hover:bg-red-50 dark:hover:bg-red-900/20'
                      )}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}