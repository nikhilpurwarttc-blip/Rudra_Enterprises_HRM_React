import { createPortal } from 'react-dom';
import { useRightPanel } from '../../contexts/RightPanelContext';
import { useEffect, useId, useRef, useState } from 'react';
import Button from '../../components/Button';

const RightModal = ({ isOpen, onClose, onSubmit, title, children, showCancel = true, settingoff = true, saving = false, submitDisabled = false, className = '', bodyClassName = '' }) => {
  const { activePanel, setActivePanel } = useRightPanel();
  // default to panel mode (slide-in from right inside layout)
  const panelMode = 'panel';
  const id = useId();
  const isOpenRef = useRef(isOpen);
  const justRegisteredRef = useRef(false);
  const resizeRef = useRef(null);
  const [resizedWidth, setResizedWidth] = useState(null);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerMove = (event) => {
      const resize = resizeRef.current;
      if (!resize) return;

      const minimumWidth = Math.min(320, window.innerWidth);
      const maximumWidth = Math.min(900, Math.max(minimumWidth, window.innerWidth * 0.9));
      const nextWidth = resize.startWidth + resize.startX - event.clientX;
      setResizedWidth(Math.min(maximumWidth, Math.max(minimumWidth, nextWidth)));
    };

    const stopResize = () => {
      resizeRef.current = null;
      document.body.style.removeProperty('user-select');
      document.body.style.removeProperty('cursor');
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      stopResize();
    };
  }, [isOpen]);

  const startResize = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    const modal = event.currentTarget.parentElement;
    resizeRef.current = {
      startX: event.clientX,
      startWidth: modal.getBoundingClientRect().width,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  // Register this panel as active when it opens
  useEffect(() => {
    if (isOpen) {
      justRegisteredRef.current = true;
      setActivePanel(id);
    }
  }, [isOpen]);

  // Close only if this modal is currently open and another panel became active
  useEffect(() => {
    if (justRegisteredRef.current) { justRegisteredRef.current = false; return; }
    if (activePanel && activePanel !== id && isOpenRef.current) onClose();
  }, [activePanel]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, saving]);

  if (!isOpen) return null;
  const isPanel = panelMode === 'panel';

  const panel = (
    <div
      style={resizedWidth ? { width: `${resizedWidth}px`, maxWidth: 'none' } : undefined}
      className={
      isPanel
        ? `relative flex flex-col transition-all duration-300 overflow-hidden h-full ${isOpen ? 'w-screen md:min-w-sm md:w-auto ' + className : 'w-0 border-l-0'}`
        : `absolute top-0 right-0 h-full flex flex-col border-l border-gray-300 dark:border-gray-800 dark:bg-black/50 backdrop-blur-sm z-50 transition-transform duration-300 w-auto md:min-w-sm md:max-w-lg ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
      }
    >
      <button
        type="button"
        aria-label="Resize modal"
        onPointerDown={startResize}
        className="absolute left-1 top-1/2 z-10 w-2 h-8 rounded-full -translate-y-1/2 cursor-col-resize touch-none border-0 hover:bg-primary-600 bg-primary-600/30"
      />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 dark:border-gray-800">
        <h2 className="text-lg md:text-xl font-semibold dark:text-white truncate">{title}</h2>
        <button
          onClick={saving ? undefined : onClose}
          disabled={saving}
          title={saving ? 'Please wait…' : 'Click ESC to close'}
          className="text-2xl px-2 text-gray-600 dark:text-gray-300 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >×</button>
      </div>

      {/* Body — fieldset disables ALL inputs/selects/buttons inside when saving */}
      <form autoComplete="off">
        <input type="text" name="prevent_autofill" style={{ display: 'none' }} readOnly />
        <input type="password" name="prevent_autofill_pw" style={{ display: 'none' }} readOnly />
      </form>
      <fieldset disabled={saving} className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide min-w-0 ${bodyClassName}`}>
        {children}
      </fieldset>

      {/* Footer */}
      {settingoff && (
        <div className="h-18 px-6 py-3 flex items-center justify-end gap-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-800">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm border rounded-lg dark:border-gray-600 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          {/* <button
            type="button"
            onClick={onSubmit}
            disabled={saving || submitDisabled}
            className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
          >
            {saving
              ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : (title?.toLowerCase().includes('edit') ? 'Update' : 'Save')
            }
          </button> */}
          
          <Button
            type="button"
             onClick={onSubmit}
            disabled={saving || submitDisabled}
          >
            {saving
              ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : (title?.toLowerCase().includes('edit') ? 'Update' : 'Save')
            }
          </Button>
        </div>
      )}
    </div>
  );

  if (isPanel) {
    const slot = document.getElementById('right-panel-slot');
    if (slot) return createPortal(panel, slot);
  }

  return createPortal(
    <>{panel}</>,
    document.getElementById('main-content-area') || document.body
  );
};

export default RightModal;
