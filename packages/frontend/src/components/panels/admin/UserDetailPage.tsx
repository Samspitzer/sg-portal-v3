import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  User,
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Trash2,
  Briefcase,
  MapPin,
  Calendar,
  Shield,
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  ChevronRight,
  AlertCircle,
  Check,
  X,
  Pencil,
  GitBranch,
  Lock,
  Unlock,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Button, ConfirmModal, Input, Toggle } from '@/components/common';
import { SelectFilter } from '@/components/common/SelectFilter';
import { PositionSelector } from '@/components/common/PositionSelector';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { UserDeactivationModal } from '@/components/common/UserDeactivationModal';
import { useUsersStore, useFieldsStore, useCompanyStore, useClientsStore, useToast } from '@/contexts';
import { getUserDependencies, type DependencyCategory } from '@/contexts/userDependencyRegistry';
import { useDocumentTitle } from '@/hooks';
import { validateEmail, validatePhone, formatPhoneNumber } from '@/utils/validation';

// Icon map for dependency categories
const categoryIcons: Record<string, React.ElementType> = {
  Building2,
  FolderKanban,
  FileText,
  DollarSign,
  Users,
};

// Get icon component from string name
function getCategoryIcon(iconName: string): React.ElementType {
  return categoryIcons[iconName] || FileText;
}

// Non-collapsible Section Header
function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
      </div>
      {action}
    </div>
  );
}

// Inline editable field component
function InlineField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
  disabled = false,
  icon,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'email' | 'tel';
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const validate = (val: string): string | null => {
    if (type === 'email' && val && !validateEmail(val)) {
      return 'Invalid email address';
    }
    if (type === 'tel' && val && !validatePhone(val)) {
      return 'Invalid phone number';
    }
    return null;
  };

  const handleSave = () => {
    const validationError = validate(editValue);
    if (validationError) {
      setError(validationError);
      toast.error('Validation Error', validationError);
      return;
    }
    
    const finalValue = type === 'tel' && editValue ? formatPhoneNumber(editValue) : editValue;
    onSave(finalValue);
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
        <div className="flex items-center gap-2">
          <Input
            type={type}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(validate(e.target.value));
            }}
            onKeyDown={handleKeyDown}
            error={error || undefined}
            placeholder={placeholder}
            autoFocus
            className="flex-1"
            disableAutoValidation
          />
          <button
            onClick={handleSave}
            className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group cursor-pointer -mx-2 px-2 py-1.5 rounded-lg transition-colors',
        !disabled && 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      )}
      onClick={() => !disabled && setIsEditing(true)}
    >
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className={clsx(
          'text-sm',
          value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'
        )}>
          {value || placeholder || `Add ${label.toLowerCase()}...`}
        </span>
        {!disabled && (
          <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
        )}
      </div>
    </div>
  );
}

