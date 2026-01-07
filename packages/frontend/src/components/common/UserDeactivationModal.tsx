import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  AlertTriangle,
  Building2,
  FolderKanban,
  CheckSquare,
  FileText,
  Receipt,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  UserX,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button, Modal, Select } from '@/components/common';
import { useUsersStore } from '@/contexts';
import { 
  useUserDependencies, 
  useReassignUserItems,
  getDependencySummary,
} from '@/hooks';

// Icon mapping for modules
const moduleIcons: Record<string, React.ElementType> = {
  companies: Building2,
  projects: FolderKanban,
  tasks: CheckSquare,
  estimates: FileText,
  invoices: Receipt,
};

interface UserDeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reassignToUserId: string | null) => void;
  user: {
    id: string;
    name: string;
  } | null;
  mode: 'deactivate' | 'delete';
}

export function UserDeactivationModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  mode,
}: UserDeactivationModalProps) {
  const { users } = useUsersStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [reassignToUserId, setReassignToUserId] = useState<string>('');
  const [reassignMode, setReassignMode] = useState<'reassign' | 'unassign' | null>(null);
  
  // Get dependencies for this user
  const dependencies = useUserDependencies(user?.id || '', user?.name || '');
  const { reassignItems } = useReassignUserItems();
  
  // Get active users for reassignment (excluding the user being deactivated)
  const availableUsers = useMemo(() => {
    return users
      .filter(u => u.isActive && u.id !== user?.id)
      .map(u => ({ value: u.id, label: u.name }));
  }, [users, user?.id]);
  
  // Toggle category expansion
  const toggleCategory = (module: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };
  
  // Handle confirmation
  const handleConfirm = () => {
    // If there are items to reassign
    if (dependencies.hasItems && reassignMode) {
      const targetUserId = reassignMode === 'reassign' ? reassignToUserId : null;
      reassignItems(user!.id, targetUserId, dependencies.categories);
    }
    
    onConfirm(reassignMode === 'reassign' ? reassignToUserId : null);
  };
  
  // Check if can proceed
  const canProceed = !dependencies.hasItems || reassignMode !== null;
  const needsReassignmentSelection = reassignMode === 'reassign' && !reassignToUserId;
  
  if (!user) return null;
  
  const actionWord = mode === 'deactivate' ? 'Deactivate' : 'Delete';
  const actionWordLower = mode === 'deactivate' ? 'deactivate' : 'delete';
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${actionWord} User`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={mode === 'delete' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={!canProceed || needsReassignmentSelection}
          >
            {actionWord} User
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Warning Header */}
        <div className={clsx(
          'flex items-start gap-3 p-4 rounded-lg',
          mode === 'delete' 
            ? 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800'
            : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
        )}>
          <AlertTriangle className={clsx(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            mode === 'delete' ? 'text-danger-500' : 'text-warning-500'
          )} />
          <div>
            <p className={clsx(
              'font-medium',
              mode === 'delete' 
                ? 'text-danger-700 dark:text-danger-300'
                : 'text-warning-700 dark:text-warning-300'
            )}>
              Are you sure you want to {actionWordLower} {user.name}?
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {mode === 'delete' 
                ? 'This action cannot be undone.'
                : 'The user will no longer be able to access the portal.'}
            </p>
          </div>
        </div>
        
        {/* Dependencies Section */}
        {dependencies.hasItems ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Assigned Items ({dependencies.totalCount})
              </h3>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {getDependencySummary(dependencies)} These items need to be reassigned or unassigned before proceeding.
            </p>
            
            {/* Categories List */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {dependencies.categories.map((category) => {
                const Icon = moduleIcons[category.module] || Building2;
                const isExpanded = expandedCategories.has(category.module);
                
                return (
                  <div key={category.module} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.module)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {category.label}
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {category.items.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    
                    {/* Category Items */}
                    {isExpanded && (
                      <div className="bg-slate-50 dark:bg-slate-800/30 px-4 py-2 space-y-1">
                        {category.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50"
                          >
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {item.name}
                            </span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-500 hover:text-brand-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Reassignment Options */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                What would you like to do with these items?
              </h4>
              
              {/* Option: Reassign */}
              <label className={clsx(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                reassignMode === 'reassign'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}>
                <input
                  type="radio"
                  name="reassignMode"
                  checked={reassignMode === 'reassign'}
                  onChange={() => setReassignMode('reassign')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Reassign to another user
                    </span>
                  </div>
                  {reassignMode === 'reassign' && (
                    <div className="mt-3">
                      <Select
                        value={reassignToUserId}
                        onChange={(e) => setReassignToUserId(e.target.value)}
                        options={availableUsers}
                        placeholder="Select a user..."
                      />
                      {availableUsers.length === 0 && (
                        <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                          No other active users available for reassignment.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </label>
              
              {/* Option: Unassign */}
              <label className={clsx(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                reassignMode === 'unassign'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}>
                <input
                  type="radio"
                  name="reassignMode"
                  checked={reassignMode === 'unassign'}
                  onChange={() => setReassignMode('unassign')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      Leave unassigned
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Items will be unassigned and can be reassigned later from each module.
                  </p>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Users className="w-5 h-5 text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This user has no assigned items. You can proceed with {actionWordLower}ing.
            </p>
          </div>
        )}
        
        {/* Dashboard Note - Placeholder for future */}
        {dependencies.hasItems && reassignMode === 'unassign' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Unassigned items will need to be reassigned from their respective modules. 
              In a future update, these will appear as tasks in the Dashboard for easy management.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}