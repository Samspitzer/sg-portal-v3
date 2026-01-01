import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Search,
  LogOut,
  ChevronDown,
  User,
  Moon,
  Sun,
  Monitor,
  Bell,
  Settings,
} from 'lucide-react';
import { useAuthStore, useUIStore, useToast, useCompanyStore } from '@/contexts';
import { PANELS } from '@/config/panels';

export function PanelHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, toggleCommandPalette } = useUIStore();
  const { company } = useCompanyStore();
  const toast = useToast();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedOutsideNav = Object.values(dropdownRefs.current).every(
        (ref) => ref && !ref.contains(event.target as Node)
      );
      if (clickedOutsideNav) {
        setOpenDropdown(null);
      }
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

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out', 'You have been signed out successfully');
    } catch {
      toast.error('Error', 'Failed to sign out');
    }
  };

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  const CurrentThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  // Convert PANELS object to array for mapping
  const panels = Object.values(PANELS);

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
        {/* Left - Logo & Navigation */}
        <div className="flex items-center gap-1">
         {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className={clsx(
              'flex items-center gap-3 px-2 py-1 rounded-xl',
              'transition-colors'
            )}
          >
  {company.logo ? (
    <img 
      src={company.logo} 
      alt={company.name} 
      className="h-12 w-auto max-w-[180px] object-contain"
    />
  ) : (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
      <span className="text-white font-bold text-xs">
        {company.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
      </span>
    </div>
  )}
  
</button>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

          {/* Navigation Items */}
          {panels.map((panel) => {
            const PanelIcon = panel.icon;
            
            return (
              <div
                key={panel.id}
                ref={(el) => (dropdownRefs.current[panel.id] = el)}
                className="relative flex items-center"
              >
                {/* Panel Name - Clickable to navigate */}
                <button
                  onClick={() => {
                    navigate(panel.basePath);
                    setOpenDropdown(null);
                  }}
                  className={clsx(
                    'flex items-center gap-2 pl-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    panel.tiles.length > 0 ? 'pr-1 rounded-r-none' : 'pr-3',
                    location.pathname.startsWith(panel.basePath)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <PanelIcon className="w-4 h-4" />
                  <span className="hidden md:inline">{panel.name}</span>
                </button>

                {/* Dropdown Arrow - Only shows if panel has tiles */}
                {panel.tiles.length > 0 && (
                  <button
                    onClick={() => setOpenDropdown(openDropdown === panel.id ? null : panel.id)}
                    className={clsx(
                      'flex items-center px-1 py-2 rounded-r-lg transition-colors',
                      location.pathname.startsWith(panel.basePath)
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <ChevronDown className={clsx(
                      'w-4 h-4 transition-transform',
                      openDropdown === panel.id && 'rotate-180'
                    )} />
                  </button>
                )}

                <AnimatePresence>
                  {openDropdown === panel.id && panel.tiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={clsx(
                        'absolute left-0 top-full mt-1',
                        'w-56 py-2',
                        'bg-white dark:bg-slate-800',
                        'rounded-lg shadow-lg',
                        'border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {panel.tiles.map((tile) => (
                        <button
                          key={tile.path}
                          onClick={() => {
                            navigate(tile.path);
                            setOpenDropdown(null);
                          }}
                          className={clsx(
                            'w-full flex items-center gap-3 px-4 py-2 text-sm',
                            'text-slate-700 dark:text-slate-300',
                            'hover:bg-slate-100 dark:hover:bg-slate-700',
                            location.pathname === tile.path && 'bg-slate-100 dark:bg-slate-700'
                          )}
                        >
                          <tile.icon className="w-4 h-4" />
                          {tile.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Right - Search, Theme, Notifications, User */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <button
            onClick={toggleCommandPalette}
            className={clsx(
              'flex items-center gap-3',
              'px-4 py-2 rounded-lg',
              'bg-slate-100 dark:bg-slate-800',
              'text-slate-400 dark:text-slate-500',
              'hover:bg-slate-200 dark:hover:bg-slate-700',
              'border border-slate-200 dark:border-slate-700',
              'transition-colors',
              'w-48'
            )}
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search...</span>
          </button>

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
                          ? 'text-primary-600 dark:text-primary-400'
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
                  'bg-primary-100 dark:bg-primary-900',
                  'flex items-center justify-center',
                  'text-primary-600 dark:text-primary-400 font-medium text-sm'
                )}
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
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
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2',
                        'px-4 py-2 text-sm',
                        'text-slate-700 dark:text-slate-300',
                        'hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
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