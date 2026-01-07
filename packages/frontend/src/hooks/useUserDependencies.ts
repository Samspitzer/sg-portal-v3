import { useMemo, useSyncExternalStore } from 'react';
import {
  getUserDependencies,
  reassignUserItems,
  getDependencySummary,
  subscribeToRegistry,
  getRegisteredDependencies,
  type UserDependencies,
  type DependencyCategory,
  type DependencyItem,
} from '@/contexts/userDependencyRegistry';

// Re-export types
export type { UserDependencies, DependencyCategory, DependencyItem };
export { getDependencySummary };

/**
 * Hook to get all items assigned to a specific user across all registered modules.
 * Automatically updates when the registry changes or when store data changes.
 */
export function useUserDependencies(userId: string, userName: string): UserDependencies {
  // Subscribe to registry changes so we re-render when modules register/unregister
  const registryVersion = useSyncExternalStore(
    subscribeToRegistry,
    () => getRegisteredDependencies().length,
    () => getRegisteredDependencies().length
  );
  
  // Calculate dependencies (will re-run when registry changes or userId changes)
  const dependencies = useMemo(() => {
    return getUserDependencies(userId, userName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userName, registryVersion]);
  
  return dependencies;
}

/**
 * Hook that returns a function to reassign items from one user to another.
 */
export function useReassignUserItems() {
  const reassignItems = (
    fromUserId: string,
    toUserId: string | null,
    categories: DependencyCategory[]
  ) => {
    return reassignUserItems(fromUserId, toUserId, categories);
  };
  
  return { reassignItems };
}