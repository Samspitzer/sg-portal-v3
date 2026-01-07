// ============================================================================
// Address Input Component with Radar.io Autocomplete
// Location: src/components/common/AddressInput.tsx
// ============================================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Check, X, Loader2, FileText } from 'lucide-react';
import { Button } from './Button';
import { searchAddresses, isRadarConfigured, type AddressComponents } from '../../utils/addressAutocomplete';

// Inline Unsaved Changes Modal (to avoid circular dependency)
function AddressUnsavedModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  canSave,
}: {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  canSave: boolean; // Whether the current address is valid and can be saved
}) {
  const keepEditingRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      keepEditingRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onCancel} 
      />
      <div
        className="relative z-10 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Unsaved Changes
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          You have unsaved changes. What would you like to do?
        </p>
        {!canSave && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
            Note: Please select a valid address from the suggestions before saving.
          </p>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-sm font-medium rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
          >
            Discard
          </button>
          <button
            ref={keepEditingRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Keep Editing
          </button>
          {canSave && (
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-brand-500 hover:bg-brand-600 transition-colors"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface AddressData {
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressInputProps {
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
  onSave: (address: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** 
   * When true, auto-saves on selection and disables Save/Discard buttons and unsaved changes modal.
   * Use this when AddressInput is inside a parent modal that handles its own save flow.
   */
  autoSave?: boolean;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AddressInput({
  street,
  suite = '',
  city,
  state,
  zip,
  onSave,
  disabled = false,
  required = false,
  className = '',
  autoSave = false,
}: AddressInputProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Local state for editing
  const [localAddress, setLocalAddress] = useState<AddressData>({ street, suite, city, state, zip });
  
  // Track if the address was selected from API (valid) or manually typed (invalid)
  const [isValidAddress, setIsValidAddress] = useState(true);
  
  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressComponents[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Unsaved changes modal state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Check if there are ANY changes (including invalid) - for showing unsaved modal
  const hasDirtyChanges = 
    localAddress.street !== street ||
    localAddress.suite !== suite ||
    localAddress.city !== city ||
    localAddress.state !== state ||
    localAddress.zip !== zip ||
    searchQuery !== ''; // Also dirty if user is typing

  // Check if there are SAVEABLE changes (only valid addresses can be saved)
  const hasValidChanges = 
    isValidAddress && (
      localAddress.street !== street ||
      localAddress.suite !== suite ||
      localAddress.city !== city ||
      localAddress.state !== state ||
      localAddress.zip !== zip
    );

  // Update dropdown position when showing
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [showDropdown, suggestions]);

  // Scroll selected item into view when navigating with keyboard
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Reset local state when props change
  useEffect(() => {
    setLocalAddress({ street, suite, city, state, zip });
  }, [street, suite, city, state, zip]);

  // Search for addresses when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      try {
        const results = await searchAddresses(debouncedQuery);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedQuery]);

  // Show unsaved changes modal when clicking outside with changes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close dropdown if clicking outside dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      
      // Show unsaved changes modal if clicking outside container with ANY changes
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (hasDirtyChanges && !showUnsavedModal) {
          setShowUnsavedModal(true);
        }
      }
    };

    // Only add click outside listener if not in autoSave mode
    if (!autoSave) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [hasDirtyChanges, showUnsavedModal, autoSave]);

  // Handle selecting an address from suggestions
  const handleSelectAddress = useCallback((address: AddressComponents) => {
    const newAddress = {
      street: address.street,
      suite: localAddress.suite, // Keep existing suite
      city: address.city,
      state: address.state,
      zip: address.zip,
    };
    
    setLocalAddress(newAddress);
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setIsValidAddress(true); // Address selected from API is valid
    
    // Auto-save immediately when in autoSave mode
    if (autoSave) {
      onSave(newAddress);
    }
  }, [autoSave, onSave, localAddress.suite]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
      case 'Tab':
        // Both Enter and Tab select the highlighted item
        if (selectedIndex >= 0) {
          e.preventDefault();
          const selected = suggestions[selectedIndex];
          if (selected) {
            handleSelectAddress(selected);
          }
        }
        // If no item highlighted, Tab moves to next field naturally
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle street input change
  const handleStreetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setLocalAddress(prev => ({ 
      ...prev, 
      street: value,
      // Clear city, state, zip when street changes (they should come from API)
      city: '', 
      state: '', 
      zip: ''
    }));
    // Mark as invalid until user selects from dropdown
    setIsValidAddress(false);
  };

  // Handle suite input change (suite can be edited freely without invalidating)
  const handleSuiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSuite = e.target.value;
    setLocalAddress(prev => {
      const updated = { ...prev, suite: newSuite };
      // Auto-save suite changes if in autoSave mode and address is valid
      if (autoSave && isValidAddress && prev.street) {
        onSave(updated);
      }
      return updated;
    });
  };

  // Handle save
  const handleSave = () => {
    onSave(localAddress);
    setShowUnsavedModal(false);
    setIsValidAddress(true); // Reset after save
  };

  // Handle discard
  const handleDiscard = () => {
    setLocalAddress({ street, suite, city, state, zip });
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setShowUnsavedModal(false);
    setIsValidAddress(true); // Reset to valid (original state)
  };

  // Handle keep editing (close modal, stay on form)
  const handleKeepEditing = () => {
    setShowUnsavedModal(false);
  };

  const apiConfigured = isRadarConfigured();

  return (
    <>
      <div ref={containerRef} className={`space-y-3 ${className}`}>
        {/* Street Address and Suite on same row */}
        <div className="flex gap-3">
          {/* Street Address with Autocomplete */}
          <div className="relative flex-1" ref={dropdownRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Street Address
              {required && <span className="text-danger-500 ml-1">*</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="w-4 h-4 text-slate-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery || localAddress.street}
                onChange={handleStreetInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                placeholder={apiConfigured ? "Start typing an address..." : "Enter street address"}
                disabled={disabled}
                className="w-full pl-10 pr-10 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Autocomplete dropdown - rendered via portal to avoid overflow clipping */}
            {showDropdown && suggestions.length > 0 && createPortal(
              <>
                {/* Invisible backdrop to capture clicks outside dropdown */}
                <div 
                  className="fixed inset-0 z-[9998]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowDropdown(false);
                    setSelectedIndex(-1);
                  }}
                />
                {/* Dropdown list */}
                <div 
                  ref={listRef}
                  style={{
                    position: 'fixed',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                  }}
                  className="z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto overscroll-contain"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectAddress(suggestion);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
                        index === selectedIndex ? 'bg-slate-100 dark:bg-slate-700' : ''
                      }`}
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {suggestion.street}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">
                        {suggestion.city}, {suggestion.state} {suggestion.zip}
                      </div>
                    </button>
                  ))}
                </div>
              </>,
              document.body
            )}

            {!apiConfigured && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Address autocomplete not configured. Add VITE_RADAR_PUBLISHABLE_KEY to enable.
              </p>
            )}
          </div>

          {/* Suite/Unit field - on same row */}
          <div className="w-40">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Suite / Unit
            </label>
            <input
              type="text"
              value={localAddress.suite || ''}
              onChange={handleSuiteChange}
              placeholder="Suite, Apt, etc."
              disabled={disabled}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        </div>
        
        {/* City, State, ZIP - Read-only (populated from API) */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              City
            </label>
            <input
              type="text"
              value={localAddress.city}
              readOnly
              placeholder="City"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              State
            </label>
            <input
              type="text"
              value={localAddress.state}
              readOnly
              placeholder="State"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ZIP
            </label>
            <input
              type="text"
              value={localAddress.zip}
              readOnly
              placeholder="ZIP"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Helper text for incomplete address - show in both modes */}
        {!isValidAddress && localAddress.street && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Please select an address from the suggestions{autoSave ? '.' : ' to save.'}
          </p>
        )}

        {/* Save/Discard buttons - only show when NOT in autoSave mode */}
        {!autoSave && hasValidChanges && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              <Check className="w-4 h-4 mr-1" />
              Save Address
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDiscard}
            >
              <X className="w-4 h-4 mr-1" />
              Discard
            </Button>
          </div>
        )}

        {/* Show only Clear/Discard when there are invalid changes - only when NOT in autoSave mode */}
        {!autoSave && !hasValidChanges && !isValidAddress && localAddress.street && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDiscard}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Unsaved Changes Modal - only show when NOT in autoSave mode */}
      {!autoSave && (
        <AddressUnsavedModal
          isOpen={showUnsavedModal}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onCancel={handleKeepEditing}
          canSave={isValidAddress && hasValidChanges}
        />
      )}
    </>
  );
}

export default AddressInput;