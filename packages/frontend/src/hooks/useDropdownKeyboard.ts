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
}: UseDropdownKeyboardOptions<T>): UseDropdownKeyboardReturn {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Total count includes the "add new" option if present
  const totalCount = items.length + (hasAddOption ? 1 : 0);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex((prev) => {
            if (totalCount === 0) return -1;
            if (prev < 0) return 0;
            if (prev >= totalCount - 1) {
              return loop ? 0 : prev;
            }
            return prev + 1;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          setHighlightedIndex((prev) => {
            if (totalCount === 0) return -1;
            if (prev <= 0) {
              return loop ? totalCount - 1 : 0;
            }
            return prev - 1;
          });
          break;

        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          if (highlightedIndex >= 0) {
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
    [isOpen, totalCount, highlightedIndex, items, onSelect, onClose, loop, hasAddOption]
  );

  return {
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
    resetHighlight,
  };
}