import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useSafeNavigate } from '@/hooks';
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
} from 'lucide-react';
import { useAuthStore, useUIStore, useToast, useCompanyStore } from '@/contexts';
import { PANELS } from '@/config/panels';

export function PanelHeader() {
  const navigate = useSafeNavigate(); 
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, toggleCommandPalette } = useUIStore();
  const { company } = useCompanyStore();
  const toast = useToast();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const dropdownItemRefs = useRef<{ [key: string]: (HTMLButtonElement | null)[] }>({});
  const userMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert PANELS object to array for mapping
  const panels = Object.values(PANELS);

  // Reset focused index when dropdown changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [openDropdown]);

  // Focus the item when focusedIndex changes
  useEffect(() => {
    if (openDropdown && focusedIndex >= 0) {
      const items = dropdownItemRefs.current[openDropdown];
      if (items && items[focusedIndex]) {
        items[focusedIndex]?.focus();
      }
    }
  }, [focusedIndex, openDropdown]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (panelId: string, hasTiles: boolean) => {
    if (!hasTiles) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setOpenDropdown(panelId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  const handlePanelKeyDown = useCallback((
    e: React.KeyboardEvent,
    panelId: string,
    hasTiles: boolean,
    tilesCount: number
  ) => {
    if (!hasTiles) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (openDropdown !== panelId) {
          setOpenDropdown(panelId);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(0);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (openDropdown !== panelId) {
          setOpenDropdown(panelId);
          setFocusedIndex(tilesCount - 1);
        } else {
          setFocusedIndex(tilesCount - 1);
        }
        break;
      case 'Enter':
      case ' ':
        if (openDropdown !== panelId) {
          e.preventDefault();
          setOpenDropdown(panelId);
          setFocusedIndex(0);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpenDropdown(null);
        break;
    }
  }, [openDropdown]);

  const handleDropdownKeyDown = useCallback((
    e: React.KeyboardEvent,
    panelId: string,
    tilesCount: number,
    onSelect: () => void
  ) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % tilesCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + tilesCount) % tilesCount);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect();
        break;
      case 'Escape':
        e.preventDefault();
        setOpenDropdown(null);
        // Return focus to the panel button
        const panelButton = dropdownRefs.current[panelId]?.querySelector('button');
        panelButton?.focus();
        break;
      case 'Tab':
        setOpenDropdown(null);
        break;
    }
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
            const hasTiles = panel.tiles.length > 0;
            
            // Initialize refs array for this panel's dropdown items
            if (!dropdownItemRefs.current[panel.id]) {
              dropdownItemRefs.current[panel.id] = [];
            }
            
            return (
              <div
                key={panel.id}
                ref={(el) => (dropdownRefs.current[panel.id] = el)}
                className="relative flex items-center"
                onMouseEnter={() => handleMouseEnter(panel.id, hasTiles)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Panel Button */}
                <button
                  onClick={() => {
                    navigate(panel.basePath);
                    setOpenDropdown(null);
                  }}
                  onKeyDown={(e) => handlePanelKeyDown(e, panel.id, hasTiles, panel.tiles.length)}
                  aria-expanded={openDropdown === panel.id}
                  aria-haspopup={hasTiles ? 'menu' : undefined}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname.startsWith(panel.basePath)
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <PanelIcon className="w-4 h-4" />
                  <span className="hidden md:inline">{panel.name}</span>
                  {hasTiles && (
                    <ChevronDown className={clsx(
                      'w-4 h-4 transition-transform',
                      openDropdown === panel.id && 'rotate-180'
                    )} />
                  )}
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {openDropdown === panel.id && hasTiles && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      role="menu"
                      aria-label={`${panel.name} submenu`}
                      className={clsx(
                        'absolute left-0 top-full mt-1',
                        'w-56 py-2',
                        'bg-white dark:bg-slate-800',
                        'rounded-lg shadow-lg',
                        'border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {panel.tiles.map((tile, index) => (
                        <button
                          key={tile.path}
                          ref={(el) => {
                            if (!dropdownItemRefs.current[panel.id]) {
                              dropdownItemRefs.current[panel.id] = [];
                            }
                            const items = dropdownItemRefs.current[panel.id];
                            if (items) {
                              items[index] = el;
                            }
                          }}
                          role="menuitem"
                          tabIndex={focusedIndex === index ? 0 : -1}
                          onClick={() => {
                            navigate(tile.path);
                            setOpenDropdown(null);
                          }}
                          onKeyDown={(e) => handleDropdownKeyDown(
                            e,
                            panel.id,
                            panel.tiles.length,
                            () => {
                              navigate(tile.path);
                              setOpenDropdown(null);
                            }
                          )}
                          className={clsx(
                            'w-full flex items-center gap-3 px-4 py-2 text-sm',
                            'text-slate-700 dark:text-slate-300',
                            'hover:bg-slate-100 dark:hover:bg-slate-700',
                            'focus:bg-slate-100 dark:focus:bg-slate-700 focus:outline-none',
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
                  'text-primary-600 dark:text-primary-400 font-medium text-sm',
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