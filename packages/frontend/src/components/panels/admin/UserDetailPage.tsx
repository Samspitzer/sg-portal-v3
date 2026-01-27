// PATH: src/components/panels/admin/UserDetailPage.tsx

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { 
  Button, ConfirmModal, Input, Toggle, SelectFilter,
  PositionSelector, CollapsibleSection, UserDeactivationModal, SectionHeader
} from '@/components/common';
import { useUsersStore, useFieldsStore, useCompanyStore, useClientsStore, useToast, useNavigationGuardStore } from '@/contexts';
import { getUserDependencies, type DependencyCategory } from '@/contexts/userDependencyRegistry';
import { useDocumentTitle, useUserBySlug, useSafeNavigate } from '@/hooks';
import { useNavigate } from 'react-router-dom';
import { validateEmail, validatePhone, formatPhoneNumber } from '@/utils/validation';

const categoryIcons: Record<string, React.ElementType> = {
  Building2,
  FolderKanban,
  FileText,
  DollarSign,
  Users,
};

function getCategoryIcon(iconName: string): React.ElementType {
  return categoryIcons[iconName] || FileText;
}

function InlineField({
  label, value, onSave, type = 'text', placeholder, disabled = false, icon, onEditingChange,
}: {
  label: string; value: string; onSave: (value: string) => void; type?: 'text' | 'email' | 'tel';
  placeholder?: string; disabled?: boolean; icon?: React.ReactNode;
  onEditingChange?: (isEditing: boolean, hasChanges: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const onEditingChangeRef = useRef(onEditingChange);
  onEditingChangeRef.current = onEditingChange;

  useEffect(() => { setEditValue(value); }, [value]);
  const hasChanges = editValue !== value;
  useEffect(() => { onEditingChangeRef.current?.(isEditing, hasChanges); }, [isEditing, hasChanges]);

  const validate = (val: string): string | null => {
    if (type === 'email' && val && !validateEmail(val)) return 'Invalid email address';
    if (type === 'tel' && val && !validatePhone(val)) return 'Invalid phone number';
    return null;
  };

  const handleSave = () => {
    const validationError = validate(editValue);
    if (validationError) { setError(validationError); toast.error('Validation Error', validationError); return; }
    const finalValue = type === 'tel' && editValue ? formatPhoneNumber(editValue) : editValue;
    onSave(finalValue); setIsEditing(false); setError(null);
  };

  const handleCancel = () => { setEditValue(value); setIsEditing(false); setError(null); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    else if (e.key === 'Escape') { handleCancel(); }
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
        <div className="flex items-center gap-2">
          <Input type={type} value={editValue} onChange={(e) => { setEditValue(e.target.value); setError(validate(e.target.value)); }}
            onKeyDown={handleKeyDown} error={error || undefined} placeholder={placeholder} autoFocus className="flex-1" disableAutoValidation />
          <button onClick={handleSave} className="p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 rounded transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={handleCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('group cursor-pointer -mx-2 px-2 py-1.5 rounded-lg transition-colors', !disabled && 'hover:bg-slate-50 dark:hover:bg-slate-800/50')}
      onClick={() => !disabled && setIsEditing(true)}>
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-center gap-2 mt-0.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className={clsx('text-sm', value ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic')}>
          {value || placeholder || `Add ${label.toLowerCase()}...`}
        </span>
        {!disabled && <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />}
      </div>
    </div>
  );
}

function FormSelectField({ label, value, options, onChange, placeholder = 'Select...', disabled = false, icon }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; placeholder?: string; disabled?: boolean; icon?: React.ReactNode;
}) {
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <div className={clsx("w-full [&>div]:w-full [&_button]:w-full", disabled && 'opacity-50 pointer-events-none')}>
        <SelectFilter label={selectedLabel} value={value} options={options} onChange={onChange} icon={icon} showAllOption={false} />
      </div>
    </div>
  );
}

function AdditionalSupervisorsInline({
  supervisors, users, getPositionById, onRemove,
}: {
  supervisors: any[]; users: any[];
  getPositionById: (id: string) => any;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleSupervisors = expanded ? supervisors : supervisors.slice(0, 1);
  const hasMore = supervisors.length > 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Additional Supervisors</label>
        {supervisors.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
            {supervisors.length}
          </span>
        )}
      </div>
      
      {supervisors.length > 0 ? (
        <div className="space-y-1">
          {visibleSupervisors.map((supervisor) => {
            const supervisorUser = users.find((u: any) => u.id === supervisor.id);
            const supervisorPos = supervisorUser?.positionId ? getPositionById(supervisorUser.positionId) : null;
            return (
              <div key={supervisor.id} className="flex items-center justify-between gap-2">
                <div className="text-sm text-slate-900 dark:text-white">
                  <span className="font-medium">{supervisor.name}</span>
                  {supervisorPos && <span className="text-slate-500 dark:text-slate-400"> - {supervisorPos.name}</span>}
                </div>
                <button onClick={() => onRemove(supervisor.id)}
                  className="text-xs text-slate-400 hover:text-danger-500 transition-colors">
                  Remove
                </button>
              </div>
            );
          })}
          {hasMore && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <ChevronRight className={clsx("w-3 h-3 transition-transform", expanded && "rotate-90")} />
              {expanded ? 'Show less' : `+${supervisors.length - 1} more`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">None assigned</p>
      )}
    </div>
  );
}

function AddSupervisorDropdown({
  users, departments, currentUserId, excludeUserIds, onAdd,
}: {
  users: any[]; departments: any[]; currentUserId: string; excludeUserIds: string[]; onAdd: (id: string) => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<'user' | 'position'>('user');
  const [selectedPositionId, setSelectedPositionId] = useState('');

  const userOptions = useMemo(() => {
    return users.filter((u) => u.isActive && u.id !== currentUserId && !excludeUserIds.includes(u.id))
      .map((u) => ({ value: u.id, label: u.name })).sort((a, b) => a.label.localeCompare(b.label));
  }, [users, currentUserId, excludeUserIds]);

  useEffect(() => {
    const handlePendingEvent = (e: CustomEvent) => { toast.warning('Supervisor Not Added', e.detail.message); };
    window.addEventListener('position-selector-pending', handlePendingEvent as EventListener);
    return () => window.removeEventListener('position-selector-pending', handlePendingEvent as EventListener);
  }, [toast]);

  const handlePositionSelect = (positionId: string) => {
    if (!positionId) { setSelectedPositionId(''); return; }
    setSelectedPositionId(positionId);
    const usersInPosition = users.filter(u => u.positionId === positionId && u.isActive && u.id !== currentUserId && !excludeUserIds.includes(u.id));
    if (usersInPosition.length === 1) { 
      onAdd(usersInPosition[0].id); 
      setSelectedPositionId(''); 
    }
  };

  const usersInSelectedPosition = useMemo(() => {
    if (!selectedPositionId) return [];
    return users.filter(u => u.positionId === selectedPositionId && u.isActive && u.id !== currentUserId && !excludeUserIds.includes(u.id))
      .map(u => ({ value: u.id, label: u.name }));
  }, [selectedPositionId, users, currentUserId, excludeUserIds]);

  const selectedPositionName = useMemo(() => {
    if (!selectedPositionId) return '';
    for (const dept of departments) {
      const pos = dept.positions?.find((p: any) => p.id === selectedPositionId);
      if (pos) return pos.name;
    }
    return '';
  }, [selectedPositionId, departments]);

  const isPending = !!(selectedPositionId && usersInSelectedPosition.length === 0);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Add Supervisor</label>
      
      <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-full">
        <button onClick={() => { setMode('user'); setSelectedPositionId(''); }}
          className={clsx('flex-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors',
            mode === 'user' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
          By User
        </button>
        <button onClick={() => setMode('position')}
          className={clsx('flex-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors',
            mode === 'position' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
          By Position
        </button>
      </div>

      <div className="[&>div]:w-full [&_button]:w-full">
        {mode === 'user' ? (
          <SelectFilter label="Select user..." value="" options={userOptions} onChange={onAdd}
            icon={<User className="w-3.5 h-3.5" />} showAllOption={false} searchThreshold={3} />
        ) : (
          <div className="space-y-2">
            <PositionSelector value={selectedPositionId} departments={departments} onChange={handlePositionSelect}
              icon={<Briefcase className="w-3.5 h-3.5" />} placeholder="Select position..." pending={isPending}
              pendingMessage={`No one is assigned to "${selectedPositionName}"`} />
            {selectedPositionId && usersInSelectedPosition.length > 1 && (
              <SelectFilter label="Select user in position..." value="" options={usersInSelectedPosition}
                onChange={(userId) => { onAdd(userId); setSelectedPositionId(''); }}
                icon={<User className="w-3.5 h-3.5" />} showAllOption={false} searchThreshold={3} />
            )}
            {isPending && <p className="text-xs text-amber-600 dark:text-amber-400">No one currently holds this position</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignedItemsSection({ categories, totalCount, userId }: { categories: DependencyCategory[]; totalCount: number; userId: string }) {
  const navigate = useSafeNavigate();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = (module: string) => {
    setExpandedCategories((prev) => { const next = new Set(prev); if (next.has(module)) next.delete(module); else next.add(module); return next; });
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
            <button onClick={() => toggleCategory(category.module)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <IconComponent className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">{category.label}</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">{category.items.length}</span>
              </div>
              <ChevronRight className={clsx('w-4 h-4 text-slate-400 transition-transform', isExpanded && 'rotate-90')} />
            </button>
            {isExpanded && (
              <div className="px-4 pb-3 space-y-1">
                {category.items.map((item) => <AssignedItemRow key={item.id} item={item} category={category} userId={userId} onNavigate={(url) => navigate(url)} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssignedItemRow({ item, category, userId, onNavigate }: { item: { id: string; name: string; url?: string }; category: DependencyCategory; userId: string; onNavigate: (url: string) => void }) {
  const { companies } = useClientsStore();
  const [showAddresses, setShowAddresses] = useState(false);
  
  const companyAddresses = useMemo(() => {
    if (category.module !== 'companies') return [];
    const company = companies.find(c => c.id === item.id);
    if (!company) return [];
    const addresses: { id: string; label: string; isAssigned: boolean }[] = [];
    if (company.address) {
      const isAssigned = company.address.salesRepIds?.includes(userId) || company.address.salesRepId === userId;
      addresses.push({ id: 'main', label: 'Main Office', isAssigned });
    }
    if (company.addresses) {
      company.addresses.forEach(addr => {
        const isAssigned = addr.salesRepIds?.includes(userId) || addr.salesRepId === userId;
        addresses.push({ id: addr.id, label: addr.label || `${addr.city}, ${addr.state}`, isAssigned });
      });
    }
    return addresses;
  }, [category.module, companies, item.id, userId]);
  
  const hasMultipleAddresses = companyAddresses.length > 1;
  const assignedAddresses = companyAddresses.filter(a => a.isAssigned);
  
  return (
    <div className="space-y-1">
      <div onClick={() => item.url && onNavigate(item.url)}
        className={clsx('flex items-center justify-between px-3 py-2 rounded-lg', 'bg-slate-50 dark:bg-slate-800/30', item.url && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800')}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
          {hasMultipleAddresses && assignedAddresses.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setShowAddresses(!showAddresses); }}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded hover:bg-slate-300 dark:hover:bg-slate-600">
              <MapPin className="w-3 h-3" />{assignedAddresses.length} location{assignedAddresses.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
        {item.url && <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
      </div>
      {showAddresses && assignedAddresses.length > 0 && (
        <div className="ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
          {assignedAddresses.map(addr => (
            <div key={addr.id} className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="w-3 h-3" /><span>{addr.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PermissionRow({ label, description, inherited, enabled, overridden, onToggle, onOverrideChange }: {
  label: string; description?: string; inherited: boolean; enabled: boolean; overridden: boolean;
  onToggle: () => void; onOverrideChange: (override: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
          {overridden && <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">Overridden</span>}
        </div>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {!overridden && inherited && <span className="text-xs text-slate-400">From position</span>}
        <Toggle checked={enabled} onChange={onToggle} size="sm" activeColor={overridden ? 'warning' : 'brand'} />
        <button onClick={() => onOverrideChange(!overridden)}
          className={clsx('p-1 rounded transition-colors', overridden ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}
          title={overridden ? 'Remove override' : 'Override this permission'}>
          {overridden ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function UserDetailPage() {
  const navigate = useSafeNavigate();
  const routerNavigate = useNavigate();
  const toast = useToast();
  const { user, notFound, isRedirecting } = useUserBySlug();
  const { users, updateUser, deleteUser, toggleUserActive } = useUsersStore();
  const { departments, getPositionsByDepartment, getPositionById } = useFieldsStore();
  const { company } = useCompanyStore();
  const { setGuard, clearGuard } = useNavigationGuardStore();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showClearSupervisorsModal, setShowClearSupervisorsModal] = useState(false);
  const [pendingFieldChange, setPendingFieldChange] = useState<{ field: string; value: string } | null>(null);
  const [editingFields, setEditingFields] = useState<Map<string, boolean>>(new Map());
  const hasUnsavedEdits = Array.from(editingFields.values()).some((hasChanges) => hasChanges);
  
  useEffect(() => { setGuard(hasUnsavedEdits); return () => clearGuard(); }, [hasUnsavedEdits, setGuard, clearGuard]);
  
  const handleEditingChange = useCallback((fieldName: string) => {
    return (isEditing: boolean, hasChanges: boolean) => {
      setEditingFields((prev) => { const next = new Map(prev); if (isEditing && hasChanges) next.set(fieldName, true); else next.delete(fieldName); return next; });
    };
  }, []);
  
  useDocumentTitle(user?.name || 'User');
  
  const offices = company.offices || [];
  const showOffice = offices.length >= 2;
  const userPosition = useMemo(() => { if (!user?.positionId) return null; return getPositionById(user.positionId); }, [user?.positionId, getPositionById]);
  const supervisorPosition = useMemo(() => { if (!userPosition?.reportsToPositionId) return null; return getPositionById(userPosition.reportsToPositionId); }, [userPosition, getPositionById]);
  const usersInSupervisorPosition = useMemo(() => { if (!supervisorPosition) return []; return users.filter((u) => u.positionId === supervisorPosition.id && u.isActive); }, [supervisorPosition, users]);
  const autoSupervisor = useMemo(() => { if (usersInSupervisorPosition.length === 1) return usersInSupervisorPosition[0]; return null; }, [usersInSupervisorPosition]);
  const departmentOptions = useMemo(() => departments.map((d) => ({ value: d.id, label: d.name })), [departments]);
  const positionOptions = useMemo(() => { if (!user?.departmentId) return []; return getPositionsByDepartment(user.departmentId).map((p) => ({ value: p.id, label: p.name })); }, [user?.departmentId, getPositionsByDepartment]);
  
  const additionalSupervisorIds: string[] = (user as any)?.supervisorIds || ((user as any)?.supervisorId ? [(user as any).supervisorId] : []);
  const additionalSupervisors = useMemo(() => { return additionalSupervisorIds.map(id => users.find(u => u.id === id)).filter(Boolean) as typeof users; }, [additionalSupervisorIds, users]);
  const hasAdditionalSupervisors = additionalSupervisors.length > 0;
  const officeOptions = useMemo(() => offices.map((o) => ({ value: o.id, label: o.isMain ? `${o.label} (Main)` : o.label })), [offices]);
  const dependencies = useMemo(() => { if (!user) return { categories: [], totalCount: 0, hasItems: false, userId: '', userName: '' }; return getUserDependencies(user.id, user.name); }, [user]);
  
  const handleFieldSave = (field: string, value: string) => {
    if (!user) return;
    
    // Check if changing department, position, or office and user has additional supervisors
    const isStructureField = ['departmentId', 'positionId', 'officeId'].includes(field);
    if (isStructureField && hasAdditionalSupervisors) {
      // Store pending change and show confirmation
      setPendingFieldChange({ field, value });
      setShowClearSupervisorsModal(true);
      return;
    }
    
    // Apply the change directly
    applyFieldChange(field, value);
  };
  
  const applyFieldChange = (field: string, value: string, clearSupervisors: boolean = false) => {
    if (!user) return;
    
    const updates: any = { [field]: value };
    
    // If changing department, clear position
    if (field === 'departmentId' && value !== user.departmentId) {
      updates.positionId = '';
      toast.success('Updated', 'Department changed - please select a position');
    } else {
      toast.success('Updated', `${field.charAt(0).toUpperCase() + field.slice(1).replace('Id', '')} updated`);
    }
    
    // Clear supervisors if requested
    if (clearSupervisors) {
      updates.supervisorIds = undefined;
      updates.defaultSupervisorDisabled = false;
    }
    
    updateUser(user.id, updates);
  };
  
  const handleClearSupervisorsConfirm = (clearThem: boolean) => {
    if (pendingFieldChange) {
      applyFieldChange(pendingFieldChange.field, pendingFieldChange.value, clearThem);
    }
    setShowClearSupervisorsModal(false);
    setPendingFieldChange(null);
  };
  
  const handleAddAdditionalSupervisor = (supervisorId: string) => {
    if (!user || !supervisorId) return;
    if (additionalSupervisorIds.includes(supervisorId)) { toast.error('Already Added', 'This supervisor is already in the list'); return; }
    const newIds = [...additionalSupervisorIds, supervisorId];
    updateUser(user.id, { supervisorIds: newIds } as any); toast.success('Updated', 'Additional supervisor added');
  };
  
  const handleRemoveAdditionalSupervisor = (supervisorId: string) => {
    if (!user) return;
    const newIds = additionalSupervisorIds.filter(id => id !== supervisorId);
    if (newIds.length === 0 && (user as any)?.defaultSupervisorDisabled) {
      updateUser(user.id, { supervisorIds: undefined, defaultSupervisorDisabled: false } as any);
      toast.success('Updated', 'Additional supervisor removed - default supervisor re-enabled');
    } else {
      updateUser(user.id, { supervisorIds: newIds.length > 0 ? newIds : undefined } as any);
      toast.success('Updated', 'Additional supervisor removed');
    }
  };
  
  const handleToggleActive = () => {
    if (!user) return;
    if (user.isActive) { setShowDeactivateModal(true); } else { toggleUserActive(user.id); toast.success('Activated', `${user.name} has been activated`); }
  };
  
  const handleDeactivateConfirm = (reassignToUserId: string | null) => {
    if (!user) return;
    toggleUserActive(user.id);
    const message = reassignToUserId ? `${user.name} has been deactivated and items reassigned` : `${user.name} has been deactivated`;
    toast.success('Deactivated', message); setShowDeactivateModal(false);
  };
  
  const handleDelete = () => { if (!user) return; deleteUser(user.id); toast.success('Deleted', `${user.name} has been deleted`); navigate('/admin/users'); };
  
  if (isRedirecting) return null;
  
  if (notFound || !user) {
    return (
      <Page title="User Not Found">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">User not found</h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">The user you're looking for doesn't exist or has been deleted.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/admin/users')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Users</Button>
        </div>
      </Page>
    );
  }
  
  const userDepartment = departments.find(d => d.id === user.departmentId);
  const hasMissingDepartment = user.departmentId && !userDepartment;
  const hasMissingPosition = user.positionId && !userPosition;
  const hasMissingSupervisor = additionalSupervisorIds.length > 0 && additionalSupervisors.length < additionalSupervisorIds.length;
  const hasDataIssues = hasMissingDepartment || hasMissingPosition || hasMissingSupervisor;
  
  return (
    <Page title={user.name} description={userPosition?.name || 'User details'}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => routerNavigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
        </div>
      }>
      {hasDataIssues && (
        <div className="mb-4 space-y-2">
          {hasMissingDepartment && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1"><p className="text-sm font-medium text-amber-800 dark:text-amber-200">Department not found</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">The assigned department has been deleted. Please select a new department.</p></div>
            </div>
          )}
          {hasMissingPosition && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1"><p className="text-sm font-medium text-amber-800 dark:text-amber-200">Position not found</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">The assigned position has been deleted. Please select a new position.</p></div>
            </div>
          )}
          {hasMissingSupervisor && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <div><p className="text-sm font-medium text-amber-800 dark:text-amber-200">Additional supervisor not found</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">One or more additional supervisors have been deleted or deactivated.</p></div>
                <Button variant="secondary" size="sm" onClick={() => { const validIds = additionalSupervisors.map(s => s.id); updateUser(user.id, { supervisorIds: validIds.length > 0 ? validIds : undefined } as any); toast.success('Updated', 'Invalid supervisors removed'); }}>Clear Invalid</Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader title="Basic Information" icon={<User className="w-4 h-4 text-slate-500" />} />
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InlineField label="Full Name" value={user.name} onSave={(v) => handleFieldSave('name', v)} placeholder="Enter name" icon={<User className="w-3.5 h-3.5" />} onEditingChange={handleEditingChange('name')} />
                <InlineField label="Email" value={user.email} onSave={(v) => handleFieldSave('email', v)} type="email" placeholder="Enter email" icon={<Mail className="w-3.5 h-3.5" />} onEditingChange={handleEditingChange('email')} />
                <InlineField label="Phone" value={user.phone || ''} onSave={(v) => handleFieldSave('phone', v)} type="tel" placeholder="Enter phone" icon={<Phone className="w-3.5 h-3.5" />} onEditingChange={handleEditingChange('phone')} />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</label>
                  <div className="flex items-center gap-3">
                    <Toggle checked={user.isActive} onChange={handleToggleActive} activeColor="success" />
                    <span className={clsx('text-sm font-medium', user.isActive ? 'text-success-600' : 'text-slate-400')}>{user.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-400"><Calendar className="w-3.5 h-3.5" /><span>Created {new Date(user.createdAt).toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>
          
          <CollapsibleSection title="Department & Position" icon={<Briefcase className="w-4 h-4 text-slate-500" />} defaultOpen={true}>
            <div className="p-4 space-y-4">
              <div className={clsx("grid gap-4", showOffice ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
                <FormSelectField label="Department" value={user.departmentId || ''} options={departmentOptions} onChange={(v) => handleFieldSave('departmentId', v)} placeholder="Select department" icon={<Building2 className="w-3.5 h-3.5" />} />
                <FormSelectField label="Position" value={user.positionId || ''} options={positionOptions} onChange={(v) => handleFieldSave('positionId', v)} placeholder={user.departmentId ? 'Select position' : 'Select department first'} disabled={!user.departmentId} icon={<Briefcase className="w-3.5 h-3.5" />} />
                {showOffice && <FormSelectField label="Office Location" value={user.officeId || ''} options={officeOptions} onChange={(v) => handleFieldSave('officeId', v)} placeholder="Select office" icon={<MapPin className="w-3.5 h-3.5" />} />}
              </div>
              
              {/* Reporting Structure - always show */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3"><GitBranch className="w-4 h-4 text-slate-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reporting Structure</span></div>
                
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Left - Reports To & Additional Supervisors */}
                  <div className="flex-1 space-y-4">
                    {/* Reports To */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Reports to</label>
                        {userPosition ? (
                          supervisorPosition ? (
                            <div className={clsx("text-sm", (user as any)?.defaultSupervisorDisabled ? "text-slate-400 line-through" : "text-slate-900 dark:text-white")}>
                              <span className="font-medium">{supervisorPosition.name}</span>
                              {usersInSupervisorPosition.length === 1 && autoSupervisor && <span className="text-slate-500"> ({autoSupervisor.name})</span>}
                              {usersInSupervisorPosition.length === 0 && <span className="text-amber-600 dark:text-amber-400"> (vacant)</span>}
                              {usersInSupervisorPosition.length > 1 && <span className="text-amber-600 dark:text-amber-400"> ({usersInSupervisorPosition.length} people)</span>}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-700 dark:text-slate-300">{userPosition.reportsToPositionId === null ? 'Department Head' : 'Not defined'}</div>
                          )
                        ) : (
                          <div className="text-sm text-slate-400 italic">Select a position first</div>
                        )}
                      </div>
                      {userPosition && supervisorPosition && (
                        <button onClick={() => {
                          const isCurrentlyDisabled = (user as any)?.defaultSupervisorDisabled;
                          if (!isCurrentlyDisabled && !hasAdditionalSupervisors) { toast.warning('Cannot Disable', 'Add an additional supervisor first before disabling the default'); return; }
                          const newValue = !isCurrentlyDisabled;
                          updateUser(user.id, { defaultSupervisorDisabled: newValue } as any);
                          toast.success('Updated', newValue ? 'Default supervisor disabled' : 'Default supervisor enabled');
                        }} className={clsx("text-xs transition-colors",
                          (user as any)?.defaultSupervisorDisabled ? "text-brand-600 hover:text-brand-700" :
                          hasAdditionalSupervisors ? "text-slate-400 hover:text-slate-600" : "text-slate-300 cursor-not-allowed")}>
                          {(user as any)?.defaultSupervisorDisabled ? 'Enable' : 'Disable'}
                        </button>
                      )}
                    </div>
                    
                    {/* Additional Supervisors */}
                    <AdditionalSupervisorsInline
                      supervisors={additionalSupervisors}
                      users={users}
                      getPositionById={getPositionById}
                      onRemove={handleRemoveAdditionalSupervisor}
                    />
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px bg-slate-200 dark:bg-slate-700 self-stretch min-h-[80px]" />

                  {/* Right - Add Supervisor */}
                  <div className="flex-1">
                    <AddSupervisorDropdown
                      users={users}
                      departments={departments}
                      currentUserId={user.id}
                      excludeUserIds={additionalSupervisorIds}
                      onAdd={handleAddAdditionalSupervisor}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
          
          <CollapsibleSection title="Permissions" icon={<Shield className="w-4 h-4 text-slate-500" />} defaultOpen={false} badge={userPosition ? 'From position' : undefined}>
            <div className="p-4">
              {userPosition ? (
                <>
                  <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <Info className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">Permissions are inherited from the <strong>{userPosition.name}</strong> position. You can override specific permissions below.</p>
                  </div>
                  <div className="space-y-1">
                    <PermissionRow label="Admin Panel" description="Access to user management and settings" inherited={true} enabled={true} overridden={false} onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')} onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')} />
                    <PermissionRow label="Customers Panel" description="Access to companies and contacts" inherited={true} enabled={true} overridden={false} onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')} onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')} />
                    <PermissionRow label="Projects Panel" description="Access to project management" inherited={true} enabled={false} overridden={false} onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')} onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')} />
                    <PermissionRow label="Estimating Panel" description="Access to estimates" inherited={true} enabled={false} overridden={false} onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')} onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')} />
                    <PermissionRow label="Accounting Panel" description="Access to invoices and financials" inherited={true} enabled={false} overridden={false} onToggle={() => toast.info('Coming Soon', 'Permission management coming soon')} onOverrideChange={() => toast.info('Coming Soon', 'Permission overrides coming soon')} />
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
        
        <div className="space-y-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <SectionHeader title="Assigned Items" icon={<Briefcase className="w-4 h-4 text-slate-500" />}
              action={dependencies.totalCount > 0 && <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full">{dependencies.totalCount}</span>} />
            <div className="bg-white dark:bg-slate-900">
              <AssignedItemsSection categories={dependencies.categories} totalCount={dependencies.totalCount} userId={user.id} />
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDelete}
        title="Delete User" message={`Are you sure you want to delete "${user.name}"? This action cannot be undone.`} confirmText="Delete" variant="danger" />
      
      <UserDeactivationModal isOpen={showDeactivateModal} onClose={() => setShowDeactivateModal(false)} onConfirm={handleDeactivateConfirm} user={user} mode="deactivate" />
      
      {/* Clear Additional Supervisors Confirmation */}
      <ConfirmModal
        isOpen={showClearSupervisorsModal}
        onClose={() => {
          // Apply change without clearing supervisors
          if (pendingFieldChange) {
            applyFieldChange(pendingFieldChange.field, pendingFieldChange.value, false);
          }
          setShowClearSupervisorsModal(false);
          setPendingFieldChange(null);
        }}
        onConfirm={() => handleClearSupervisorsConfirm(true)}
        title="Clear Additional Supervisors?"
        message={`This user has ${additionalSupervisors.length} additional supervisor${additionalSupervisors.length > 1 ? 's' : ''}. Would you like to clear them as well?`}
        confirmText="Yes, Clear"
        cancelText="No, Keep"
        variant="warning"
      />
    </Page>
  );
}
