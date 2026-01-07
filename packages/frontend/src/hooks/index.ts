export { useFormChanges } from './useFormChanges';
export { useNavigationGuard } from './useNavigationGuard';
export { useSafeNavigate } from './useSafeNavigate';
export { useDropdownKeyboard } from './useDropdownKeyboard';
export { 
  useUserDependencies, 
  useReassignUserItems, 
  getDependencySummary,
  type UserDependencies,
  type DependencyCategory,
  type DependencyItem,
} from './useUserDependencies';
// Re-export registry functions from contexts for convenience
export {
  registerUserDependency,
  unregisterUserDependency,
  type UserDependencyRegistration,
} from '@/contexts/userDependencyRegistry';