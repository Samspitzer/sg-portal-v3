import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { useNavigationGuardStore } from '@/contexts';

export function useSafeNavigate() {
  const navigate = useNavigate();
  const { requestNavigation } = useNavigationGuardStore();

  const safeNavigate = useCallback((path: string) => {
    const canNavigate = requestNavigation(path);
    if (canNavigate) {
      navigate(path);
    }
    // If blocked, the modal will show automatically
  }, [navigate, requestNavigation]);

  return safeNavigate;
}