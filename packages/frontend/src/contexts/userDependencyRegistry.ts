/**
 * User Dependency Registry
 * 
 * A centralized system for tracking user assignments across all modules.
 * Each module registers its user-assignable fields, and the system automatically
 * handles dependency checking and reassignment during user deactivation/deletion.
 * 
 * USAGE:
 * 
 * 1. In your store/module, register dependencies:
 * 
 *    registerUserDependency({
 *      module: 'companies',
 *      label: 'Companies (Sales Rep)',
 *      icon: 'Building2',
 *      field: 'salesRepId',
 *      getItems: () => useClientsStore.getState().companies,
 *      getItemName: (item) => item.name,
 *      getItemUrl: (item) => `/clients/companies/${item.id}`,
 *      reassign: (itemId, newUserId) => {
 *        useClientsStore.getState().updateCompany(itemId, { salesRepId: newUserId });
 *      },
 *    });
 * 
 * 2. The useUserDependencies hook automatically picks up all registered modules.
 * 
 * 3. When adding a new module with user assignments, just register it - no need
 *    to modify the hook or modal!
 */

// Types
export interface DependencyItem {
  id: string;
  name: string;
  type: string;
  module: string;
  url?: string;
}

export interface DependencyCategory {
  module: string;
  label: string;
  icon: string;
  field: string;
  items: DependencyItem[];
  canReassign: boolean;
}

export interface UserDependencies {
  userId: string;
  userName: string;
  totalCount: number;
  categories: DependencyCategory[];
  hasItems: boolean;
}

export interface UserDependencyRegistration<T = any> {
  /** Unique module identifier (e.g., 'companies', 'projects') */
  module: string;
  /** Human-readable label (e.g., 'Companies (Sales Rep)') */
  label: string;
  /** Icon name from lucide-react */
  icon: string;
  /** The field that holds the user ID */
  field: string;
  /** Function to get all items from the store */
  getItems: () => T[];
  /** Function to get the user ID field from an item (legacy - use hasUser for complex checks) */
  getUserId?: (item: T) => string | undefined | null;
  /** Function to check if a user is associated with an item (supports complex relationships) */
  hasUser?: (item: T, userId: string) => boolean;
  /** Function to get the item ID */
  getItemId: (item: T) => string;
  /** Function to get the display name for an item */
  getItemName: (item: T) => string;
  /** Function to get the URL for an item (optional) */
  getItemUrl?: (item: T) => string;
  /** Function to reassign an item to a new user (or undefined to unassign) */
  reassign: (itemId: string, newUserId: string | undefined) => void;
  /** Whether the current user can reassign these items (for future permission checks) */
  canReassign?: () => boolean;
}

// Registry storage
const dependencyRegistry = new Map<string, UserDependencyRegistration>();

// Registry change listeners
type RegistryListener = () => void;
const registryListeners = new Set<RegistryListener>();

/**
 * Register a user dependency for a module.
 * Call this when your store/module initializes.
 */
export function registerUserDependency<T>(registration: UserDependencyRegistration<T>): void {
  dependencyRegistry.set(registration.module, registration as UserDependencyRegistration);
  // Notify listeners of registry change
  registryListeners.forEach(listener => listener());
}

/**
 * Unregister a user dependency (useful for cleanup/testing)
 */
export function unregisterUserDependency(module: string): void {
  dependencyRegistry.delete(module);
  registryListeners.forEach(listener => listener());
}

/**
 * Get all registered dependencies
 */
export function getRegisteredDependencies(): UserDependencyRegistration[] {
  return Array.from(dependencyRegistry.values());
}

/**
 * Subscribe to registry changes (for React hook reactivity)
 */
export function subscribeToRegistry(listener: RegistryListener): () => void {
  registryListeners.add(listener);
  return () => registryListeners.delete(listener);
}

/**
 * Check if a user is associated with an item
 */
function isUserAssociated<T>(registration: UserDependencyRegistration<T>, item: T, userId: string): boolean {
  // Use hasUser if provided (for complex relationships like multiple sales reps)
  if (registration.hasUser) {
    return registration.hasUser(item, userId);
  }
  // Fall back to getUserId for simple single-user fields
  if (registration.getUserId) {
    return registration.getUserId(item) === userId;
  }
  return false;
}

/**
 * Get all items assigned to a specific user across all registered modules
 */
export function getUserDependencies(userId: string, userName: string): UserDependencies {
  const categories: DependencyCategory[] = [];
  
  for (const registration of dependencyRegistry.values()) {
    try {
      const allItems = registration.getItems();
      const userItems = allItems.filter(item => isUserAssociated(registration, item, userId));
      
      if (userItems.length > 0) {
        categories.push({
          module: registration.module,
          label: registration.label,
          icon: registration.icon,
          field: registration.field,
          items: userItems.map((item): DependencyItem => ({
            id: registration.getItemId(item),
            name: registration.getItemName(item),
            type: registration.label.split(' ')[0] || registration.module,
            module: registration.module,
            url: registration.getItemUrl?.(item),
          })),
          canReassign: registration.canReassign?.() ?? true,
        });
      }
    } catch (error) {
      console.error(`Error getting dependencies for module ${registration.module}:`, error);
    }
  }
  
  const totalCount = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  
  return {
    userId,
    userName,
    totalCount,
    categories,
    hasItems: totalCount > 0,
  };
}

/**
 * Reassign all items from one user to another (or unassign)
 */
export function reassignUserItems(
  _fromUserId: string,
  toUserId: string | null,
  categories: DependencyCategory[]
): { module: string; count: number }[] {
  const results: { module: string; count: number }[] = [];
  
  for (const category of categories) {
    if (!category.canReassign) continue;
    
    const registration = dependencyRegistry.get(category.module);
    if (!registration) continue;
    
    let count = 0;
    for (const item of category.items) {
      try {
        registration.reassign(item.id, toUserId || undefined);
        count++;
      } catch (error) {
        console.error(`Error reassigning ${category.module} item ${item.id}:`, error);
      }
    }
    
    if (count > 0) {
      results.push({ module: category.module, count });
    }
  }
  
  return results;
}

/**
 * Get a summary message for the dependencies
 */
export function getDependencySummary(dependencies: UserDependencies): string {
  if (!dependencies.hasItems) {
    return 'This user has no assigned items.';
  }
  
  const parts = dependencies.categories.map(cat => 
    `${cat.items.length} ${cat.label.toLowerCase()}`
  );
  
  if (parts.length === 1) {
    return `This user is assigned to ${parts[0]}.`;
  }
  
  const lastPart = parts.pop();
  return `This user is assigned to ${parts.join(', ')} and ${lastPart}.`;
}