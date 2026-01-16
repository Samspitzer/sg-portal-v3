import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  Building2,
  FolderKanban,
  CheckSquare,
  FileText,
  Receipt,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  UserCog,
  Search,
} from 'lucide-react';
import { Button, Modal } from '@/components/common';
import { useUsersStore, useFieldsStore } from '@/contexts';
import { 
  useUserDependencies, 
  useReassignUserItems,
  getDependencySummary,
  useDropdownKeyboard,
  type DependencyCategory,
  type DependencyItem,
} from '@/hooks';

// Icon mapping for modules
const moduleIcons: Record<string, React.ElementType> = {
  companies: Building2,
  projects: FolderKanban,
  tasks: CheckSquare,
  estimates: FileText,
  invoices: Receipt,
};

// User option type for dropdown
interface UserOption {
  value: string;
  label: string;
  isChainOfCommand?: boolean;
  isDirectManager?: boolean;
}

// Custom dropdown component for user selection with portal for proper positioning
function UserSelectDropdown({
  value,
  onChange,
  chainOfCommandOptions,
  otherUserOptions,
  placeholder = 'Select user...',
  showMixedPlaceholder = false,
  hasError = false,
  hasWarning = false,
  className,
  onOpenChange,
}: {
  value: string;
  onChange: (value: string) => void;
  chainOfCommandOptions: Array<{ value: string; label: string }>;
  otherUserOptions: Array<{ value: string; label: string }>;
  placeholder?: string;
  showMixedPlaceholder?: boolean;
  hasError?: boolean;
  hasWarning?: boolean;
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Notify parent of open state changes
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Combine all options into a flat list for keyboard navigation
  const allOptions: UserOption[] = useMemo(() => {
    const options: UserOption[] = [];
    
    chainOfCommandOptions.forEach((opt, index) => {
      options.push({
        ...opt,
        isChainOfCommand: true,
        isDirectManager: index === 0,
      });
    });
    
    otherUserOptions.forEach(opt => {
      options.push({
        ...opt,
        isChainOfCommand: false,
      });
    });
    
    return options;
  }, [chainOfCommandOptions, otherUserOptions]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return allOptions;
    const query = searchQuery.toLowerCase();
    return allOptions.filter(opt => opt.label.toLowerCase().includes(query));
  }, [allOptions, searchQuery]);

  // Show search if more than 5 options
  const showSearch = allOptions.length > 5;

  // Find selected option
  const selectedOption = allOptions.find(opt => opt.value === value);

  // Close dropdown function
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Keyboard navigation
  const dropdownKeyboard = useDropdownKeyboard({
    items: filteredOptions,
    isOpen,
    onSelect: (option) => {
      if (option) {
        onChange(option.value);
        closeDropdown();
        triggerRef.current?.focus();
      }
    },
    onClose: () => {
      closeDropdown();
      triggerRef.current?.focus();
    },
  });

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 220);
      const dropdownHeight = 280; // Approximate max height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Determine if dropdown should appear above or below
      const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Calculate left position - align to right edge of trigger to prevent cutoff
      let left = rect.right - dropdownWidth;
      
      // Ensure it doesn't go off the left edge
      if (left < 8) {
        left = 8;
      }
      
      // Ensure it doesn't go off the right edge
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      
      setDropdownPosition({
        top: showAbove ? rect.top - dropdownHeight : rect.bottom + 4,
        left,
        width: dropdownWidth,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };
    
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
    if (isOpen) {
      dropdownKeyboard.setHighlightedIndex(0);
    }
  }, [isOpen, showSearch]);

  // Reset highlight when search changes
  useEffect(() => {
    if (isOpen && searchQuery) {
      dropdownKeyboard.setHighlightedIndex(0);
    }
  }, [searchQuery, isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && dropdownKeyboard.highlightedIndex >= 0) {
      const item = itemRefs.current[dropdownKeyboard.highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [isOpen, dropdownKeyboard.highlightedIndex]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        dropdownKeyboard.handleKeyDown(e);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeDropdown();
      }
      // Don't stop propagation if dropdown is closed - let it bubble to modal
    } else if (e.key === 'Tab') {
      if (isOpen) {
        closeDropdown();
      }
    } else if (isOpen) {
      dropdownKeyboard.handleKeyDown(e);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (searchQuery) {
        setSearchQuery('');
      } else {
        closeDropdown();
        triggerRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      closeDropdown();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
      dropdownKeyboard.handleKeyDown(e);
    }
  };

  // Handle ESC on the dropdown itself
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
      triggerRef.current?.focus();
    }
  };

  // Get display text
  const displayText = showMixedPlaceholder 
    ? 'Multiple selections...' 
    : selectedOption?.label || placeholder;

  // Render dropdown content
  const dropdownContent = isOpen ? (
    <div 
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999,
      }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl"
      role="listbox"
      onKeyDown={handleDropdownKeyDown}
    >
      {/* Search */}
      {showSearch && (
        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search users..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="max-h-60 overflow-y-auto py-1">
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
            {searchQuery ? 'No matches found' : 'No users available'}
          </div>
        ) : (
          filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === dropdownKeyboard.highlightedIndex;
            
            // Show section headers
            const showChainHeader = !searchQuery && option.isChainOfCommand && index === 0;
            const showOtherHeader = !searchQuery && !option.isChainOfCommand && 
              (index === 0 || filteredOptions[index - 1]?.isChainOfCommand);
            
            return (
              <div key={option.value}>
                {showChainHeader && (
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Chain of Command
                  </div>
                )}
                {showOtherHeader && (
                  <>
                    {chainOfCommandOptions.length > 0 && (
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                    )}
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Other Users
                    </div>
                  </>
                )}
                <div
                  ref={(el) => { itemRefs.current[index] = el; }}
                  role="option"
                  aria-selected={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(option.value);
                    closeDropdown();
                  }}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-sm',
                    isHighlighted
                      ? 'bg-brand-50 dark:bg-brand-900/30'
                      : isSelected
                        ? 'bg-slate-50 dark:bg-slate-700/50'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  <span className={clsx(
                    isSelected ? 'text-brand-700 dark:text-brand-300 font-medium' : 'text-slate-700 dark:text-slate-300'
                  )}>
                    {option.label}
                  </span>
                  {option.isDirectManager && !searchQuery && (
                    <span className="text-xs text-brand-500 dark:text-brand-400 font-medium">
                      Manager
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={clsx(
          'w-full flex items-center justify-between gap-2 text-sm px-3 py-1.5 rounded-lg',
          'bg-white dark:bg-slate-800',
          'border transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'hover:border-slate-400 dark:hover:border-slate-500',
          hasError
            ? 'border-danger-400 dark:border-danger-500'
            : hasWarning
              ? 'border-amber-400 dark:border-amber-500'
              : 'border-slate-300 dark:border-slate-600',
        )}
      >
        <span className={clsx(
          'truncate text-left',
          selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'
        )}>
          {displayText}
        </span>
        <ChevronDown className={clsx(
          'w-4 h-4 text-slate-400 flex-shrink-0 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Render dropdown in portal */}
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}

interface UserDeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reassignToUserId: string | null) => void;
  user: {
    id: string;
    name: string;
    positionId?: string;
  } | null;
  mode: 'deactivate' | 'delete';
}

// Extended category with individual item assignments
interface CategoryWithAssignments {
  module: string;
  label: string;
  icon: string;
  field: string;
  items: DependencyItem[];
  canReassign: boolean;
  bulkAssignTo: string;
  itemAssignments: Record<string, string>; // itemId -> userId
}

export function UserDeactivationModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  mode,
}: UserDeactivationModalProps) {
  const { users } = useUsersStore();
  const { departments } = useFieldsStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [openDropdownCount, setOpenDropdownCount] = useState(0);
  
  // Get dependencies for this user
  const dependencies = useUserDependencies(user?.id || '', user?.name || '');
  const { reassignItems } = useReassignUserItems();
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setExpandedCategories(new Set());
      setOpenDropdownCount(0);
    }
  }, [isOpen]);

  // Track dropdown open state
  const handleDropdownOpenChange = useCallback((dropdownIsOpen: boolean) => {
    setOpenDropdownCount(prev => dropdownIsOpen ? prev + 1 : Math.max(0, prev - 1));
  }, []);

  // Handle ESC key at modal level - use capture phase to intercept before Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If any dropdown is open, don't do anything (dropdown handles its own ESC)
        if (openDropdownCount > 0) {
          return;
        }
        
        // If any section is expanded, collapse the last expanded section
        if (expandedCategories.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // Get the last expanded category and collapse it
          const expandedArray = Array.from(expandedCategories);
          const lastExpanded = expandedArray[expandedArray.length - 1];
          
          if (lastExpanded) {
            setExpandedCategories(prev => {
              const next = new Set(prev);
              next.delete(lastExpanded);
              return next;
            });
          }
          return;
        }
        
        // Otherwise, close the modal (let the Modal component handle it)
      }
    };

    // Use capture phase to intercept before Modal's handler
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, openDropdownCount, expandedCategories]);
  
  // Get all positions flattened
  const allPositions = useMemo(() => {
    return departments.flatMap(d => d.positions);
  }, [departments]);
  
  // Find the chain of command for a user (returns array of userIds from direct manager up to CEO)
  const getChainOfCommand = useMemo(() => {
    return (userId: string): string[] => {
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser?.positionId) return [];
      
      const chain: string[] = [];
      let currentPositionId: string | undefined = targetUser.positionId;
      const visitedPositions = new Set<string>();
      
      while (currentPositionId) {
        // Prevent infinite loops
        if (visitedPositions.has(currentPositionId)) break;
        visitedPositions.add(currentPositionId);
        
        const position = allPositions.find(p => p.id === currentPositionId);
        if (!position) break;
        
        // Find the parent position
        const parentPositionId = position.reportsToPositionId;
        if (!parentPositionId) break;
        
        // Find active users in the parent position
        const managersInPosition = users.filter(
          u => u.positionId === parentPositionId && u.isActive && u.id !== userId
        );
        
        // Add all managers from this level
        managersInPosition.forEach(m => {
          if (!chain.includes(m.id)) {
            chain.push(m.id);
          }
        });
        
        currentPositionId = parentPositionId;
      }
      
      return chain;
    };
  }, [users, allPositions]);
  
  // Get the default reassignment target (first in chain of command)
  const defaultReassignTarget = useMemo(() => {
    if (!user?.id) return '';
    const chain = getChainOfCommand(user.id);
    return chain.length > 0 ? chain[0] : '';
  }, [user?.id, getChainOfCommand]);
  
  // Categories with their assignments
  const [categoriesWithAssignments, setCategoriesWithAssignments] = useState<CategoryWithAssignments[]>([]);
  
  // Initialize categories with default assignments when dependencies change
  useEffect(() => {
    if (dependencies.categories.length > 0) {
      setCategoriesWithAssignments(
        dependencies.categories.map(cat => ({
          module: cat.module,
          label: cat.label,
          icon: cat.icon,
          field: cat.field,
          items: cat.items,
          canReassign: cat.canReassign,
          bulkAssignTo: defaultReassignTarget || '',
          itemAssignments: Object.fromEntries(
            cat.items.map(item => [item.id, defaultReassignTarget || ''])
          ),
        }))
      );
    } else {
      setCategoriesWithAssignments([]);
    }
  }, [dependencies.categories, defaultReassignTarget]);
  
  // Get active users for reassignment (excluding the user being deactivated)
  const availableUsers = useMemo(() => {
    return users
      .filter(u => u.isActive && u.id !== user?.id)
      .map(u => ({ value: u.id, label: u.name }));
  }, [users, user?.id]);
  
  // Get chain of command as select options with indicators
  const chainOfCommandOptions = useMemo(() => {
    if (!user?.id) return [];
    const chain = getChainOfCommand(user.id);
    
    return chain.map((userId, index) => {
      const u = users.find(usr => usr.id === userId);
      const position = u?.positionId ? allPositions.find(p => p.id === u.positionId) : null;
      const label = position 
        ? `${u?.name} (${position.name})` 
        : u?.name || '';
      
      return {
        value: userId,
        label: index === 0 ? `${label} — Direct Manager` : label,
      };
    });
  }, [user?.id, getChainOfCommand, users, allPositions]);
  
  // Get other users (not in chain of command)
  const otherUserOptions = useMemo(() => {
    return availableUsers.filter(
      u => !chainOfCommandOptions.some(c => c.value === u.value)
    );
  }, [availableUsers, chainOfCommandOptions]);
  
  // Toggle category expansion
  const toggleCategory = (module: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };
  
  // Handle bulk assignment change for a category
  const handleBulkAssignChange = (categoryModule: string, userId: string) => {
    setCategoriesWithAssignments(prev => 
      prev.map(cat => {
        if (cat.module === categoryModule) {
          return {
            ...cat,
            bulkAssignTo: userId,
            // Update all items in this category to the new user
            itemAssignments: Object.fromEntries(
              cat.items.map(item => [item.id, userId])
            ),
          };
        }
        return cat;
      })
    );
  };
  
  // Handle individual item assignment change
  const handleItemAssignChange = (categoryModule: string, itemId: string, userId: string) => {
    setCategoriesWithAssignments(prev => 
      prev.map(cat => {
        if (cat.module === categoryModule) {
          const newItemAssignments = {
            ...cat.itemAssignments,
            [itemId]: userId,
          };
          
          // Check if all items now have the same assignment
          const allValues = Object.values(newItemAssignments);
          const firstValue = allValues[0] || '';
          const allSame = allValues.length > 0 && allValues.every(v => v === firstValue);
          
          return {
            ...cat,
            bulkAssignTo: allSame ? firstValue : '', // Clear bulk if mixed
            itemAssignments: newItemAssignments,
          };
        }
        return cat;
      })
    );
  };
  
  // Check if all items have assignments
  const allItemsAssigned = useMemo(() => {
    if (categoriesWithAssignments.length === 0) return true;
    return categoriesWithAssignments.every(cat => 
      cat.items.every(item => {
        const assignment = cat.itemAssignments[item.id];
        return assignment && assignment !== '';
      })
    );
  }, [categoriesWithAssignments]);
  
  // Handle confirmation
  const handleConfirm = () => {
    // Reassign items by category, grouped by target user
    categoriesWithAssignments.forEach(cat => {
      // Group items by their target user
      const itemsByTargetUser: Record<string, typeof cat.items> = {};
      
      cat.items.forEach(item => {
        const targetUserId = cat.itemAssignments[item.id];
        if (targetUserId) {
          if (!itemsByTargetUser[targetUserId]) {
            itemsByTargetUser[targetUserId] = [];
          }
          itemsByTargetUser[targetUserId].push(item);
        }
      });
      
      // For each target user, reassign their items
      Object.entries(itemsByTargetUser).forEach(([targetUserId, items]) => {
        const categoryForReassign: DependencyCategory = {
          module: cat.module,
          label: cat.label,
          icon: cat.icon,
          field: cat.field,
          items: items,
          canReassign: cat.canReassign,
        };
        reassignItems(user!.id, targetUserId, [categoryForReassign]);
      });
    });
    
    // For backward compatibility, pass the primary reassign target (first user or null)
    const primaryTarget = defaultReassignTarget || null;
    onConfirm(primaryTarget);
  };
  
  // Check if can proceed
  const canProceed = !dependencies.hasItems || allItemsAssigned;
  
  if (!user) return null;
  
  const actionWord = mode === 'deactivate' ? 'Deactivate' : 'Delete';
  const actionWordLower = mode === 'deactivate' ? 'deactivate' : 'delete';
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${actionWord} User`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={mode === 'delete' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={!canProceed}
          >
            {actionWord} User
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Warning Header */}
        <div className={clsx(
          'flex items-start gap-3 p-4 rounded-lg',
          mode === 'delete' 
            ? 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800'
            : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
        )}>
          <AlertTriangle className={clsx(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            mode === 'delete' ? 'text-danger-500' : 'text-warning-500'
          )} />
          <div>
            <p className={clsx(
              'font-medium',
              mode === 'delete' 
                ? 'text-danger-700 dark:text-danger-300'
                : 'text-warning-700 dark:text-warning-300'
            )}>
              Are you sure you want to {actionWordLower} {user.name}?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {mode === 'delete' 
                ? 'This action cannot be undone.'
                : 'The user will no longer be able to access the portal.'}
            </p>
          </div>
        </div>
        
        {/* Dependencies Section */}
        {dependencies.hasItems ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Assigned Items ({dependencies.totalCount})
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {getDependencySummary(dependencies)} All items must be reassigned before proceeding.
            </p>
            
            {/* Chain of command info */}
            {chainOfCommandOptions.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <UserCog className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Items will be reassigned to <strong>{chainOfCommandOptions[0]?.label.split(' — ')[0]}</strong> by default (chain of command).
                  You can change this per section or per item.
                </p>
              </div>
            )}
            
            {/* Categories List */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {categoriesWithAssignments.map((category) => {
                const Icon = moduleIcons[category.module] || Building2;
                const isExpanded = expandedCategories.has(category.module);
                
                // Check if this category has mixed assignments
                const assignmentValues = Object.values(category.itemAssignments);
                const hasMixedAssignments = assignmentValues.length > 0 && !assignmentValues.every(v => v === assignmentValues[0]);
                
                return (
                  <div key={category.module} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                    {/* Category Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.module)}
                        className="flex items-center gap-3 flex-1 text-left min-w-0"
                      >
                        <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {category.label}
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full flex-shrink-0">
                          {category.items.length}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      
                      {/* Bulk reassign dropdown */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:inline">Reassign all to:</span>
                        <UserSelectDropdown
                          value={category.bulkAssignTo}
                          onChange={(value) => handleBulkAssignChange(category.module, value)}
                          chainOfCommandOptions={chainOfCommandOptions}
                          otherUserOptions={otherUserOptions}
                          showMixedPlaceholder={hasMixedAssignments}
                          hasWarning={hasMixedAssignments}
                          className="w-[180px]"
                          onOpenChange={handleDropdownOpenChange}
                        />
                      </div>
                    </div>
                    
                    {/* Category Items */}
                    {isExpanded && (
                      <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {category.items.map((item) => {
                          const itemAssignment = category.itemAssignments[item.id] || '';
                          
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between py-2.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                  {item.name}
                                </span>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-500 hover:text-brand-600 flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              
                              {/* Individual item reassignment */}
                              <UserSelectDropdown
                                value={itemAssignment}
                                onChange={(value) => handleItemAssignChange(category.module, item.id, value)}
                                chainOfCommandOptions={chainOfCommandOptions}
                                otherUserOptions={otherUserOptions}
                                placeholder="Select user..."
                                hasError={!itemAssignment}
                                className="w-[180px] flex-shrink-0"
                                onOpenChange={handleDropdownOpenChange}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Validation message */}
            {!allItemsAssigned && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" />
                <p className="text-xs text-danger-700 dark:text-danger-300">
                  All items must be reassigned before you can proceed. Please select a user for each item.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Users className="w-5 h-5 text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This user has no assigned items. You can proceed with {actionWordLower}ing.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}