// Additional Supervisor Selector with User/Position tabs
function AdditionalSupervisorSelector({
  users,
  departments,
  currentUserId,
  excludeUserIds = [],
  onSelect,
}: {
  users: any[];
  departments: any[];
  currentUserId: string;
  excludeUserIds?: string[];
  onSelect: (value: string) => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<'user' | 'position'>('user');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  
  // User options - all active users except current and excluded
  const userOptions = useMemo(() => {
    return users
      .filter((u) => u.isActive && u.id !== currentUserId && !excludeUserIds.includes(u.id))
      .map((u) => ({
        value: u.id,
        label: u.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users, currentUserId, excludeUserIds]);
  
  // Listen for pending toast events from PositionSelector
  useEffect(() => {
    const handlePendingEvent = (e: CustomEvent) => {
      toast.warning('Supervisor Not Added', e.detail.message);
    };
    window.addEventListener('position-selector-pending', handlePendingEvent as EventListener);
    return () => window.removeEventListener('position-selector-pending', handlePendingEvent as EventListener);
  }, [toast]);
  
  // When position is selected, find the user(s) in that position
  const handlePositionSelect = (positionId: string) => {
    if (!positionId) {
      setSelectedPositionId('');
      return;
    }
    setSelectedPositionId(positionId);
    // Find users in this position (excluding already selected)
    const usersInPosition = users.filter(
      u => u.positionId === positionId && u.isActive && u.id !== currentUserId && !excludeUserIds.includes(u.id)
    );
    if (usersInPosition.length === 1) {
      // Auto-select if only one user
      onSelect(usersInPosition[0].id);
      setSelectedPositionId('');
    }
  };
  
  // Get users in selected position (for when multiple users hold position)
  const usersInSelectedPosition = useMemo(() => {
    if (!selectedPositionId) return [];
    return users
      .filter(u => u.positionId === selectedPositionId && u.isActive && u.id !== currentUserId && !excludeUserIds.includes(u.id))
      .map(u => ({ value: u.id, label: u.name }));
  }, [selectedPositionId, users, currentUserId, excludeUserIds]);
  
  // Get selected position name for toast message
  const selectedPositionName = useMemo(() => {
    if (!selectedPositionId) return '';
    for (const dept of departments) {
      const pos = dept.positions?.find((p: any) => p.id === selectedPositionId);
      if (pos) return pos.name;
    }
    return '';
  }, [selectedPositionId, departments]);
  
  // Determine if position selection is pending (selected but no users to pick)
  const isPending = !!(selectedPositionId && usersInSelectedPosition.length === 0);
  
  return (
    <div className="space-y-2">
      {/* Mode tabs */}
      <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        <button
          onClick={() => { setMode('user'); setSelectedPositionId(''); }}
          className={clsx(
            'px-2 py-1 text-xs font-medium rounded transition-colors',
            mode === 'user'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          By User
        </button>
        <button
          onClick={() => setMode('position')}
          className={clsx(
            'px-2 py-1 text-xs font-medium rounded transition-colors',
            mode === 'position'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          By Position
        </button>
      </div>
      
      {/* Selector based on mode */}
      {mode === 'user' ? (
        <SelectFilter
          label="Select user..."
          value=""
          options={userOptions}
          onChange={onSelect}
          icon={<User className="w-3.5 h-3.5" />}
          showAllOption={false}
          searchThreshold={3}
        />
      ) : (
        <div className="space-y-2">
          <PositionSelector
            value={selectedPositionId}
            departments={departments}
            onChange={handlePositionSelect}
            icon={<Briefcase className="w-3.5 h-3.5" />}
            placeholder="Select position..."
            pending={isPending}
            pendingMessage={`No one is assigned to "${selectedPositionName}"`}
          />
          
          {/* Show user selector if position has multiple users */}
          {selectedPositionId && usersInSelectedPosition.length > 1 && (
            <SelectFilter
              label="Select user in position..."
              value=""
              options={usersInSelectedPosition}
              onChange={(userId) => {
                onSelect(userId);
                setSelectedPositionId('');
              }}
              icon={<User className="w-3.5 h-3.5" />}
              showAllOption={false}
              searchThreshold={3}
            />
          )}
          
          {/* Show message if position is vacant */}
          {isPending && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              No one currently holds this position
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Select field component
function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  icon,
  hint,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={clsx(
            'flex-1 text-sm bg-transparent border-0 p-0 pr-8 focus:ring-0',
            'text-slate-900 dark:text-white',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {hint && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

// Assigned Items Section
function AssignedItemsSection({
  categories,
  totalCount,
  userId,
}: {
  categories: DependencyCategory[];
  totalCount: number;
  userId: string;
}) {
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (module: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  if (totalCount === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No assigned items</p>
        <p className="text-xs mt-1">Items assigned to this user will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {categories.map((category) => {
        const IconComponent = getCategoryIcon(category.icon);
        const isExpanded = expandedCategories.has(category.module);
        
        return (
          <div key={category.module}>
            <button
              onClick={() => toggleCategory(category.module)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <IconComponent className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {category.label}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                  {category.items.length}
                </span>
              </div>
              <ChevronRight className={clsx(
                'w-4 h-4 text-slate-400 transition-transform',
                isExpanded && 'rotate-90'
              )} />
            </button>
            
            {isExpanded && (
              <div className="px-4 pb-3 space-y-1">
                {category.items.map((item) => (
                  <AssignedItemRow 
                    key={item.id} 
                    item={item} 
                    category={category}
                    userId={userId}
                    onNavigate={(url) => navigate(url)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Individual assigned item row - handles company addresses
function AssignedItemRow({
  item,
  category,
  userId,
  onNavigate,
}: {
  item: { id: string; name: string; url?: string };
  category: DependencyCategory;
  userId: string;
  onNavigate: (url: string) => void;
}) {
  const { companies } = useClientsStore();
  const [showAddresses, setShowAddresses] = useState(false);
  
  // For companies, check if there are addresses assigned to this user
  const companyAddresses = useMemo(() => {
    if (category.module !== 'companies') return [];
    
    const company = companies.find(c => c.id === item.id);
    if (!company) return [];
    
    const addresses: { id: string; label: string; isAssigned: boolean }[] = [];
    
    // Check main/legacy address
    if (company.address) {
      const isAssigned = company.address.salesRepIds?.includes(userId) || 
                        company.address.salesRepId === userId;
      addresses.push({
        id: 'main',
        label: 'Main Office',
        isAssigned,
      });
    }
    
    // Check additional addresses
    if (company.addresses) {
      company.addresses.forEach(addr => {
        const isAssigned = addr.salesRepIds?.includes(userId) || 
                          addr.salesRepId === userId;
        addresses.push({
          id: addr.id,
          label: addr.label || `${addr.city}, ${addr.state}`,
          isAssigned,
        });
      });
    }
    
    return addresses;
  }, [category.module, companies, item.id, userId]);
  
  const hasMultipleAddresses = companyAddresses.length > 1;
  const assignedAddresses = companyAddresses.filter(a => a.isAssigned);
  
  return (
    <div className="space-y-1">
      <div
        onClick={() => item.url && onNavigate(item.url)}
        className={clsx(
          'flex items-center justify-between px-3 py-2 rounded-lg',
          'bg-slate-50 dark:bg-slate-800/30',
          item.url && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
          {hasMultipleAddresses && assignedAddresses.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddresses(!showAddresses);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              <MapPin className="w-3 h-3" />
              {assignedAddresses.length} location{assignedAddresses.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
        {item.url && (
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        )}
      </div>
      
      {/* Show addresses if expanded */}
      {showAddresses && assignedAddresses.length > 0 && (
        <div className="ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
          {assignedAddresses.map(addr => (
            <div 
              key={addr.id}
              className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500 dark:text-slate-400"
            >
              <MapPin className="w-3 h-3" />
              <span>{addr.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Permission row component
function PermissionRow({
  label,
  description,
  inherited,
  enabled,
  overridden,
  onToggle,
  onOverrideChange,
}: {
  label: string;
  description?: string;
  inherited: boolean;
  enabled: boolean;
  overridden: boolean;
  onToggle: () => void;
  onOverrideChange: (override: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
          {overridden && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              Overridden
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {!overridden && inherited && (
          <span className="text-xs text-slate-400">From position</span>
        )}
        <Toggle
          checked={enabled}
          onChange={onToggle}
          size="sm"
          activeColor={overridden ? 'warning' : 'brand'}
        />
        <button
          onClick={() => onOverrideChange(!overridden)}
          className={clsx(
            'p-1 rounded transition-colors',
            overridden
              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
          title={overridden ? 'Remove override' : 'Override this permission'}
        >
          {overridden ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// Main component
export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Stores
  const { users, updateUser, deleteUser, toggleUserActive } = useUsersStore();
  const { departments, getPositionsByDepartment, getPositionById } = useFieldsStore();
  const { company } = useCompanyStore();
  
  // Find user
  const user = users.find((u) => u.id === userId);
  
  // State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  
  // Set document title
  useDocumentTitle(user?.name || 'User');
  
  // Get offices
  const offices = company.offices || [];
  const showOffice = offices.length >= 2;
  
  const userPosition = useMemo(() => {
    if (!user?.positionId) return null;
    return getPositionById(user.positionId);
  }, [user?.positionId, getPositionById]);
  
  // Get supervisor position (from position's reportsToPositionId)
  const supervisorPosition = useMemo(() => {
    if (!userPosition?.reportsToPositionId) return null;
    return getPositionById(userPosition.reportsToPositionId);
  }, [userPosition, getPositionById]);
  
  // Get users in supervisor position (for override selection)
  const usersInSupervisorPosition = useMemo(() => {
    if (!supervisorPosition) return [];
    return users.filter((u) => u.positionId === supervisorPosition.id && u.isActive);
  }, [supervisorPosition, users]);
  
  // Get automatic supervisor (if position has exactly 1 person)
  const autoSupervisor = useMemo(() => {
    if (usersInSupervisorPosition.length === 1) {
      return usersInSupervisorPosition[0];
    }
    return null;
  }, [usersInSupervisorPosition]);
  
  // Department options
  const departmentOptions = useMemo(() => 
    departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );
  
  // Position options (for current department)
  const positionOptions = useMemo(() => {
    if (!user?.departmentId) return [];
    return getPositionsByDepartment(user.departmentId).map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [user?.departmentId, getPositionsByDepartment]);
  
  // Reporting structure state - support multiple additional supervisors
  const additionalSupervisorIds: string[] = (user as any)?.supervisorIds || 
    ((user as any)?.supervisorId ? [(user as any).supervisorId] : []);
  const additionalSupervisors = useMemo(() => {
    return additionalSupervisorIds
      .map(id => users.find(u => u.id === id))
      .filter(Boolean) as typeof users;
  }, [additionalSupervisorIds, users]);
  const hasAdditionalSupervisors = additionalSupervisors.length > 0;
  
  // Office options
  const officeOptions = useMemo(() => 
    offices.map((o) => ({
      value: o.id,
      label: o.isMain ? `${o.label} (Main)` : o.label,
    })),
    [offices]
  );
  
  // Get user dependencies
  const dependencies = useMemo(() => {
    if (!user) return { categories: [], totalCount: 0, hasItems: false, userId: '', userName: '' };
    return getUserDependencies(user.id, user.name);
  }, [user]);
  
  // Handlers
  const handleFieldSave = (field: string, value: string) => {
    if (!user) return;
    
    // Handle department change - reset position
    if (field === 'departmentId' && value !== user.departmentId) {
      updateUser(user.id, { departmentId: value, positionId: '' });
      toast.success('Updated', 'Department changed - please select a position');
      return;
    }
    
    updateUser(user.id, { [field]: value });
    toast.success('Updated', `${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
  };
  
  const handleAddAdditionalSupervisor = (supervisorId: string) => {
    if (!user || !supervisorId) return;
    // Don't add duplicates
    if (additionalSupervisorIds.includes(supervisorId)) {
      toast.error('Already Added', 'This supervisor is already in the list');
      return;
    }
    const newIds = [...additionalSupervisorIds, supervisorId];
    updateUser(user.id, { supervisorIds: newIds } as any);
    toast.success('Updated', 'Additional supervisor added');
  };
  
  const handleRemoveAdditionalSupervisor = (supervisorId: string) => {
    if (!user) return;
    const newIds = additionalSupervisorIds.filter(id => id !== supervisorId);
    
    // If removing last additional supervisor and default is disabled, re-enable default
    if (newIds.length === 0 && (user as any)?.defaultSupervisorDisabled) {
      updateUser(user.id, { 
        supervisorIds: undefined, 
        defaultSupervisorDisabled: false 
      } as any);
      toast.success('Updated', 'Additional supervisor removed - default supervisor re-enabled');
    } else {
      updateUser(user.id, { supervisorIds: newIds.length > 0 ? newIds : undefined } as any);
      toast.success('Updated', 'Additional supervisor removed');
    }
  };
  
  const handleToggleActive = () => {
    if (!user) return;
    
    if (user.isActive) {
      // Show deactivation modal with dependency check
      setShowDeactivateModal(true);
    } else {
      // Directly activate
      toggleUserActive(user.id);
      toast.success('Activated', `${user.name} has been activated`);
    }
  };
  
  const handleDeactivateConfirm = (reassignToUserId: string | null) => {
    if (!user) return;
    toggleUserActive(user.id);
    const message = reassignToUserId
      ? `${user.name} has been deactivated and items reassigned`
      : `${user.name} has been deactivated`;
    toast.success('Deactivated', message);
    setShowDeactivateModal(false);
  };
  
  const handleDelete = () => {
    if (!user) return;
    deleteUser(user.id);
    toast.success('Deleted', `${user.name} has been deleted`);
    navigate('/admin/users');
  };
  
  // Not found state
  if (!user) {
    return (
      <Page title="User Not Found">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
            User not found
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            The user you're looking for doesn't exist or has been deleted.
          </p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </Page>
    );
  }
  
  // Check for data integrity issues
  const userDepartment = departments.find(d => d.id === user.departmentId);
  const hasMissingDepartment = user.departmentId && !userDepartment;
  const hasMissingPosition = user.positionId && !userPosition;
  const hasMissingSupervisor = additionalSupervisorIds.length > 0 && additionalSupervisors.length < additionalSupervisorIds.length;
  const hasDataIssues = hasMissingDepartment || hasMissingPosition || hasMissingSupervisor;
  
  return (
    <Page
      title={user.name}
      description={userPosition?.name || 'User details'}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      }
    >
      {/* Data Integrity Warnings */}
      {hasDataIssues && (
        <div className="mb-4 space-y-2">
          {hasMissingDepartment && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Department not found
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  The assigned department has been deleted. Please select a new department.
                </p>
              </div>
            </div>
          )}
          {hasMissingPosition && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Position not found
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  The assigned position has been deleted. Please select a new position.
                </p>
              </div>
            </div>
          )}
          {hasMissingSupervisor && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Additional supervisor not found
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    One or more additional supervisors have been deleted or deactivated.
                  </p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    // Clear invalid supervisor IDs by keeping only the valid ones
                    const validIds = additionalSupervisors.map(s => s.id);
                    updateUser(user.id, { supervisorIds: validIds.length > 0 ? validIds : undefined } as any);
                    toast.success('Updated', 'Invalid supervisors removed');
                  }}
                >
                  Clear Invalid
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - User Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader
              title="Basic Information"
              icon={<User className="w-4 h-4 text-slate-500" />}
            />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InlineField
                  label="Full Name"
                  value={user.name}
                  onSave={(v) => handleFieldSave('name', v)}
                  placeholder="Enter name"
                  icon={<User className="w-3.5 h-3.5" />}
                />
                <InlineField
                  label="Email"
                  value={user.email}
                  onSave={(v) => handleFieldSave('email', v)}
                  type="email"
                  placeholder="Enter email"
                  icon={<Mail className="w-3.5 h-3.5" />}
                />
                <InlineField
                  label="Phone"
                  value={user.phone || ''}
                  onSave={(v) => handleFieldSave('phone', v)}
                  type="tel"
                  placeholder="Enter phone"
                  icon={<Phone className="w-3.5 h-3.5" />}
                />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={user.isActive}
                      onChange={handleToggleActive}
                      activeColor="success"
                    />
                    <span className={clsx(
                      'text-sm font-medium',
                      user.isActive ? 'text-success-600' : 'text-slate-400'
                    )}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Created date */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Created {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Department & Position - Collapsible */}
          <CollapsibleSection
            title="Department & Position"
            icon={<Briefcase className="w-4 h-4 text-slate-500" />}
            defaultOpen={true}
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Department"
                  value={user.departmentId || ''}
                  options={departmentOptions}
                  onChange={(v) => handleFieldSave('departmentId', v)}
                  placeholder="Select department"
                  icon={<Building2 className="w-3.5 h-3.5" />}
                />
                <SelectField
                  label="Position"
                  value={user.positionId || ''}
                  options={positionOptions}
                  onChange={(v) => handleFieldSave('positionId', v)}
                  placeholder={user.departmentId ? 'Select position' : 'Select department first'}
                  disabled={!user.departmentId}
                  icon={<Briefcase className="w-3.5 h-3.5" />}
                />
              </div>
              
              {/* Reporting Structure - Simple Display */}
              {userPosition && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Reporting Structure
                    </span>
                  </div>
                  
                  {/* Two column layout with divider */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left - Supervisors List */}
                    <div className="flex-1 space-y-2">
                      {/* Default Reports To (from position) */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                          Reports to
                        </label>
                        {supervisorPosition ? (
                          <div className="flex items-center justify-between">
                            <div className={clsx(
                              "text-sm",
                              (user as any)?.defaultSupervisorDisabled 
                                ? "text-slate-400 line-through" 
                                : "text-slate-900 dark:text-white"
                            )}>
                              <span className="font-medium">{supervisorPosition.name}</span>
                              {usersInSupervisorPosition.length === 1 && autoSupervisor && (
                                <span className="text-slate-500"> ({autoSupervisor.name})</span>
                              )}
                              {usersInSupervisorPosition.length === 0 && (
                                <span className="text-amber-600 dark:text-amber-400"> (vacant)</span>
                              )}
                              {usersInSupervisorPosition.length > 1 && (
                                <span className="text-amber-600 dark:text-amber-400"> ({usersInSupervisorPosition.length} people)</span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const isCurrentlyDisabled = (user as any)?.defaultSupervisorDisabled;
                                // Can't disable if no additional supervisors
                                if (!isCurrentlyDisabled && !hasAdditionalSupervisors) {
                                  toast.warning('Cannot Disable', 'Add an additional supervisor first before disabling the default');
                                  return;
                                }
                                const newValue = !isCurrentlyDisabled;
                                updateUser(user.id, { defaultSupervisorDisabled: newValue } as any);
                                toast.success('Updated', newValue ? 'Default supervisor disabled' : 'Default supervisor enabled');
                              }}
                              className={clsx(
                                "text-xs px-2 py-1 rounded transition-colors",
                                (user as any)?.defaultSupervisorDisabled
                                  ? "text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/20"
                                  : hasAdditionalSupervisors
                                    ? "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    : "text-slate-300 cursor-not-allowed"
                              )}
                              title={!hasAdditionalSupervisors && !(user as any)?.defaultSupervisorDisabled ? 'Add an additional supervisor first' : undefined}
                            >
                              {(user as any)?.defaultSupervisorDisabled ? 'Enable' : 'Disable'}
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-700 dark:text-slate-300">
                            {userPosition.reportsToPositionId === null ? 'Department Head' : 'Not defined'}
                          </div>
                        )}
                      </div>
                      
                      {/* Additional Supervisors - shown under main supervisor */}
                      {hasAdditionalSupervisors && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {additionalSupervisors.map((supervisor) => {
                            // Find position info for this supervisor
                            const supervisorUser = users.find(u => u.id === supervisor.id);
                            const supervisorPos = supervisorUser?.positionId 
                              ? getPositionById(supervisorUser.positionId)
                              : null;
                            
                            return (
                              <div key={supervisor.id} className="flex items-center justify-between">
                                <div>
                                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-0.5">
                                    Additional
                                  </label>
                                  <div className="text-sm text-slate-900 dark:text-white">
                                    {supervisorPos && (
                                      <span className="font-medium">{supervisorPos.name} </span>
                                    )}
                                    <span className={supervisorPos ? "text-slate-500" : "font-medium"}>
                                      {supervisorPos ? `(${supervisor.name})` : supervisor.name}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveAdditionalSupervisor(supervisor.id)}
                                  className="text-xs text-danger-500 hover:text-danger-600"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Divider */}
                    <div className="hidden sm:block w-px bg-slate-200 dark:bg-slate-700 self-stretch min-h-[60px]" />
                    <div className="sm:hidden h-px bg-slate-200 dark:bg-slate-700 w-full" />
                    
                    {/* Right - Add Additional Supervisor */}
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Add Additional Supervisor
                      </label>
                      <AdditionalSupervisorSelector
                        users={users}
                        departments={departments}
                        currentUserId={user?.id || ''}
                        excludeUserIds={additionalSupervisorIds}
                        onSelect={handleAddAdditionalSupervisor}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Office Location */}
              {showOffice && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <SelectField
                    label="Office Location"
                    value={user.officeId || ''}
                    options={officeOptions}
                    onChange={(v) => handleFieldSave('officeId', v)}
                    placeholder="Select office"
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    hint="Which office location this user works from"
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>
          
          {/* Permissions */}
          <CollapsibleSection
            title="Permissions"
            icon={<Shield className="w-4 h-4 text-slate-500" />}
            defaultOpen={false}
            badge={userPosition ? 'From position' : undefined}
          >
            <div className="p-4">
              {userPosition ? (
                <>
                  <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <Info className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Permissions are inherited from the <strong>{userPosition.name}</strong> position.
                      You can override specific permissions below.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <PermissionRow
                      label="Admin Panel"
                      description="Access to user management and settings"
                      inherited={true}
                      enabled={true}
                      overridden={false}
                      onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')}
                      onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')}
                    />
                    <PermissionRow
                      label="Customers Panel"
                      description="Access to companies and contacts"
                      inherited={true}
                      enabled={true}
                      overridden={false}
                      onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')}
                      onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')}
                    />
                    <PermissionRow
                      label="Projects Panel"
                      description="Access to project management"
                      inherited={true}
                      enabled={false}
                      overridden={false}
                      onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')}
                      onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')}
                    />
                    <PermissionRow
                      label="Estimating Panel"
                      description="Access to estimates"
                      inherited={true}
                      enabled={false}
                      overridden={false}
                      onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')}
                      onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')}
                    />
                    <PermissionRow
                      label="Accounting Panel"
                      description="Access to invoices and financials"
                      inherited={true}
                      enabled={false}
                      overridden={false}
                      onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')}
                      onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a position to see permissions</p>
                  <p className="text-xs mt-1">Permissions are based on the user's position</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
        
        {/* Right Column - Assigned Items */}
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader
              title="Assigned Items"
              icon={<Briefcase className="w-4 h-4 text-slate-500" />}
              action={
                dependencies.totalCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full">
                    {dependencies.totalCount}
                  </span>
                )
              }
            />
            <div className="bg-white dark:bg-slate-900">
              <AssignedItemsSection
                categories={dependencies.categories}
                totalCount={dependencies.totalCount}
                userId={user.id}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${user.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
      
      {/* Deactivation Modal with Dependency Check */}
      <UserDeactivationModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivateConfirm}
        user={user}
        mode="deactivate"
      />
    </Page>
  );
}