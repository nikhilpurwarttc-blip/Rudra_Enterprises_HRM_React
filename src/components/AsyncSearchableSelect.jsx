import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';

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
    const gap = 6;
    const dropdownHeight = 320;
    const availableBelow = viewportHeight - rect.bottom - gap;
    const availableAbove = rect.top - gap;
    const shouldOpenAbove = availableBelow < dropdownHeight && availableAbove > availableBelow;

    setDropdownStyle({
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 320 - 8)),
      width: Math.max(rect.width, 260),
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
        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]'}`}
        onClick={() => handleSelection(option)}
      >
        <span className="min-w-0 truncate">{getOptionLabel(option)}</span>
        {multiple && (
          <span className={`h-4 w-4 rounded border ${isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-border-strong)]'}`} aria-hidden="true" />
        )}
      </button>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={inputId} className="pointer-events-none absolute -top-2 left-3 z-10 bg-[var(--color-bg-elevated)] px-1 text-xs leading-none text-[var(--color-text-muted)]">
          {label}
          {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
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
        className={`flex min-h-12 w-full items-center justify-between rounded-md border bg-transparent px-3 text-sm text-[var(--color-text)] transition-colors focus:outline-none focus:ring-1 ${error ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]' : 'border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]'} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-[var(--color-accent)]'} ${buttonClassName}`}
      >
        <span className={selectedValues.length || multiple ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>{labelSummary}</span>
        <span className="flex items-center gap-2">
          {clearable && !disabled && selectedValues.length > 0 && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={(event) => {
                event.stopPropagation();
                handleClear(event);
              }}
              className="inline-flex items-center justify-center rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X size={14} />
            </span>
          )}
          {loading ? <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" /> : <ChevronDown size={16} className={`text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
        </span>
      </button>

      {(helperText || error) && (
        <p id={`${inputId}-description`} role={error ? 'alert' : undefined} className={`mt-1 text-xs ${error ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
          {error || helperText}
        </p>
      )}

      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="overflow-hidden rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[var(--color-text)] shadow-lg">
          <div className="border-b border-[var(--color-border)] p-2">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-[var(--color-text-muted)]" />
              <input
                ref={searchRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                placeholder="Search..."
                className="min-w-0 flex-1 bg-transparent py-1 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                aria-label={label ? `${label} search` : 'Search options'}
                autoComplete="off"
              />
            </div>
          </div>

          <div id={`${inputId}-listbox`} role="listbox" aria-multiselectable={multiple} className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-[var(--color-text-muted)]">
                <Loader2 size={15} className="animate-spin" />
                Loading options
              </div>
            ) : errorMessage ? (
              <div className="space-y-2 px-3 py-3">
                <p className="text-sm text-[var(--color-danger)]">Unable to load options</p>
                <button type="button" onClick={() => loadPage(1, true)} className="rounded border border-[var(--color-border-strong)] px-2 py-1 text-xs font-medium text-[var(--color-accent)]">
                  Retry
                </button>
              </div>
            ) : visibleOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[var(--color-text-muted)]">{emptyMessage}</div>
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
                    className="flex w-full items-center justify-center gap-2 border-t border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
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
