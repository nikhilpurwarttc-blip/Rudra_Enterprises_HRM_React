import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Loader2, Plus } from 'lucide-react';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select...",
  label,
  required = false,
  className = "",
  btnClass = "",
  isLoading = false,
  onAdd,
  addLabel = 'Add new',
  addDisabled = false,
  error,
  disabled = false,
  clearable = true,
  multiSelect = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const filtered = options.filter(opt =>
    opt?.label != null && (opt.searchText ?? String(opt.label)).toLowerCase().includes(search.toLowerCase())
  );

  const selectedValues = multiSelect ? (Array.isArray(value) ? value : []) : [];
  const selected = multiSelect ? null : options.find(opt => opt.value === value);
  const selectedOptions = multiSelect
    ? options.filter((opt) => selectedValues.some((selectedValue) => String(selectedValue) === String(opt.value)))
    : [];
  const isSelected = (option) => multiSelect
    ? selectedValues.some((selectedValue) => String(selectedValue) === String(option.value))
    : option.value === value;

  const handleOptionChange = (option) => {
    if (!multiSelect) {
      onChange(option.value);
      setIsOpen(false);
      setSearch('');
      return;
    }

    const nextValues = isSelected(option)
      ? selectedValues.filter((selectedValue) => String(selectedValue) !== String(option.value))
      : [...selectedValues, option.value];
    onChange(nextValues);
  };

  const DROPDOWN_HEIGHT = 256; // max-h-60 (240px) + search bar (~40px)
  const GAP = 4;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = document.documentElement.clientWidth;
    const w = Math.max(rect.width, 240);
    const left = Math.max(8, Math.min(rect.left, vw - w - 8));
    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const openAbove = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
    setDropdownStyle({
      position: 'fixed',
      ...(openAbove
        ? { bottom: vh - rect.top + GAP }
        : { top: rect.bottom + GAP }),
      left,
      width: 'auto',
      minWidth: w,
      maxWidth: 300,
      zIndex: 9999,
    });
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(prev => {
      if (!prev) setSearch('');
      return !prev;
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    const handleScroll = () => updatePosition();
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="pointer-events-none absolute -top-2 left-3 z-10 bg-(--color-bg-elevated) px-1 text-xs leading-none text-(--color-text-muted)">
          {label}{required && <span className="ml-1 text-(--color-danger)">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && handleOpen()}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex min-h-12.5 w-full items-center justify-between rounded-md border bg-transparent px-3 text-sm text-(--color-text) transition-colors focus:outline-none focus:ring-1 ${error ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)' : 'border-(--color-border-strong) focus:border-(--color-accent) focus:ring-(--color-accent)'} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-(--color-accent)'} ${btnClass}`}
      >
        <span className={selected || selectedOptions.length > 0 ? 'text-(--color-text)' : 'text-(--color-text-muted)'}>
          {isLoading
            ? 'Loading...'
            : multiSelect
              ? selectedOptions.length > 0
                ? `${selectedOptions.length} selected`
                : placeholder
              : (selected?.labelNode || selected?.label || placeholder)}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clearable && (selected || selectedOptions.length > 0) && !disabled && !isLoading && (
            <span
              role="button"
              aria-label="Clear"
              onMouseDown={(e) => { e.stopPropagation(); onChange(multiSelect ? [] : ''); }}
              className="text-(--color-text-muted) hover:text-(--color-text)"
            >
              <X size={14} />
            </span>
          )}
          {isLoading
            ? <Loader2 size={16} className="animate-spin text-(--color-text-muted)" />
            : <ChevronDown size={16} className={`text-(--color-text-muted) transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          }
        </span>
      </button>
      
      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="max-h-60 overflow-hidden rounded-md border border-(--color-border-strong) bg-(--color-bg-elevated) text-(--color-text) shadow-lg">
          <div className="border-b border-(--color-border) p-2">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-(--color-text-muted)" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-(--color-text) outline-none placeholder:text-(--color-text-muted)"
                autoFocus
                autoComplete="off"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-(--color-text-muted) hover:text-(--color-text)">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {onAdd && (
              <button
                type="button"
                disabled={addDisabled}
                onClick={() => {
                  if (!addDisabled) {
                    onAdd();
                    setIsOpen(false);
                    setSearch('');
                  }
                }}
                className={`flex w-full items-center gap-2 border-b border-(--color-border) px-3 py-2 text-left text-sm font-medium hover:bg-(--color-accent-soft) ${
                  addDisabled ? 'cursor-not-allowed text-(--color-text-muted)' : 'text-(--color-accent)'
                }`}
              >
                <Plus size={14} />
                {addLabel}
              </button>
            )}
            {filtered.length > 0 ? (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role={multiSelect ? 'option' : undefined}
                  aria-selected={multiSelect ? isSelected(opt) : undefined}
                  onClick={() => handleOptionChange(opt)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-(--color-accent-soft) ${
                    isSelected(opt) ? 'bg-(--color-accent-soft) text-(--color-accent)' : 'text-(--color-text)'
                  }`}
                >
                  {multiSelect && (
                    <input
                      type="checkbox"
                      tabIndex={-1}
                      checked={isSelected(opt)}
                      readOnly
                      aria-hidden="true"
                      className="h-4 w-4 accent-primary-600"
                    />
                  )}
                  {opt.labelNode || opt.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-(--color-text-muted)">No results found</div>
            )}
          </div>
        </div>,
        document.body
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default SearchableSelect;
