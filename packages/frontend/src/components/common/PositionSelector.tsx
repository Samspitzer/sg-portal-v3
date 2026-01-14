import { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, ArrowLeft, Search, X, Briefcase, Building2 } from 'lucide-react';

export interface PositionSelectorProps {
  /** Currently selected position ID */
  value: string;
  /** Departments with their positions */
  departments: Array<{
    id: string;
    name: string;
    positions: Array<{
      id: string;
      name: string;
    }>;
  }>;
  /** Change handler - receives position ID */
  onChange: (positionId: string) => void;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Placeholder when nothing selected */
  placeholder?: string;
  /** If true, selection is pending/invalid - trap focus until cleared */
  pending?: boolean;
  /** Message to show when trying to leave while pending */
  pendingMessage?: string;
}

export function PositionSelector({
  value,
  departments,
  onChange,
  icon,
  className,
  placeholder = 'Select position...',
  pending = false,
  pendingMessage = 'Please clear selection first (ESC or X)',
}: PositionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected position info for display
  const selectedPosition = useMemo(() => {
    if (!value) return null;
    for (const dept of departments) {
      const pos = dept.positions.find(p => p.id === value);
      if (pos) {
        return { position: pos, department: dept };
      }
    }
    return null;
  }, [value, departments]);

  // Get current department when drilling down
  const currentDepartment = selectedDeptId 
    ? departments.find(d => d.id === selectedDeptId) 
    : null;

  // Item types for the list
  type PositionItem = { id: string; name: string; type: 'position'; deptName?: string };
  type DepartmentItem = { id: string; name: string; type: 'department'; count: number };
  type ListItem = PositionItem | DepartmentItem;

  // Build current list based on view
  const currentItems = useMemo((): ListItem[] => {
    if (searchQuery.trim()) {
      // Flat list of all matching positions
      const query = searchQuery.toLowerCase();
      return departments.flatMap(dept => 
        dept.positions
          .filter(p => p.name.toLowerCase().includes(query) || dept.name.toLowerCase().includes(query))
          .map(p => ({ id: p.id, name: p.name, type: 'position' as const, deptName: dept.name }))
      );
    }
    if (currentDepartment) {
      // Positions in selected department
      return currentDepartment.positions.map(p => ({ id: p.id, name: p.name, type: 'position' as const }));
    }
    // Departments list
    return departments.map(d => ({ id: d.id, name: d.name, type: 'department' as const, count: d.positions.length }));
  }, [departments, currentDepartment, searchQuery]);

  // Reset highlight when view changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [selectedDeptId, searchQuery]);

  // Focus trap when pending - keep focus on button, show toast if trying to leave
  useEffect(() => {
    if (pending && !isOpen) {
      // Focus the button when entering pending state
      buttonRef.current?.focus();
      
      // When focus leaves, clear selection and show toast
      const handleFocusOut = () => {
        // Small delay to check if focus moved within container
        setTimeout(() => {
          if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
            // Focus left the component - clear and notify
            onChange('');
            window.dispatchEvent(new CustomEvent('position-selector-pending', { 
              detail: { message: pendingMessage } 
            }));
          }
        }, 0);
      };
      
      containerRef.current?.addEventListener('focusout', handleFocusOut);
      
      return () => {
        containerRef.current?.removeEventListener('focusout', handleFocusOut);
      };
    }
  }, [pending, isOpen, pendingMessage, onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (pending) {
          // Clear selection and show toast
          onChange('');
          window.dispatchEvent(new CustomEvent('position-selector-pending', { 
            detail: { message: pendingMessage } 
          }));
        }
        setIsOpen(false);
        setSearchQuery('');
        setSelectedDeptId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search and position dropdown when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        
        // Calculate dropdown position
        if (buttonRef.current && dropdownRef.current) {
          const buttonRect = buttonRef.current.getBoundingClientRect();
          const dropdownHeight = dropdownRef.current.offsetHeight;
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - buttonRect.bottom;
          const spaceAbove = buttonRect.top;
          
          if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
            setDropdownPosition('top');
          } else {
            setDropdownPosition('bottom');
            if (buttonRect.bottom + dropdownHeight > viewportHeight) {
              const scrollAmount = buttonRect.bottom + dropdownHeight - viewportHeight + 20;
              window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
          }
        }
      }, 10);
    } else {
      setDropdownPosition('bottom');
    }
  }, [isOpen]);

  // Re-check position when content changes
  useEffect(() => {
    if (isOpen && dropdownRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setDropdownPosition('top');
      }
    }
  }, [selectedDeptId, searchQuery, isOpen]);

  const handleSelect = (positionId: string) => {
    onChange(positionId);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedDeptId(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleBack = () => {
    setSelectedDeptId(null);
    setHighlightedIndex(0);
  };

  const handleDeptSelect = (deptId: string) => {
    setSelectedDeptId(deptId);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle ESC to clear selection when dropdown is closed
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && hasSelection) {
        e.preventDefault();
        onChange('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < currentItems.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        // Enter department if highlighted item is a department
        if (currentItems[highlightedIndex]?.type === 'department') {
          handleDeptSelect(currentItems[highlightedIndex].id);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        // Go back to department list
        if (selectedDeptId) {
          handleBack();
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        const item = currentItems[highlightedIndex];
        if (item) {
          if (item.type === 'department') {
            handleDeptSelect(item.id);
          } else {
            handleSelect(item.id);
          }
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        if (searchQuery) {
          // First ESC clears search
          setSearchQuery('');
        } else if (selectedDeptId) {
          // Go back to departments
          handleBack();
        } else {
          // Close dropdown
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
        
      case 'Backspace':
        if (!searchQuery && selectedDeptId) {
          e.preventDefault();
          handleBack();
        }
        break;
        
      case 'Tab':
        // Select current item and close
        const tabItem = currentItems[highlightedIndex];
        if (tabItem?.type === 'position') {
          handleSelect(tabItem.id);
        }
        setIsOpen(false);
        setSearchQuery('');
        setSelectedDeptId(null);
        break;
    }
    // Don't handle space - let it type in search
  };

  const displayLabel = selectedPosition 
    ? `${selectedPosition.position.name} (${selectedPosition.department.name})`
    : null;

  const hasSelection = !!value;

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors w-full',
          'focus:outline-none focus:ring-2 focus:ring-brand-500',
          hasSelection
            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
        )}
      >
        {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
        <span className={clsx('flex-1 text-left truncate', !hasSelection && 'text-slate-500 dark:text-slate-400')}>
          {hasSelection ? displayLabel : placeholder}
        </span>
        {hasSelection ? (
          <X
            className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className={clsx('w-4 h-4 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={clsx(
            'absolute z-50 w-full min-w-[250px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden',
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedDeptId(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-64 overflow-y-auto">
            {/* Search Results - flat list */}
            {searchQuery.trim() ? (
              currentItems.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matches found
                </div>
              ) : (
                currentItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2',
                      index === highlightedIndex
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                        : item.id === value
                        ? 'bg-slate-100 dark:bg-slate-700 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {item.type === 'position' && item.deptName && (
                      <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{item.deptName}</span>
                    )}
                  </button>
                ))
              )
            ) : selectedDeptId && currentDepartment ? (
              /* Positions in selected department */
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {currentDepartment.name}
                </button>
                {currentDepartment.positions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    No positions in this department
                  </div>
                ) : (
                  currentDepartment.positions.map((pos, index) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => handleSelect(pos.id)}
                      className={clsx(
                        'w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2',
                        index === highlightedIndex
                          ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                          : pos.id === value
                          ? 'bg-slate-100 dark:bg-slate-700 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {pos.name}
                    </button>
                  ))
                )}
              </>
            ) : (
              /* Departments list */
              departments.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No departments available
                </div>
              ) : (
                departments.map((dept, index) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => handleDeptSelect(dept.id)}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between',
                      index === highlightedIndex
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dept.name}</span>
                      <span className="text-xs text-slate-400">({dept.positions.length})</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}