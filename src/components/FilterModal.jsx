import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  Check,
  Clock3,
  Filter,
  RotateCcw,
  X,
} from 'lucide-react';
import Button from './Button';
import ChoiceChips from './ChoiceChips';
import SearchableSelect from './SearchableSelect';
import usePermission from '../hooks/usePermission';

const emptyValue = (field) => (field.type === 'multiselect' ? [] : '');
const hasValue = (value) => (Array.isArray(value) ? value.length > 0 : value !== '' && value !== null && value !== undefined);
const FIELD_ICONS = {
  status: Activity,
  workflow_status: Check,
  designation: BriefcaseBusiness,
  department: Building2,
  shift: Clock3,
};

const FilterModal = ({
  fields = [],
  values = {},
  onApply,
  buttonLabel = 'Filters',
  title = 'Filters',
  buttonRef,
}) => {
  const { can } = usePermission();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const modalRef = useRef(null);

  const visibleFields = fields.filter((field) => {
    if (field.visible === false) return false;
    if (typeof field.visible === 'function' && !field.visible()) return false;
    if (!field.permission) return true;
    const { module, action = 'view' } = typeof field.permission === 'string'
      ? { module: field.permission }
      : field.permission;
    return can(module, action);
  });

  const activeCount = visibleFields.reduce(
    (count, field) => count + (hasValue(values[field.key]) ? 1 : 0),
    0,
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (event.target.closest('[data-searchable-select-dropdown]')) return;
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !modalRef.current) return undefined;

    const updatePosition = () => {
      const trigger = triggerRef.current.getBoundingClientRect();
      const modal = modalRef.current;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const margin = 16;
      const gap = 10;
      
      const modalWidth = Math.min(360, viewportWidth - margin * 2);
      modal.style.width = `${modalWidth}px`;
      modal.style.maxHeight = `${viewportHeight - margin * 2}px`;

      const modalHeight = modal.getBoundingClientRect().height;
      
      // Try to place to the right of the trigger button by default
      let left = trigger.right + gap;
      
      // If there isn't enough space on the right, place it to the left of the button
      if (left + modalWidth > viewportWidth - margin) {
        left = trigger.left - modalWidth - gap;
      }
      
      // Final safeguard clamp to viewport boundaries
      left = Math.max(margin, Math.min(left, viewportWidth - modalWidth - margin));

      // Align top edge with the button, but shift upward if it overflows the bottom viewport boundary
      let top = trigger.top;
      if (top + modalHeight > viewportHeight - margin) {
        top = viewportHeight - modalHeight - margin;
      }
      top = Math.max(margin, top);

      modal.style.left = `${left}px`;
      modal.style.top = `${top}px`;
      modal.style.visibility = 'visible';
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, visibleFields.length]);

  const updateField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleClearAll = (e) => {
    e?.stopPropagation();
    const cleared = visibleFields.reduce(
      (next, field) => ({ ...next, [field.key]: emptyValue(field) }),
      {},
    );
    setDraft(cleared);
    onApply(cleared);
  };

  if (visibleFields.length === 0) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        aria-label={`${buttonLabel}${activeCount ? `, ${activeCount} applied` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        ref={(element) => {
          triggerRef.current = element;
          if (buttonRef) buttonRef.current = element;
        }}
        onClick={() => {
          if (!isOpen) setDraft(values);
          setIsOpen(!isOpen);
        }}
        className="group relative  flex items-center justify-center p-2.5 gap-2  rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        title={buttonLabel}
      >
        <Filter size={16} className="transition-transform duration-300 group-hover:rotate-12" />
        <span className="sr-only">{buttonLabel}</span>
        {activeCount > 0 && (
          <span
            onClick={handleClearAll}
            title="Clear all filters"
            className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-(--color-bg-elevated) bg-(--color-accent) px-1 text-[10px] font-extrabold leading-none text-white shadow-sm transition-transform hover:scale-110 active:scale-90 animate-in zoom-in-50 duration-150 cursor-pointer group/badge"
          >
            <span className="group-hover/badge:hidden">{activeCount}</span>
            <X size={12} className="hidden group/badge:hover:inline-block stroke-[3]" />
          </span>
        )}
      </Button>

      {isOpen && (
        <section
          ref={modalRef}
          role="dialog"
          aria-label={title}
          className="glass-card invisible fixed z-[100] flex flex-col overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-bg-elevated)/95 text-(--color-text) shadow-2xl backdrop-blur-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 ease-out"
        >
          <header className="flex items-start justify-between gap-3 border-b border-(--color-border)/60 p-4.5 bg-(--color-surface)/40">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-accent-soft) text-(--color-accent) shadow-inner">
                <Filter size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-(--color-text)">{title}</h2>
                <p className="text-xs text-(--color-text-muted)">
                  {activeCount ? `${activeCount} active filter${activeCount === 1 ? '' : 's'}` : 'Refine current records'}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-(--color-text-muted) transition-colors duration-150 hover:bg-(--color-accent-soft) hover:text-(--color-text) focus-visible:outline-2 focus-visible:outline-(--color-accent)"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4.5 scrollbar-thin scrollbar-thumb-(--color-border) scrollbar-track-transparent">
            {visibleFields.map((field) => {
              const value = draft[field.key] ?? emptyValue(field);
              const FieldIcon = field.icon ?? FIELD_ICONS[field.key];
              if (field.type === 'select' || field.type === 'multiselect') {
                const options = field.options ?? [];
                if (
                  !field.isLoading
                  && options.length > 0
                  && options.length < 4
                ) {
                  return (
                    <div key={field.key}>
                      <ChoiceChips
                        label={field.label}
                        value={value}
                        options={options}
                        onChange={(nextValue) => updateField(field.key, nextValue)}
                        disabled={field.disabled}
                        icon={FieldIcon}
                        multiple={field.type === 'multiselect'}
                      />
                    </div>
                  );
                }
                return (
                  <div key={field.key} className="group">
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-(--color-text-muted) transition-colors group-focus-within:text-(--color-accent)">
                      {FieldIcon && <FieldIcon size={14} className="text-(--color-accent)" />}
                      <span>{field.label}</span>
                    </div>
                    <SearchableSelect
                      ariaLabel={field.ariaLabel ?? field.label}
                      options={options}
                      value={value}
                      onChange={(nextValue) => updateField(field.key, nextValue)}
                      placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
                      isLoading={field.isLoading}
                      disabled={field.disabled}
                      multiSelect={field.type === 'multiselect'}
                      showSearch={field.showSearch ?? true}
                      btnClass="rounded-2xl transition-all duration-150 hover:border-(--color-border-strong)"
                    />
                  </div>
                );
              }
              return (
                <label key={field.key} className="block group text-xs font-semibold text-(--color-text-muted)">
                  <span className="flex items-center gap-2 transition-colors group-focus-within:text-(--color-accent)">
                    {FieldIcon && <FieldIcon size={14} className="text-(--color-accent)" />}
                    {field.label}
                  </span>
                  <input
                    type={field.type ?? 'text'}
                    value={value}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                    min={typeof field.min === 'function' ? field.min(draft) : field.min}
                    max={typeof field.max === 'function' ? field.max(draft) : field.max}
                    className="mt-1.5 min-h-10 w-full rounded-xl border border-(--color-border-strong) bg-transparent px-3.5 text-sm font-normal text-(--color-text) outline-none transition-all duration-150 placeholder:text-(--color-text-muted)/60 focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
              );
            })}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-(--color-border)/60 bg-(--color-surface)/30 p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                handleClearAll();
                setIsOpen(false);
              }}
              className="group flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-(--color-text-muted) transition-all hover:text-(--color-danger)"
            >
              <RotateCcw size={14} className="transition-transform duration-300 group-hover:-rotate-45" />
              Reset All
            </Button>
            <Button
              type="button"
              onClick={() => {
                onApply(draft);
                setIsOpen(false);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-sm transition-transform active:scale-95"
            >
              <Check size={14} />
              Apply Filters
            </Button>
          </footer>
        </section>
      )}
    </div>
  );
};

export default FilterModal;