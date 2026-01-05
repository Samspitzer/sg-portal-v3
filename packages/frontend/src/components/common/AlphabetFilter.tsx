import { useMemo } from 'react';
import clsx from 'clsx';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface AlphabetFilterProps {
  /** Currently selected letter/number (null or 'All' for no filter) */
  selected: string | null;
  /** Callback when a letter/number is clicked */
  onSelect: (letter: string | null) => void;
  /** Array of strings to check which letters/numbers have items */
  items: string[];
  /** Optional className for the container */
  className?: string;
}

export function AlphabetFilter({ selected, onSelect, items, className }: AlphabetFilterProps) {
  // Calculate which letters and numbers have at least one item
  const { availableLetters, availableNumbers } = useMemo(() => {
    const letters = new Set<string>();
    const numbers = new Set<string>();
    
    items.forEach((item) => {
      const firstChar = item?.charAt(0);
      if (firstChar) {
        const upperChar = firstChar.toUpperCase();
        if (upperChar >= 'A' && upperChar <= 'Z') {
          letters.add(upperChar);
        } else if (firstChar >= '0' && firstChar <= '9') {
          numbers.add(firstChar);
        }
      }
    });
    
    return { availableLetters: letters, availableNumbers: numbers };
  }, [items]);

  // Build the filter options dynamically - only include numbers that have items
  const filterOptions = useMemo(() => {
    const options = ['All'];
    
    // Add only numbers that have items (in order)
    NUMBERS.forEach((num) => {
      if (availableNumbers.has(num)) {
        options.push(num);
      }
    });
    
    // Add all letters
    options.push(...LETTERS);
    
    return options;
  }, [availableNumbers]);

  const handleClick = (option: string) => {
    if (option === 'All') {
      onSelect(null);
    } else {
      // Toggle off if clicking the same option
      onSelect(option === selected ? null : option);
    }
  };

  return (
    <div 
      className={clsx(
        'flex items-center justify-between w-full',
        className
      )}
    >
      {filterOptions.map((option) => {
        const isAll = option === 'All';
        const isNumber = option >= '0' && option <= '9';
        const isSelected = isAll ? !selected : selected === option;
        
        // Numbers in the list are always available (we only added ones with items)
        // Letters need to be checked
        const hasItems = isAll || isNumber || availableLetters.has(option);

        return (
          <button
            key={option}
            type="button"
            onClick={() => handleClick(option)}
            disabled={!hasItems}
            className={clsx(
              // Fixed width based on content, minimal padding
              'h-7 text-xs font-medium rounded transition-all flex-shrink-0',
              'focus:outline-none focus:ring-1 focus:ring-brand-500',
              // "All" button needs more width
              isAll ? 'px-2' : 'w-6',
              'flex items-center justify-center',
              isSelected && hasItems && [
                'bg-brand-600 text-white',
                'hover:bg-brand-700',
              ],
              !isSelected && hasItems && [
                'bg-slate-100 dark:bg-slate-800',
                'text-slate-600 dark:text-slate-300',
                'hover:bg-slate-200 dark:hover:bg-slate-700',
              ],
              !hasItems && [
                'bg-transparent',
                'text-slate-300 dark:text-slate-600',
                'cursor-not-allowed',
              ]
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}