import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Plus,
  Users,
  Check,
  Loader2,
  Mail,
  Phone,
  Shield,
  UserCheck,
  Trash2,
  MapPin,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { CardContent, Button, Input, Modal, SearchInput, Select, Toggle } from '@/components/common';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { SelectFilter } from '@/components/common/SelectFilter';
import { UserDeactivationModal } from '@/components/common/UserDeactivationModal';
import { useToast, useFieldsStore, useUsersStore, useCompanyStore, type User } from '@/contexts';
import { useFormChanges, useDocumentTitle } from '@/hooks';
import { validateEmail, validatePhone } from '@/utils/validation';

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  officeId: string;
  isActive: boolean;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  departmentId: '',
  positionId: '',
  officeId: '',
  isActive: true,
};

type SortField = 'name' | 'department';
type SortDirection = 'asc' | 'desc';

// User Modal Component
function UserModal({
  isOpen,
  onClose,
  user,
  onSave,
  onDelete,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (data: UserFormData) => void;
  onDelete?: () => void;
  isLoading: boolean;
}) {
  const toast = useToast();
  useDocumentTitle('Manage Users');
  const { departments } = useFieldsStore();
  const { company } = useCompanyStore();

  // Get offices - only show selector if 2+ offices
  const offices = company.offices || [];
  const showOfficeSelector = offices.length >= 2;

  const getInitialData = (): UserFormData => {
    if (user) {
      return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        departmentId: user.departmentId,
        positionId: user.positionId,
        officeId: user.officeId || '',
        isActive: user.isActive,
      };
    }
    return initialFormData;
  };

  const { formData, setFormData, hasChanges, resetForm, initializeForm } = useFormChanges<UserFormData>(getInitialData());

  // Get positions for selected department
  const selectedDepartment = departments.find(d => d.id === formData.departmentId);
  const availablePositions = selectedDepartment?.positions || [];

  // Department options for Select
  const departmentOptions = useMemo(() => 
    departments.map((dept) => ({ value: dept.id, label: dept.name })),
    [departments]
  );

  // Position options for Select
  const positionOptions = useMemo(() => 
    availablePositions.map((pos) => ({ value: pos.id, label: pos.name })),
    [availablePositions]
  );

  // Office options for Select
  const officeOptions = useMemo(() => 
    offices.map((office) => ({ 
      value: office.id, 
      label: office.isMain ? `${office.label} (Main)` : office.label 
    })),
    [offices]
  );

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      initializeForm(getInitialData());
    }
  }, [isOpen, user?.id]); // Re-initialize when modal opens or different user is selected

  // Reset position when department changes (if position not in new department)
  useEffect(() => {
    if (formData.departmentId && formData.positionId) {
      const positionExists = availablePositions.some(p => p.id === formData.positionId);
      if (!positionExists) {
        setFormData({ ...formData, positionId: '' });
      }
    }
  }, [formData.departmentId]); // Only run when department changes

  // Validation checks
  const hasEmailError = formData.email !== '' && !validateEmail(formData.email);
  const hasPhoneError = formData.phone !== '' && !validatePhone(formData.phone);
  const hasValidationErrors = hasEmailError || hasPhoneError;

  const handleSubmit = async () => {
    // Check required fields
    if (!formData.name || !formData.email) {
      toast.error('Error', 'Name and email are required');
      return;
    }

    // Check validation errors
    if (hasValidationErrors) {
      toast.error('Validation Error', 'Please fix the errors before saving');
      return;
    }

    onSave(formData);
  };

  const handleDiscard = () => {
    resetForm();
  };

  const handleDepartmentChange = (deptId: string) => {
    setFormData({ ...formData, departmentId: deptId, positionId: '' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Add New User'}
      size="xl"
      hasUnsavedChanges={hasChanges}
      onSaveChanges={handleSubmit}
      onDiscardChanges={handleDiscard}
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {user && onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isLoading || !formData.name || !formData.email || hasValidationErrors}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {user ? 'Update User' : 'Add User'}
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
            />
            <Input
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@sgbsny.com"
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        {/* Department & Position */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Department & Position
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Department"
                value={formData.departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                options={departmentOptions}
                placeholder="Select Department"
              />
              {departments.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No departments available. <a href="/admin/fields" className="text-brand-500 hover:underline">Add departments</a>
                </p>
              )}
            </div>
            <div>
              <Select
                label="Position"
                value={formData.positionId}
                onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                options={positionOptions}
                placeholder={formData.departmentId ? 'Select Position' : 'Select a department first'}
                disabled={!formData.departmentId}
              />
              {formData.departmentId && availablePositions.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No positions in this department. <a href="/admin/fields" className="text-brand-500 hover:underline">Add positions</a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Office Location - Only show if 2+ offices */}
        {showOfficeSelector && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
              Office Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Office"
                value={formData.officeId}
                onChange={(e) => setFormData({ ...formData, officeId: e.target.value })}
                options={officeOptions}
                placeholder="Select Office"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Select which office location this user works from.
            </p>
          </div>
        )}

        {/* Status */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Status
          </h3>
          <Toggle
            checked={formData.isActive}
            onChange={(checked) => setFormData({ ...formData, isActive: checked })}
            label={formData.isActive ? 'Active' : 'Inactive'}
            activeColor="brand"
          />
        </div>

        {/* Permission Overrides - Placeholder */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Permission Overrides</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Coming soon - Configure user-specific permission overrides
          </p>
        </div>

        {/* Temporary Access - Placeholder */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <UserCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Temporary Access</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Coming soon - Grant temporary access with expiration dates
          </p>
        </div>
      </div>
    </Modal>
  );
}

// Main Page Component
export function ManageUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const toast = useToast();
  useDocumentTitle('Manage Users');

  // Use the shared stores
  const { users, addUser, updateUser, deleteUser, toggleUserActive } = useUsersStore();
  const { departments } = useFieldsStore();
  const { company } = useCompanyStore();

  // Get offices - only show filter/column if 2+ offices
  const offices = company.offices || [];
  const showOfficeColumn = offices.length >= 2;

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || '—';
  };

  const getPositionName = (departmentId: string, positionId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    const pos = dept?.positions.find(p => p.id === positionId);
    return pos?.name || '—';
  };

  const getOfficeName = (officeId?: string) => {
    if (!officeId) return '—';
    const office = offices.find(o => o.id === officeId);
    return office?.label || '—';
  };

  // Status filter options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Department filter options
  const departmentOptions = useMemo(() => {
    const deptCounts = new Map<string, number>();
    users.forEach((user) => {
      if (user.departmentId) {
        deptCounts.set(user.departmentId, (deptCounts.get(user.departmentId) || 0) + 1);
      }
    });
    return departments
      .filter((d) => deptCounts.has(d.id))
      .map((dept) => ({
        value: dept.id,
        label: dept.name,
        count: deptCounts.get(dept.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [departments, users]);

  // Office filter options (only if 2+ offices)
  const officeFilterOptions = useMemo(() => {
    if (!showOfficeColumn) return [];
    const officeCounts = new Map<string, number>();
    users.forEach((user) => {
      if (user.officeId) {
        officeCounts.set(user.officeId, (officeCounts.get(user.officeId) || 0) + 1);
      }
    });
    return offices
      .map((office) => ({
        value: office.id,
        label: office.isMain ? `${office.label} (Main)` : office.label,
        count: officeCounts.get(office.id) || 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [offices, users, showOfficeColumn]);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);
      const matchesDepartment = !departmentFilter || user.departmentId === departmentFilter;
      const matchesOffice = !officeFilter || user.officeId === officeFilter;
      return matchesSearch && matchesStatus && matchesDepartment && matchesOffice;
    });

    result = [...result].sort((a, b) => {
      let aVal = '';
      let bVal = '';

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'department':
          aVal = getDepartmentName(a.departmentId).toLowerCase();
          bVal = getDepartmentName(b.departmentId).toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, statusFilter, departmentFilter, officeFilter, sortField, sortDirection, departments]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };

  const handleSave = async (formData: UserFormData) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (editingUser) {
      updateUser(editingUser.id, formData);
      toast.success('Updated', formData.name + ' has been updated');
    } else {
      addUser(formData);
      toast.success('Created', formData.name + ' has been added');
    }

    setIsLoading(false);
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteFromModal = () => {
    if (editingUser) {
      setUserToDelete(editingUser);
      setIsModalOpen(false);
    }
  };

  const confirmDelete = (reassignToUserId: string | null) => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      const message = reassignToUserId 
        ? `${userToDelete.name} has been removed and items reassigned`
        : `${userToDelete.name} has been removed`;
      toast.success('Deleted', message);
      setUserToDelete(null);
      setEditingUser(null);
    }
  };

  const handleToggleClick = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    // Only show deactivation modal when deactivating (not activating)
    if (user.isActive) {
      setUserToToggle(user);
    } else {
      // Directly activate without modal
      toggleUserActive(user.id);
      toast.success('Activated', user.name + ' has been activated');
    }
  };

  const confirmToggle = (reassignToUserId: string | null) => {
    if (userToToggle) {
      toggleUserActive(userToToggle.id);
      const message = reassignToUserId 
        ? `${userToToggle.name} has been deactivated and items reassigned`
        : `${userToToggle.name} has been deactivated`;
      toast.success('Deactivated', message);
      setUserToToggle(null);
    }
  };

  const openUserDetail = (user: User) => {
    navigate(`/admin/users/${user.id}`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setOfficeFilter('');
  };

  const hasActiveFilters = search || statusFilter || departmentFilter || officeFilter;

  // Table columns
  const columns: DataTableColumn<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
            user.isActive
              ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
          )}>
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="font-medium text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">
            {user.name}
          </span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <a
          href={'mailto:' + user.email}
          className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Mail className="w-3 h-3" />
          {user.email}
        </a>
      ),
      hideOnMobile: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (user) => (
        <span className="text-slate-600 dark:text-slate-400">
          {user.phone ? (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {user.phone}
            </span>
          ) : (
            '—'
          )}
        </span>
      ),
      hideOnMobile: true,
    },
    // Office column - only shown if 2+ offices
    ...(showOfficeColumn ? [{
      key: 'office',
      header: 'Office',
      render: (user: User) => (
        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {getOfficeName(user.officeId)}
        </span>
      ),
      hideOnMobile: true,
    }] : []),
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      render: (user) => (
        <span className="text-slate-600 dark:text-slate-400">
          {getDepartmentName(user.departmentId)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'position',
      header: 'Position',
      render: (user) => (
        <span className="text-slate-600 dark:text-slate-400">
          {getPositionName(user.departmentId, user.positionId)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (user) => (
        <Toggle
          checked={user.isActive}
          onChange={() => {}}
          onClick={(e) => handleToggleClick(user, e as unknown as React.MouseEvent)}
          activeColor="success"
          size="md"
        />
      ),
    },
  ];

  return (
    <Page
      title="Manage Users"
      description="Add, edit, and manage user accounts and permissions."
      fillHeight
      actions={
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
        >
          Add User
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={filteredAndSortedUsers}
        rowKey={(user) => user.id}
        onRowClick={(user) => openUserDetail(user)}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        filters={
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search users..."
              className="w-full sm:w-64"
            />
            <SelectFilter
              label="Status"
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
              icon={<UserCheck className="w-4 h-4" />}
            />
            {departmentOptions.length > 0 && (
              <SelectFilter
                label="Department"
                value={departmentFilter}
                options={departmentOptions}
                onChange={setDepartmentFilter}
                icon={<Users className="w-4 h-4" />}
              />
            )}
            {showOfficeColumn && officeFilterOptions.length > 0 && (
              <SelectFilter
                label="Office"
                value={officeFilter}
                options={officeFilterOptions}
                onChange={setOfficeFilter}
                icon={<MapPin className="w-4 h-4" />}
              />
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        }
        emptyState={
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              {hasActiveFilters ? 'No users found' : 'No users yet'}
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try adjusting your filters or search term'
                : 'Get started by adding your first user'}
            </p>
            {!hasActiveFilters && (
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            )}
          </CardContent>
        }
      />

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        user={editingUser}
        onSave={handleSave}
        onDelete={editingUser ? handleDeleteFromModal : undefined}
        isLoading={isLoading}
      />

      {/* Delete User Modal - with dependency check */}
      <UserDeactivationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        user={userToDelete}
        mode="delete"
      />

      {/* Deactivate User Modal - with dependency check */}
      <UserDeactivationModal
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={confirmToggle}
        user={userToToggle}
        mode="deactivate"
      />
    </Page>
  );
}