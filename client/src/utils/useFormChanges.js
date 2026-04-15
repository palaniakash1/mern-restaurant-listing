import { useState, useCallback } from 'react';

export function useFormChanges(initialForm = {}) {
  const [original, setOriginal] = useState(initialForm);

  const setChanges = useCallback((changes) => {
    if (changes && typeof changes === 'object') {
      setOriginal(changes);
    }
  }, []);

  const hasChanges = useCallback((current) => {
    if (!original || !current) return false;
    if (typeof current !== 'object' || current === null) return false;
    try {
      return JSON.stringify(current) !== JSON.stringify(original);
    } catch {
      return false;
    }
  }, [original]);

  const resetChanges = useCallback(() => {
    setOriginal(typeof initialForm === 'object' ? initialForm : null);
  }, [initialForm]);

  const resetAll = useCallback(() => {
    setOriginal(typeof initialForm === 'object' ? initialForm : null);
  }, [initialForm]);

  return {
    original,
    setChanges,
    hasChanges,
    resetChanges,
    resetAll
  };
}