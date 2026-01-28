// ============================================================================
// Inline Select Field Component
// Location: src/components/common/InlineSelectField.tsx
// 
// Compact inline editable dropdown field with keyboard navigation,
// unsaved changes modal, and optional review state.
// 
// Features:
// - Click to edit, opens dropdown
// - Arrow keys navigate, Enter selects
// - Tab navigation between fields
// - Unsaved changes modal on navigation away
// - Optional "Needs Review" indicator with confirm button
// ============================================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { clsx } from 'clsx';
import { Check, X, Pencil, ChevronDown } from 'lucide-react';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { useDropdownKeyboard } from '@/hooks';

export interface InlineSelectOption {
  value: string;
  label: string;
}

export interface InlineSelectFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: string;
  /** Available options */
  options: InlineSelectOption[] | string[];
  /** Called when value is saved */
  onSave: (value: string) => void;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Icon component to show before value */
  icon?: React.ElementType;
  /** Callback when editing state changes */
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
  /** Show "Needs Review" badge */
  needsReview?: boolean;
  /** Called when user confirms the value (for review state) */
  onConfirm?: () => void;
  /** Disable editing */
  disabled?: boolean;
  /** Allow empty/no selection (shows "None" or placeholder) */
  allowEmpty?: boolean;
  /** Label for empty option */
  emptyLabel?: string;
  /** Additional CSS class for container */
  className?: string;
}

export function InlineSelectField({
  label,
  value,
  options: rawOptions,
  onSave,
  placeholder = 'Click to select...',
  icon: Icon,
  onEditingChange,
  needsReview,
  onConfirm,
  disabled = false,
  allowEmpty = true,
  emptyLabel = 'None',
  className,
}: InlineSelectFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Keep callback ref stable
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  // Normalize options to InlineSelectOption[]
  const options = useMemo<InlineSelectOption[]>(() => {
    const normalized = rawOptions.map(opt => 
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
    
    // Add empty option at the start if allowed
    if (allowEmpty) {
      return [{ value: '', label: emptyLabel }, ...normalized];
    }
    return normalized;
  }, [rawOptions, allowEmpty, emptyLabel]);

  // Get display label for a value
  const getDisplayLabel = (val: string): string => {
    if (!val) return emptyLabel;
    const opt = options.find(o => o.value === val);
    return opt?.label || val;
  };

  // Sync edit value when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  // Notify parent of editing state changes
  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for dropdown
  const dropdownKeyboard = useDropdownKeyboard({
    items: options,
    isOpen: showDropdown,
    onSelect: (option) => {
      if (option) {
        setEditValue(option.value);
        setShowDropdown(false);
      }
    },
    onClose: () => setShowDropdown(false),
  });

  // Move to next InlineEditField on Tab
  const moveToNextField = () => {
    const focusableElements = document.querySelectorAll('[data-inline-field="true"]');
    const currentIndex = Array.from(focusableElements).findIndex(
      (el) => el === fieldRef.current || el.contains(fieldRef.current)
    );
    const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
    if (nextElement) {
      nextElement.focus();
      nextElement.click();
    }
  };

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
    setShowModal(false);
    setShowDropdown(false);
    onConfirm?.(); // Mark as confirmed when saved
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleDiscard = () => {
    setEditValue(value);
    setIsEditing(false);
    setShowModal(false);
    setShowDropdown(false);
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleKeepEditing = () => {
    setShowModal(false);
    setPendingTab(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Block all keys when modal is showing
    if (showModal) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Handle dropdown navigation
    if (showDropdown) {
      dropdownKeyboard.handleKeyDown(e);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        return;
      }
    }

    // Enter when dropdown is closed - show modal if changes
    if (e.key === 'Enter' && !showDropdown) {
      e.preventDefault();
      if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setPendingTab(false);
      if (showDropdown) {
        setShowDropdown(false);
      } else if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
      if (hasChanges) {
        setPendingTab(true);
        setShowModal(true);
      } else {
        setIsEditing(false);
        moveToNextField();
      }
    } else if (e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
    }
  };

  const handleViewKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsEditing(true);
      setTimeout(() => setShowDropdown(true), 0);
    }
  };

  const selectOption = (optionValue: string) => {
    setEditValue(optionValue);
    setShowDropdown(false);
  };

  // Handle confirm without changes (just mark as reviewed)
  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EDITING MODE
  // ─────────────────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <>
        <div className={clsx("space-y-1", className)} data-inline-field="true" ref={fieldRef}>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="flex-1 px-3 py-1.5 text-sm border border-brand-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-left flex items-center justify-between"
              >
                <span className={editValue ? '' : 'text-slate-400'}>
                  {getDisplayLabel(editValue)}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={handleSave}
                tabIndex={-1}
                className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded-lg transition-colors"
                title="Save (Enter)"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => (hasChanges ? setShowModal(true) : setIsEditing(false))}
                tabIndex={-1}
                className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Cancel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {options.map((option, index) => (
                  <button
                    key={option.value || '__empty__'}
                    type="button"
                    onClick={() => selectOption(option.value)}
                    className={clsx(
                      'w-full px-4 py-2 text-left text-sm transition-colors',
                      index === dropdownKeyboard.highlightedIndex
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white',
                      option.value === editValue && 'font-medium'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <UnsavedChangesModal
          isOpen={showModal}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onCancel={handleKeepEditing}
        />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW MODE
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      data-inline-field="true"
      ref={fieldRef}
      tabIndex={disabled ? -1 : 0}
      className={clsx(
        'group cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 -mx-2 px-2 py-1 rounded-lg transition-colors',
        !disabled && 'hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50',
        disabled && 'cursor-default opacity-70',
        className
      )}
      onClick={() => !disabled && setIsEditing(true)}
      onKeyDown={handleViewKeyDown}
    >
      {/* Label row with needsReview badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </span>
          {needsReview && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              Needs Review
            </span>
          )}
        </div>
        {needsReview && onConfirm && (
          <button
            onClick={handleConfirmClick}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium flex items-center gap-1"
            title="Confirm this value is correct"
          >
            <Check className="w-3 h-3" />
            Confirm
          </button>
        )}
      </div>
      
      {/* Value row */}
      <div className="flex items-center gap-2 mt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <span className={clsx(
          'text-sm',
          value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'
        )}>
          {value ? getDisplayLabel(value) : placeholder}
        </span>
        {!disabled && (
          <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
        )}
      </div>
    </div>
  );
}

export default InlineSelectField;