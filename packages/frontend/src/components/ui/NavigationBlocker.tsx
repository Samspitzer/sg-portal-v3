import { useEffect } from 'react';
import { useUnsavedChangesStore } from '@/contexts';

export function NavigationBlocker() {
  const { hasUnsavedChanges } = useUnsavedChangesStore();

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handlePopState = () => {
      // Push state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname);
      useUnsavedChangesStore.getState().showUnsavedModal(document.referrer || '/');
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  return null;
}