// ============================================================================
// Inline Edit Field Component
// Location: src/components/common/InlineEditField.tsx
// 
// Compact inline editable field with validation, keyboard navigation,
// unsaved changes modal, and optional review state.
// 
// Features:
// - Click to edit, Enter to save, Escape to cancel
// - Tab navigation between fields
// - Phone number auto-formatting
// - Real-time validation (email, phone, URL)
// - Unsaved changes modal on navigation away
// - Optional "Needs Review" indicator with confirm button
// - Supports text, email, tel, url, and textarea types
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Check, X, Pencil } from 'lucide-react';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { useToast } from '@/contexts';
import {
  formatPhoneNumber,
  validatePhone,
  validateEmail,
  validateWebsite,
} from '@/utils/validation';

export interface InlineEditFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: string;
  /** Called when value is saved */
  onSave: (value: string) => void;
  /** Input type - determines validation and formatting */
  type?: 'text' | 'tel' | 'email' | 'url' | 'textarea';
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
  /** Number of rows for textarea type */
  rows?: number;
  /** Additional CSS class for container */
  className?: string;
}

export function InlineEditField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
  icon: Icon,
  onEditingChange,
  needsReview,
  onConfirm,
  disabled = false,
  rows = 3,
  className,
}: InlineEditFieldProps) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showModal, setShowModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Keep callback ref stable
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  // Sync edit value when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const hasChanges = editValue !== value;

  // Notify parent of editing state changes
  useEffect(() => {
    onEditingChangeRef.current?.(isEditing, hasChanges);
  }, [isEditing, hasChanges]);

  // Validation based on type
  const getValidationError = (val: string): string | null => {
    if (!val) return null;
    
    switch (type) {
      case 'tel':
        return validatePhone(val) ? null : 'Invalid phone number';
      case 'email':
        return validateEmail(val) ? null : 'Invalid email address';
      case 'url':
        return validateWebsite(val) ? null : 'Invalid website URL';
      default:
        return null;
    }
  };

  // Handle input changes with phone formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // Auto-format phone numbers when adding digits
    if (type === 'tel') {
      const currentDigits = editValue.replace(/\D/g, '').length;
      const newDigits = newValue.replace(/\D/g, '').length;
      
      if (newDigits > currentDigits) {
        newValue = formatPhoneNumber(newValue);
      }
    }
    
    setEditValue(newValue);
    setValidationError(getValidationError(newValue));
  };

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
    const error = getValidationError(editValue);
    if (error) {
      setValidationError(error);
      return;
    }
    
    // Format phone on save
    const finalValue = type === 'tel' && editValue ? formatPhoneNumber(editValue) : editValue;
    
    onSave(finalValue);
    setIsEditing(false);
    setShowModal(false);
    setValidationError(null);
    onConfirm?.(); // Also confirm if needsReview
    
    if (pendingTab) {
      setPendingTab(false);
      setTimeout(moveToNextField, 0);
    }
  };

  const handleDiscard = (showDiscardToast = false) => {
    if (showDiscardToast && validationError) {
      toast.error('Not Saved', 'Changes discarded due to invalid value');
    }
    setEditValue(value);
    setIsEditing(false);
    setShowModal(false);
    setValidationError(null);
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

    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setPendingTab(false);
      if (validationError) {
        handleDiscard(true);
      } else if (hasChanges) {
        setShowModal(true);
      } else {
        setIsEditing(false);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (validationError) {
        toast.error('Invalid Value', validationError);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
        return;
      }
      if (hasChanges) {
        setPendingTab(true);
        setShowModal(true);
      } else {
        setIsEditing(false);
        moveToNextField();
      }
    }
  };

  const handleViewKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsEditing(true);
    }
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
    const inputClassName = clsx(
      "flex-1 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2",
      validationError 
        ? "border-danger-500 focus:ring-danger-500" 
        : "border-brand-500 focus:ring-brand-500"
    );

    return (
      <>
        <div className={clsx("space-y-1", className)} data-inline-field="true" ref={fieldRef}>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <div className="flex items-center gap-2">
            {type === 'textarea' ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                autoFocus
                className={inputClassName}
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type === 'tel' ? 'text' : type}
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus
                className={inputClassName}
              />
            )}
            <button
              onClick={handleSave}
              tabIndex={-1}
              className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded-lg transition-colors"
              title="Save (Enter)"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (validationError) {
                  handleDiscard(true);
                } else if (hasChanges) {
                  setShowModal(true);
                } else {
                  setIsEditing(false);
                }
              }}
              tabIndex={-1}
              className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {validationError && (
            <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">
              {validationError}
            </p>
          )}
        </div>

        <UnsavedChangesModal
          isOpen={showModal}
          onSave={handleSave}
          onDiscard={() => handleDiscard(false)}
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
          {value || placeholder || 'Click to add...'}
        </span>
        {!disabled && (
          <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity ml-auto" />
        )}
      </div>
    </div>
  );
}

export default InlineEditField;