import { useState, useRef, useEffect } from 'react';

export default function MultiSelectSearch({
  options = [],
  selectedIds = [],
  onChange,
  placeholder = 'Search and select...',
  label = 'Select options'
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt._id));
  const filteredOptions = options.filter(
    (opt) =>
      !selectedIds.includes(opt._id) &&
      opt.name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    onChange([...selectedIds, id]);
    setSearch('');
    inputRef.current?.focus();
  };

  const handleRemove = (id) => {
    onChange(selectedIds.filter((sid) => sid !== id));
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <div
          className="min-h-[42px] w-full rounded-lg border border-[#dce6c1] bg-white px-3 py-2 cursor-pointer flex flex-wrap gap-1 items-center"
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt._id}
                className="inline-flex items-center gap-1 rounded-full bg-[#f5faeb] border border-[#dce6c1] px-2 py-1 text-xs text-[#4d6518]"
              >
                {opt.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(opt._id);
                  }}
                  className="ml-1 text-[#4d6518] hover:text-[#8fa31e]"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))
          )}
        </div>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#dce6c1] bg-white shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-[#dce6c1]">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search restaurants..."
                className="w-full px-2 py-1 text-sm border border-[#dce6c1] rounded focus:outline-none focus:border-[#8fa31e]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">No results found</div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt._id}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[#f5faeb] transition-colors"
                    onClick={() => handleSelect(opt._id)}
                  >
                    {opt.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}