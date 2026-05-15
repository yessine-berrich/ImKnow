// components/chat/SearchBar.tsx
import React, { useRef, useEffect, useCallback } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onClear?: () => void;
  isLoading?: boolean;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 500;

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Rechercher…',
  value,
  onChange,
  onFocus,
  onClear,
  isLoading = false,
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Clear any pending debounce when the component unmounts to avoid memory leaks
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      const query = e.target.value.trim();
      if (query) {
        debounceTimer.current = setTimeout(() => onSearch(query), DEBOUNCE_MS);
      } else {
        // Immediately clear results when the input is emptied
        onSearch('');
      }
    },
    [onChange, onSearch],
  );

  const handleClear = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (onClear) {
      onClear();
    } else {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      onSearch('');
    }
    inputRef.current?.focus();
  }, [onClear, onChange, onSearch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (value.trim()) onSearch(value.trim());
    },
    [value, onSearch],
  );

  return (
    <form onSubmit={handleSubmit} className="relative w-full" role="search">
      <div className="relative">
        {/* Search / loading icon */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isLoading ? (
            <svg
              className="w-4 h-4 text-[#00926B] animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00926B] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Keyboard shortcut hint */}
        {!value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-400 rounded">
              ⌘K
            </kbd>
          </div>
        )}
      </div>
    </form>
  );
};

export default SearchBar;