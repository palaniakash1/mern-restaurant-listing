import { useState, useRef, useEffect } from 'react';
import { HiSearch, HiChevronDown, HiX } from 'react-icons/hi';
import { joinClasses } from '../../utils/publicPage';

export function SearchableDropdown({
  options = [],
  value = '',
  onChange,
  placeholder = 'Search...',
  searchPlaceholder = 'Type to search...',
  icon: Icon,
  allowClear = true,
  className = '',
  searchValue = '',
  onSearchChange = null,
  emptyMessage = 'Type to search...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onSearchChange) onSearchChange('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearchChange]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    if (onSearchChange) onSearchChange('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    if (onSearchChange) onSearchChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={joinClasses('relative w-full', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={joinClasses(
          'w-full flex items-center px-6 py-4 bg-white rounded-md transition-all',
          'hover:bg-[#f8fbf1] focus:outline-none',
          isOpen ? 'ring-2 ring-[#8fa31e] ring-offset-2' : ''
        )}
      >
        {Icon && <Icon className="text-[#576500] mr-3 w-5 h-5 flex-shrink-0" />}
        <span className={joinClasses(
          'flex-1 text-left truncate',
          selectedOption ? 'text-[#171d13] font-medium' : 'text-gray-400'
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {allowClear && value && (
          <HiX
            className="w-4 h-4 text-gray-400 hover:text-gray-600 mr-2 flex-shrink-0"
            onClick={handleClear}
          />
        )}
        <HiChevronDown
          className={joinClasses(
            'text-gray-400 transition-transform flex-shrink-0',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center px-3 py-2 bg-gray-50 rounded-md">
              <HiSearch className="w-4 h-4 text-gray-400 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm text-[#171d13] placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {!searchValue ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                {emptyMessage}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No results found for "{searchValue}"
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={joinClasses(
                    'w-full px-4 py-3 text-left text-sm transition-colors',
                    option.value === value
                      ? 'bg-[#8fa31e]/10 text-[#576500] font-medium'
                      : 'text-[#171d13] hover:bg-gray-50'
                  )}
                >
                  {option.icon && <span className="mr-2">{option.icon}</span>}
                  {option.label}
                  {option.sublabel && (
                    <span className="block text-xs text-gray-500 mt-0.5">{option.sublabel}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableDropdown;
