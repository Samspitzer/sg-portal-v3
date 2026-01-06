// ============================================================================
// Address Input Component with Radar.io Autocomplete
// Location: src/components/common/AddressInput.tsx
// ============================================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, Check, X, Loader2, FileText } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { searchAddresses, isRadarConfigured, type AddressComponents } from '../../utils/addressAutocomplete';

// Inline Unsaved Changes Modal (to avoid circular dependency)
function AddressUnsavedModal({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
}: {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
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
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          You have unsaved changes. What would you like to do?
        </p>
        <div className="flex justify-end gap-3">
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
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-brand-500 hover:bg-brand-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressInputProps {
  street: string;
  city: string;
  state: string;
  zip: string;
  onSave: (address: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
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
  city,
  state,
  zip,
  onSave,
  disabled = false,
  required = false,
  className = '',
}: AddressInputProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Local state for editing
  const [localAddress, setLocalAddress] = useState<AddressData>({ street, city, state, zip });
  
  // Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressComponents[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // Unsaved changes modal state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Check if there are unsaved changes
  const hasChanges = 
    localAddress.street !== street ||
    localAddress.city !== city ||
    localAddress.state !== state ||
    localAddress.zip !== zip;

  // Reset local state when props change
  useEffect(() => {
    setLocalAddress({ street, city, state, zip });
  }, [street, city, state, zip]);

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
      
      // Show unsaved changes modal if clicking outside container with changes
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (hasChanges && !showUnsavedModal) {
          setShowUnsavedModal(true);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hasChanges, showUnsavedModal]);

  // Handle selecting an address from suggestions
  const handleSelectAddress = useCallback((address: AddressComponents) => {
    setLocalAddress({
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
    });
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  }, []);

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
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        if (selectedIndex >= 0 && selected) {
          handleSelectAddress(selected);
        }
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
    setLocalAddress(prev => ({ ...prev, street: value }));
  };

  // Handle save
  const handleSave = () => {
    onSave(localAddress);
    setShowUnsavedModal(false);
  };

  // Handle discard
  const handleDiscard = () => {
    setLocalAddress({ street, city, state, zip });
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setShowUnsavedModal(false);
  };

  // Handle keep editing (close modal, stay on form)
  const handleKeepEditing = () => {
    setShowUnsavedModal(false);
  };

  // Handle other field changes
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalAddress(prev => ({ ...prev, city: e.target.value }));
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalAddress(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }));
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d-]/g, '').slice(0, 10);
    setLocalAddress(prev => ({ ...prev, zip: value }));
  };

  const apiConfigured = isRadarConfigured();

  return (
    <>
      <div ref={containerRef} className={`space-y-3 ${className}`}>
        {/* Street Address with Autocomplete */}
        <div className="relative" ref={dropdownRef}>
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

          {/* Autocomplete dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectAddress(suggestion)}
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
          )}

          {!apiConfigured && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Address autocomplete not configured. Add VITE_RADAR_PUBLISHABLE_KEY to enable.
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="City"
            value={localAddress.city}
            onChange={handleCityChange}
            placeholder="New York"
            disabled={disabled}
            disableAutoValidation
          />
          <Input
            label="State"
            value={localAddress.state}
            onChange={handleStateChange}
            placeholder="NY"
            maxLength={2}
            disabled={disabled}
            disableAutoValidation
          />
          <Input
            label="ZIP"
            value={localAddress.zip}
            onChange={handleZipChange}
            placeholder="10001"
            maxLength={10}
            disabled={disabled}
            disableAutoValidation
          />
        </div>

        {/* Save/Discard buttons */}
        {hasChanges && (
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
      </div>

      {/* Unsaved Changes Modal */}
      <AddressUnsavedModal
        isOpen={showUnsavedModal}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleKeepEditing}
      />
    </>
  );
}

export default AddressInput;