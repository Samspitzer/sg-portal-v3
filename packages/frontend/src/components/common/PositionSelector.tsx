// ============================================================================
// Position Selector Component
// Location: src/components/common/PositionSelector.tsx
// 
// Hierarchical dropdown for selecting positions by department.
// Supports drill-down navigation, search, and keyboard controls.
// Updated to accept icon as component type OR ReactNode.
// ============================================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, ChevronLeft, Search, X } from 'lucide-react';

interface Position {
  id: string;
  name: string;
  reportsToPositionId?: string;
}

interface Department {
  id: string;
  name: string;
  positions: Position[];
}

export interface PositionSelectorProps {
  /** Currently selected position ID */
  value: string;
  /** Departments with their positions */
  departments: Department[];
  /** Callback when selection changes */
  onChange: (positionId: string) => void;
  /** Optional icon - can be a Lucide component (e.g., Briefcase) or ReactNode */
  icon?: React.ElementType | React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** If true, traps focus and shows warning when trying to leave */
  pending?: boolean;
  /** Message for pending toast */
  pendingMessage?: string;
}

// Helper to check if icon is a component type vs ReactNode
function isComponentType(icon: React.ElementType | React.ReactNode): icon is React.ElementType {
  // Check if it's a function (functional component)
  if (typeof icon === 'function') return true;
  // Check if it's a forwardRef or memo component (object with $$typeof but no 'type' property)
  if (typeof icon === 'object' && icon !== null && '$$typeof' in icon) {
    // If it has 'type' property, it's already a rendered element, not a component
    if ('type' in icon) return false;
    return true;
  }
  return false;
}

export function PositionSelector({
  value,
  departments,
  onChange,
  icon,
  className,
  placeholder = 'Select position...',
  pending = false,
  pendingMessage = 'Selection required',
}: PositionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Render icon - handles both component type and ReactNode
  const renderIcon = () => {
    if (!icon) return null;
    if (isComponentType(icon)) {
      const IconComponent = icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return icon;
  };

  // Get selected position info
  const selectedPosition = useMemo(() => {
    for (const dept of departments) {
      const pos = dept.positions.find(p => p.id === value);
      if (pos) {
        return { position: pos, department: dept };
      }
    }
    return null;
  }, [value, departments]);

  // Get current view items
  const currentItems = useMemo(() => {
    if (selectedDeptId) {
      // Show positions in selected department
      const dept = departments.find(d => d.id === selectedDeptId);
      return dept?.positions.map(p => ({ 
        id: p.id, 
        name: p.name, 
        type: 'position' as const 
      })) || [];
    }
    
    // Show departments, filtered by search
    let filteredDepts = departments;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredDepts = departments.filter(d => 
        d.name.toLowerCase().includes(searchLower) ||
        d.positions.some(p => p.name.toLowerCase().includes(searchLower))
      );
    }
    
    return filteredDepts.map(d => ({ 
      id: d.id, 
      name: d.name, 
      type: 'department' as const,
      positionCount: d.positions.length 
    }));
  }, [departments, selectedDeptId, search]);

  // Handle dropdown positioning
  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
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
          window.scrollBy({ 
            top: buttonRect.bottom + dropdownHeight - viewportHeight + 20, 
            behavior: 'smooth' 
          });
        }
      }
    }
  }, [isOpen, currentItems]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlight when items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [currentItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedDeptId(null);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle pending state - trap focus
  useEffect(() => {
    if (pending && !isOpen) {
      const handleFocusOut = () => {
        setTimeout(() => {
          if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
            onChange('');
            window.dispatchEvent(new CustomEvent('position-selector-pending', { 
              detail: { message: pendingMessage } 
            }));
          }
        }, 0);
      };
      
      containerRef.current?.addEventListener('focusout', handleFocusOut);
      return () => containerRef.current?.removeEventListener('focusout', handleFocusOut);
    }
  }, [pending, isOpen, onChange, pendingMessage]);

  const handleOpen = () => {
    setIsOpen(true);
    setSelectedDeptId(null);
    setSearch('');
    setHighlightedIndex(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedDeptId(null);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleSelectDepartment = (deptId: string) => {
    setSelectedDeptId(deptId);
    setHighlightedIndex(0);
  };

  const handleSelectPosition = (positionId: string) => {
    onChange(positionId);
    handleClose();
  };

  const handleBack = () => {
    setSelectedDeptId(null);
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleOpen();
      } else if (e.key === 'Escape' && value) {
        e.preventDefault();
        onChange('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < currentItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : currentItems.length - 1
        );
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!selectedDeptId && currentItems[highlightedIndex]?.type === 'department') {
          handleSelectDepartment(currentItems[highlightedIndex].id);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (selectedDeptId) {
          handleBack();
        }
        break;
      case 'Enter':
        e.preventDefault();
        const item = currentItems[highlightedIndex];
        if (item) {
          if (item.type === 'department') {
            handleSelectDepartment(item.id);
          } else {
            handleSelectPosition(item.id);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (search) {
          setSearch('');
        } else if (selectedDeptId) {
          handleBack();
        } else if (isOpen) {
          handleClose();
        } else if (value) {
          // Already closed, clear the selection
          onChange('');
        }
        break;
      case 'Tab':
        handleClose();
        break;
    }
  };

  const displayText = selectedPosition 
    ? `${selectedPosition.position.name} (${selectedPosition.department.name})`
    : placeholder;

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => isOpen ? handleClose() : handleOpen()}
        onKeyDown={handleKeyDown}
        className={clsx(
          'flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-sm',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors',
          value
            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
        )}
      >
        {icon && <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{renderIcon()}</span>}
        <span className={clsx('flex-1 text-left truncate', !value && 'text-slate-500 dark:text-slate-400')}>
          {displayText}
        </span>
        {value ? (
          <X
            className="w-4 h-4 flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
            'absolute z-50 w-full min-w-[250px] bg-white dark:bg-slate-800',
            'border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden',
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {/* Header with back button when in department */}
          {selectedDeptId && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={handleBack}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {departments.find(d => d.id === selectedDeptId)?.name}
              </span>
            </div>
          )}

          {/* Search (only at department level) */}
          {!selectedDeptId && departments.length > 3 && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search departments..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="max-h-56 overflow-y-auto">
            {currentItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                {selectedDeptId ? 'No positions in this department' : 'No departments found'}
              </div>
            ) : (
              currentItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.type === 'department') {
                      handleSelectDepartment(item.id);
                    } else {
                      handleSelectPosition(item.id);
                    }
                  }}
                  className={clsx(
                    'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                    index === highlightedIndex
                      ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : item.id === value
                      ? 'bg-slate-100 dark:bg-slate-700 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  <span className="truncate">{item.name}</span>
                  {item.type === 'department' && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-xs">{(item as any).positionCount}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionSelector;