import { useMemo } from 'react';
import clsx from 'clsx';

const ALPHABET = ['All', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

interface AlphabetFilterProps {
  /** Currently selected letter (null or 'All' for no filter) */
  selected: string | null;
  /** Callback when a letter is clicked */
  onSelect: (letter: string | null) => void;
  /** Array of strings to check which letters have items */
  items: string[];
  /** Optional className for the container */
  className?: string;
}

export function AlphabetFilter({ selected, onSelect, items, className }: AlphabetFilterProps) {
  // Calculate which letters have at least one item
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    items.forEach((item) => {
      const firstChar = item?.charAt(0);
      if (firstChar) {
        const firstLetter = firstChar.toUpperCase();
        if (firstLetter >= 'A' && firstLetter <= 'Z') {
          letters.add(firstLetter);
        }
      }
    });
    return letters;
  }, [items]);

  const handleClick = (letter: string) => {
    if (letter === 'All') {
      onSelect(null);
    } else {
      onSelect(letter === selected ? null : letter);
    }
  };

  return (
    <div className={clsx('flex flex-wrap gap-1', className)}>
      {ALPHABET.map((letter) => {
        const isAll = letter === 'All';
        const isSelected = isAll ? !selected : selected === letter;
        const hasItems = isAll || availableLetters.has(letter);

        return (
          <button
            key={letter}
            type="button"
            onClick={() => handleClick(letter)}
            disabled={!hasItems}
            className={clsx(
              'min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-all',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
              isSelected && hasItems && [
                'bg-brand-600 text-white',
                'hover:bg-brand-700',
              ],
              !isSelected && hasItems && [
                'bg-slate-100 dark:bg-slate-800',
                'text-slate-700 dark:text-slate-300',
                'hover:bg-slate-200 dark:hover:bg-slate-700',
              ],
              !hasItems && [
                'bg-slate-50 dark:bg-slate-900',
                'text-slate-300 dark:text-slate-600',
                'cursor-not-allowed',
              ]
            )}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}