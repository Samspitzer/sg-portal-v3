import { useState, useCallback, useMemo } from 'react';

export function useFormChanges<T>(initialData: T) {
  const [originalData, setOriginalData] = useState<T>(initialData);
  const [formData, setFormData] = useState<T>(initialData);

  // Check if data has changed
  const hasChanges = useMemo(() => {
    return JSON.stringify(originalData) !== JSON.stringify(formData);
  }, [originalData, formData]);

  // Reset to original data
  const resetForm = useCallback(() => {
    setFormData(originalData);
  }, [originalData]);

  // Update original data (after save)
  const updateOriginal = useCallback((newData: T) => {
    setOriginalData(newData);
    setFormData(newData);
  }, []);

  // Initialize with new data (when editing different item)
  const initializeForm = useCallback((data: T) => {
    setOriginalData(data);
    setFormData(data);
  }, []);

  return {
    formData,
    setFormData,
    hasChanges,
    resetForm,
    updateOriginal,
    initializeForm,
  };
}