import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';

const normalizePagedResponse = (payload) => {
  const collection = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const meta = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload.meta ?? payload
    : {};

  const currentPage = Number(meta.current_page ?? meta.page ?? 1) || 1;
  const perPage = Number(meta.per_page ?? meta.perPage ?? 15) || 15;
  const total = Number(meta.total ?? collection.length ?? 0) || 0;
  const lastPage = Number(meta.last_page ?? meta.lastPage ?? Math.max(1, Math.ceil(total / perPage))) || 1;
  const hasMore = meta.has_more ?? meta.hasMore ?? currentPage < lastPage;

  return {
    items: collection,
    currentPage,
    hasMore,
  };
};

const dedupeByValue = (items, getValue) => {
  const seen = new Set();

  return items.filter((item) => {
    const value = getValue(item);
    const key = String(value ?? '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const AsyncSearchableSelect = ({
  label,
  value,
  onChange,
  placeholder = 'Select...',
  helperText,
  error,
  required = false,
  disabled = false,
  clearable = true,
  multiple = false,
  loadOptions,
  selectedOptions = [],
  getOptionValue = (option) => option?.id,
  getOptionLabel = (option) => option?.name ?? option?.label ?? '',
  className = '',
  buttonClassName = '',
  emptyMessage = 'No results found',
  minSearchLength = 0,
  debounceMs = 300,
  perPage = 15,
}) => {
  const inputId = useId();
  const searchRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState({});

  const selectedValues = multiple
    ? Array.isArray(value) ? value : []
    : value == null || value === '' ? [] : [value];

  const derivedSelectedOptions = useMemo(() => {
    const available = [...options, ...selectedOptions];
    const unique = dedupeByValue(available, getOptionValue);

    if (multiple) {
      return unique.filter((option) => selectedValues.some((selectedValue) => String(getOptionValue(option)) === String(selectedValue)));
    }

    return unique.filter((option) => String(getOptionValue(option)) === String(selectedValues[0] ?? ''));
  }, [getOptionValue, multiple, options, selectedOptions, selectedValues]);

  const labelSummary = useMemo(() => {
    if (multiple) {
      if (!selectedValues.length) return placeholder;
      return `${selectedValues.length} selected`;
    }

    const selectedOption = derivedSelectedOptions[0];
    return selectedOption ? getOptionLabel(selectedOption) : placeholder;
  }, [derivedSelectedOptions, getOptionLabel, multiple, placeholder, selectedValues]);

  const allOptions = useMemo(
    () => dedupeByValue([...options, ...selectedOptions], getOptionValue),
    [getOptionValue, options, selectedOptions],
  );

  const visibleOptions = multiple
    ? allOptions.filter((option) => selectedValues.every((selectedValue) => String(getOptionValue(option)) !== String(selectedValue)) || selectedValues.length === 0)
    : allOptions;

  const shouldFetchInitial = typeof loadOptions === 'function' && !disabled;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(inputValue.trim()), debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, inputValue]);

  const loadPage = async (nextPage = 1, replace = true) => {
    if (!loadOptions || disabled) return;
    if (debouncedSearch.length > 0 && debouncedSearch.length < minSearchLength) return;

    const requestSearch = debouncedSearch;
    const requestPage = nextPage;

    try {
      if (replace) {
        setLoading(true);
        setErrorMessage('');
      } else {
        setLoadingMore(true);
      }

      const response = await loadOptions({
        search: requestSearch,
        page: requestPage,
        perPage,
      });

      const { items, hasMore: nextHasMore } = normalizePagedResponse(response);

      if (requestSearch !== debouncedSearch || requestPage !== (replace ? 1 : page)) {
        return;
      }

      setOptions((current) => {
        const fresh = replace ? items : [...current, ...items];
        return dedupeByValue(fresh, getOptionValue);
      });
      setPage(requestPage);
      setHasMore(nextHasMore);
      setErrorMessage('');
    } catch {
      setErrorMessage('Unable to load options');
    } finally {
      if (replace) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !shouldFetchInitial) return;
    setOptions([]);
    setPage(1);
    setHasMore(false);
    setErrorMessage('');
    loadPage(1, true);
  }, [isOpen, debouncedSearch, shouldFetchInitial]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const gap = 6;
    const dropdownHeight = 320;
    const availableBelow = viewportHeight - rect.bottom - gap;
    const availableAbove = rect.top - gap;
    const shouldOpenAbove = availableBelow < dropdownHeight && availableAbove > availableBelow;
    const width = Math.max(rect.width, 240);

    setDropdownStyle({
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, viewportWidth - width - 8)),
      width: 'auto',
      minWidth: width,
      maxWidth: 300,
      ...(shouldOpenAbove ? { bottom: viewportHeight - rect.top + gap } : { top: rect.bottom + gap }),
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handlePointerDown = (event) => {
      const clickedTrigger = triggerRef.current?.contains(event.target);
      const clickedDropdown = dropdownRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => updatePosition();
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen((current) => !current);
  };

  const handleSelection = (option) => {
    const optionValue = getOptionValue(option);

    if (multiple) {
      const rawValues = selectedValues;
      const nextValues = rawValues.some((selectedValue) => String(selectedValue) === String(optionValue))
        ? rawValues.filter((selectedValue) => String(selectedValue) !== String(optionValue))
        : [...rawValues, optionValue];
      onChange(nextValues);
      return;
    }

    onChange(optionValue, option);
    setIsOpen(false);
    setInputValue('');
    setDebouncedSearch('');
  };

  const handleClear = (event) => {
    event.stopPropagation();
    if (multiple) onChange([]);
    else onChange('');
  };

  const handleKeyDown = (event) => {
    if (!isOpen || !allOptions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % allOptions.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + allOptions.length) % allOptions.length);
    }

    if (event.key === 'Enter' && allOptions[activeIndex]) {
      event.preventDefault();
      handleSelection(allOptions[activeIndex]);
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPage(nextPage, false);
  };

  const renderOption = (option) => {
    const optionValue = getOptionValue(option);
    const isSelected = multiple
      ? selectedValues.some((selectedValue) => String(selectedValue) === String(optionValue))
      : String(selectedValues[0] ?? '') === String(optionValue);

    return (
      <button
        key={String(optionValue)}
        type="button"
        role="option"
        aria-selected={isSelected}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-(--color-accent-soft) text-(--color-accent)' : 'text-(--color-text) hover:bg-(--color-accent-soft)'}`}
        onClick={() => handleSelection(option)}
      >
        <span className="min-w-0 truncate">{getOptionLabel(option)}</span>
        {multiple && (
          <span className={`h-4 w-4 rounded border ${isSelected ? 'border-(--color-accent) bg-(--color-accent)' : 'border-(--color-border-strong)'}`} aria-hidden="true" />
        )}
      </button>
    );
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label htmlFor={inputId} className="pointer-events-none absolute -top-2 left-4 z-10 bg-(--color-bg-elevated) px-1 text-xs leading-none text-(--color-text-muted) uppercase">
          {label}
          {required && <span className="ml-1 text-(--color-danger)">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={`${inputId}-listbox`}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={helperText || error ? `${inputId}-description` : undefined}
        className={cn(
          'flex w-full min-h-12.5 h-auto items-center justify-between rounded-full border bg-transparent px-3 text-sm text-(--color-text) transition-colors focus:outline-none focus:ring-1',
          error
            ? 'border-(--color-danger) focus:border-(--color-danger) focus:ring-(--color-danger)'
            : 'border-(--color-border-strong) focus:border-(--color-accent) focus:ring-(--color-accent)',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-(--color-accent)',
          buttonClassName,
        )}
      >
        <span className={cn('truncate', selectedValues.length || multiple ? 'text-(--color-text)' : 'text-(--color-text-muted)')}>
          {loading ? 'Loading...' : labelSummary}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && !disabled && selectedValues.length > 0 && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={(event) => {
                event.stopPropagation();
                handleClear(event);
              }}
              className="text-(--color-text-muted) hover:text-(--color-text)"
            >
              <X size={14} />
            </span>
          )}
          {loading
            ? <Loader2 size={16} className="animate-spin text-(--color-text-muted)" />
            : <ChevronDown size={16} className={`text-(--color-text-muted) transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          }
        </span>
      </button>

      {(helperText || error) && (
        <p id={`${inputId}-description`} role={error ? 'alert' : undefined} className={cn('mt-1 text-xs', error ? 'text-(--color-danger)' : 'text-(--color-text-muted)')}>
          {error || helperText}
        </p>
      )}

      {isOpen && createPortal(
        <div ref={dropdownRef} data-searchable-select-dropdown style={dropdownStyle} className="max-h-60 overflow-hidden rounded-2xl border border-(--color-border-strong) bg-(--color-bg-elevated) text-(--color-text) shadow-lg">
          <div className="border-b border-(--color-border) p-2">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-(--color-text-muted)" />
              <input
                ref={searchRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                placeholder="Search..."
                className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-(--color-text) outline-none placeholder:text-(--color-text-muted)"
                aria-label={label ? `${label} search` : 'Search options'}
                autoComplete="off"
              />
              {inputValue && (
                <button type="button" onClick={() => setInputValue('')} className="text-(--color-text-muted) hover:text-(--color-text)" aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div id={`${inputId}-listbox`} role="listbox" aria-multiselectable={multiple} className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-(--color-text-muted)">
                <Loader2 size={15} className="animate-spin" />
                Loading options
              </div>
            ) : errorMessage ? (
              <div className="space-y-2 px-3 py-3">
                <p className="text-sm text-(--color-danger)">Unable to load options</p>
                <button type="button" onClick={() => loadPage(1, true)} className="rounded border border-(--color-border-strong) px-2 py-1 text-xs font-medium text-(--color-accent)">
                  Retry
                </button>
              </div>
            ) : visibleOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-(--color-text-muted)">{emptyMessage}</div>
            ) : (
              <>
                {visibleOptions.map((option, index) => (
                  <div key={String(getOptionValue(option))} className={index === activeIndex ? 'bg-[var(--color-accent-soft)]' : ''}>
                    {renderOption(option)}
                  </div>
                ))}

                {hasMore && (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex w-full items-center justify-center gap-2 border-t border-(--color-border) px-3 py-2 text-sm font-medium text-(--color-accent) disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                    {loadingMore ? 'Loading more…' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

      <div aria-live="polite" className="sr-only">
        {loading ? 'Loading options' : errorMessage ? 'Unable to load options' : visibleOptions.length === 0 ? 'No results found' : `${visibleOptions.length} options available`}
      </div>
    </div>
  );
};

export default AsyncSearchableSelect;
