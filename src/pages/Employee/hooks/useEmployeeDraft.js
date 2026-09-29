import { useState } from 'react';

const getStoredDraft = (draftKey) => {
  try {
    const storedValue = window.localStorage.getItem(draftKey);
    if (!storedValue) return null;
    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue
      : null;
  } catch {
    return null;
  }
};

export default function useEmployeeDraft(draftKey, baseForm) {
  const [draftSavedAt, setDraftSavedAt] = useState(() => (
    getStoredDraft(draftKey) ? 'Restored from draft' : null
  ));

  const restoreDraft = () => {
    const storedDraft = getStoredDraft(draftKey);
    return storedDraft ? { ...baseForm, ...storedDraft, image: null } : baseForm;
  };

  const saveDraft = (form) => {
    try {
      const serializableForm = { ...form, image: null };
      window.localStorage.setItem(draftKey, JSON.stringify(serializableForm));
      setDraftSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch {
      setDraftSavedAt(null);
      return false;
    }
  };

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // Storage may be disabled by the browser; form submission still succeeds.
    }
    setDraftSavedAt(null);
  };

  const markDraftChanged = () => setDraftSavedAt(null);

  return { draftSavedAt, restoreDraft, saveDraft, clearDraft, markDraftChanged };
}
