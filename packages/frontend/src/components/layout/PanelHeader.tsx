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
import { HeaderDropdown, type HeaderDropdownItem } from '@/components/common';

export function PanelHeader() {
  const navigate = useSafeNavigate(); 
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, setTheme, toggleCommandPalette } = useUIStore();
  const { company } = useCompanyStore();
  const toast = useToast();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const dropdownItemRefs = useRef<{ [key: string]: (HTMLButtonElement | null)[] }>({});
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
    panelPath: string,
    hasTiles: boolean,
    tilesCount: number
  ) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        // Enter/Space always navigates to the panel page
        e.preventDefault();
        navigate(panelPath);
        setOpenDropdown(null);
        break;
      case 'ArrowDown':
        // Arrow Down opens dropdown (if has tiles)
        if (hasTiles) {
          e.preventDefault();
          if (openDropdown !== panelId) {
            setOpenDropdown(panelId);
            setFocusedIndex(0);
          } else {
            setFocusedIndex((prev) => (prev + 1) % tilesCount);
          }
        }
        break;
      case 'ArrowUp':
        // Arrow Up opens dropdown at last item (if has tiles)
        if (hasTiles) {
          e.preventDefault();
          if (openDropdown !== panelId) {
            setOpenDropdown(panelId);
            setFocusedIndex(tilesCount - 1);
          } else {
            setFocusedIndex((prev) => (prev - 1 + tilesCount) % tilesCount);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpenDropdown(null);
        break;
    }
  }, [openDropdown, navigate]);

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
              <div className="bg-white rounded-xl p-1">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="h-10 w-auto max-w-[160px] object-contain"
                />
              </div>
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
                  onKeyDown={(e) => handlePanelKeyDown(e, panel.id, panel.basePath, hasTiles, panel.tiles.length)}
                  aria-expanded={openDropdown === panel.id}
                  aria-haspopup={hasTiles ? 'menu' : undefined}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname.startsWith(panel.basePath)
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
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