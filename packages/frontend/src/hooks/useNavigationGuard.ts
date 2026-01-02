import { useEffect, useRef } from 'react';
import { useNavigationGuardStore } from '@/contexts';

interface UseNavigationGuardOptions {
  hasChanges: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}

export function useNavigationGuard({ hasChanges, onSave, onDiscard }: UseNavigationGuardOptions) {
  const { setGuard, clearGuard } = useNavigationGuardStore();
  
  // Use refs to avoid dependency issues
  const onSaveRef = useRef(onSave);
  const onDiscardRef = useRef(onDiscard);
  
  // Keep refs updated
  useEffect(() => {
    onSaveRef.current = onSave;
    onDiscardRef.current = onDiscard;
  });

  // Register/update the guard when hasChanges changes
  useEffect(() => {
    setGuard(hasChanges, onSaveRef.current, onDiscardRef.current);
  }, [hasChanges, setGuard]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      clearGuard();
    };
  }, [clearGuard]);

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);
}