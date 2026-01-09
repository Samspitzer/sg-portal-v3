import { useState, useCallback, useEffect } from 'react';

interface UseDropdownKeyboardOptions<T> {
  items: T[];
  isOpen: boolean;
  onSelect: (item: T, index: number) => void;
  onClose?: () => void;
  /** If true, wraps around from last to first and vice versa */
  loop?: boolean;
  /** Optional: index of an item that should be treated as a special "add new" option at the top */
  hasAddOption?: boolean;
  /** If true, skips items with disabled property when navigating */
  skipDisabled?: boolean;
}

interface UseDropdownKeyboardReturn {
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  resetHighlight: () => void;
}

/**
 * Hook for handling keyboard navigation in dropdowns
 * 
 * Usage:
 * ```tsx
 * const { highlightedIndex, handleKeyDown } = useDropdownKeyboard({
 *   items: filteredItems,
 *   isOpen: showDropdown,
 *   onSelect: (item) => selectItem(item),
 *   onClose: () => setShowDropdown(false),
 * });
 * 
 * // In your input:
 * <input onKeyDown={handleKeyDown} />
 * 
 * // In your dropdown items:
 * {items.map((item, index) => (
 *   <button
 *     className={index === highlightedIndex ? 'bg-slate-100' : ''}
 *     ...
 *   />
 * ))}
 * ```
 */
export function useDropdownKeyboard<T>({
  items,
  isOpen,
  onSelect,
  onClose,
  loop = true,
  hasAddOption = false,
  skipDisabled = false,
}: UseDropdownKeyboardOptions<T>): UseDropdownKeyboardReturn {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Total count includes the "add new" option if present
  const totalCount = items.length + (hasAddOption ? 1 : 0);

  // Helper to check if an item is disabled
  const isItemDisabled = useCallback((index: number): boolean => {
    if (!skipDisabled) return false;
    if (hasAddOption && index === 0) return false; // "Add new" option is never disabled
    const itemIndex = hasAddOption ? index - 1 : index;
    const item = items[itemIndex] as { disabled?: boolean } | undefined;
    return item?.disabled === true;
  }, [skipDisabled, hasAddOption, items]);

  // Find next non-disabled index
  const findNextEnabled = useCallback((startIndex: number, direction: 1 | -1): number => {
    if (totalCount === 0) return -1;
    
    let index = startIndex;
    let attempts = 0;
    
    while (attempts < totalCount) {
      if (!isItemDisabled(index)) {
        return index;
      }
      index = index + direction;
      if (loop) {
        if (index >= totalCount) index = 0;
        if (index < 0) index = totalCount - 1;
      } else {
        if (index >= totalCount || index < 0) return startIndex;
      }
      attempts++;
    }
    
    return -1; // All items disabled
  }, [totalCount, loop, isItemDisabled]);

  // Reset highlight when dropdown closes or items change
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Reset highlight when items change significantly
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [items.length]);

  const resetHighlight = useCallback(() => {
    setHighlightedIndex(-1);
  }, []);

  // Helper function to select the highlighted item
  const selectHighlightedItem = useCallback(() => {
    if (highlightedIndex >= 0 && !isItemDisabled(highlightedIndex)) {
      // If hasAddOption, index 0 is the "add" option, so items start at index 1
      if (hasAddOption) {
        if (highlightedIndex === 0) {
          // The "add new" option is selected - handled by calling code via index -1
          onSelect(null as T, -1);
        } else {
          const itemIndex = highlightedIndex - 1;
          const item = items[itemIndex];
          if (item !== undefined) {
            onSelect(item, itemIndex);
          }
        }
      } else {
        const item = items[highlightedIndex];
        if (item !== undefined) {
          onSelect(item, highlightedIndex);
        }
      }
    }
  }, [highlightedIndex, hasAddOption, items, onSelect, isItemDisabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex((prev) => {
            if (totalCount === 0) return -1;
            const startIndex = prev < 0 ? 0 : (prev >= totalCount - 1 ? (loop ? 0 : prev) : prev + 1);
            return findNextEnabled(startIndex, 1);
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex((prev) => {
            if (totalCount === 0) return -1;
            const startIndex = prev <= 0 ? (loop ? totalCount - 1 : 0) : prev - 1;
            return findNextEnabled(startIndex, -1);
          });
          break;

        case 'Enter':
        case ' ': // Space key also selects
          e.preventDefault();
          e.stopPropagation();
          selectHighlightedItem();
          break;

        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
          setHighlightedIndex(-1);
          break;

        case 'Tab':
          // Close dropdown on tab but don't prevent default (allow focus to move)
          onClose?.();
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, totalCount, loop, selectHighlightedItem, onClose, findNextEnabled]
  );

  return {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    resetHighlight,
  };
}