import { useState, useMemo } from 'react';
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
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, ConfirmModal, SearchInput } from '@/components/common';
import { useToast, useDepartmentsStore, useUsersStore, type User } from '@/contexts';
import { useFormChanges } from '@/hooks';

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  isActive: boolean;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  departmentId: '',
  positionId: '',
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
  const { departments } = useDepartmentsStore();

  const getInitialData = (): UserFormData => {
    if (user) {
      return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        departmentId: user.departmentId,
        positionId: user.positionId,
        isActive: user.isActive,
      };
    }
    return initialFormData;
  };

  const { formData, setFormData, hasChanges, resetForm, initializeForm } = useFormChanges<UserFormData>(getInitialData());

  // Get positions for selected department
  const selectedDepartment = departments.find(d => d.id === formData.departmentId);
  const availablePositions = selectedDepartment?.positions || [];

  // Reset form when user changes or modal opens
  useState(() => {
    if (isOpen) {
      initializeForm(getInitialData());
    }
  });

  // Reset position when department changes (if position not in new department)
  useState(() => {
    if (formData.departmentId && formData.positionId) {
      const positionExists = availablePositions.some(p => p.id === formData.positionId);
      if (!positionExists) {
        setFormData({ ...formData, positionId: '' });
      }
    }
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Error', 'Name and email are required');
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
              disabled={isLoading || !formData.name || !formData.email}
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg
                  bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {departments.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No departments available. <a href="/admin/departments" className="text-brand-500 hover:underline">Add departments</a>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Position
              </label>
              <select
                value={formData.positionId}
                onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                disabled={!formData.departmentId}
                className={clsx(
                  "w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg",
                  "bg-white dark:bg-slate-800 text-slate-900 dark:text-white",
                  "focus:outline-none focus:ring-2 focus:ring-brand-500",
                  !formData.departmentId && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">
                  {formData.departmentId ? 'Select Position' : 'Select a department first'}
                </option>
                {availablePositions.map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
              {formData.departmentId && availablePositions.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No positions in this department. <a href="/admin/departments" className="text-brand-500 hover:underline">Add positions</a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
            Status
          </h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={clsx(
                'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                formData.isActive ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
              )}
              onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
            >
              <div
                className={clsx(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform left-0.5',
                  formData.isActive && 'translate-x-[22px]'
                )}
              />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {formData.isActive ? 'Active' : 'Inactive'}
            </span>
          </label>
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const toast = useToast();

  // Use the shared stores
  const { users, addUser, updateUser, deleteUser, toggleUserActive } = useUsersStore();
  const { departments } = useDepartmentsStore();

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || '—';
  };

  const getPositionName = (departmentId: string, positionId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    const pos = dept?.positions.find(p => p.id === positionId);
    return pos?.name || '—';
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);
      return matchesSearch && matchesStatus;
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
  }, [users, search, statusFilter, sortField, sortDirection, departments]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
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

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      toast.success('Deleted', userToDelete.name + ' has been removed');
      setUserToDelete(null);
      setEditingUser(null);
    }
  };

  const handleToggleClick = (user: User) => {
    setUserToToggle(user);
  };

  const confirmToggle = () => {
    if (userToToggle) {
      toggleUserActive(userToToggle.id);
      toast.success(
        userToToggle.isActive ? 'Deactivated' : 'Activated',
        userToToggle.name + ' has been ' + (userToToggle.isActive ? 'deactivated' : 'activated')
      );
      setUserToToggle(null);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  return (
    <Page
      title="Manage Users"
      description="Add, edit, and manage user accounts and permissions."
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
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
          className="flex-1 max-w-md"
        />

        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {filteredAndSortedUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              No users found
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {search ? 'Try different search terms' : 'Get started by adding your first user'}
            </p>
            {!search && (
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
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Phone
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => handleSort('department')}
                  >
                    <div className="flex items-center gap-1">
                      Department
                      <SortIcon field="department" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Position
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="flex items-center gap-3 text-left hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      >
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
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={'mailto:' + user.email}
                        className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {user.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {getDepartmentName(user.departmentId)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {getPositionName(user.departmentId, user.positionId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleToggleClick(user)}
                          className={clsx(
                            'w-11 h-6 rounded-full transition-colors relative',
                            user.isActive ? 'bg-success-500' : 'bg-slate-300 dark:bg-slate-600'
                          )}
                          title={user.isActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <div
                            className={clsx(
                              'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform left-0.5',
                              user.isActive && 'translate-x-[22px]'
                            )}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        user={editingUser}
        onSave={handleSave}
        onDelete={editingUser ? handleDeleteFromModal : undefined}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete User"
        message={'Are you sure you want to delete "' + (userToDelete?.name || '') + '"? This action cannot be undone.'}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Toggle Status Confirmation Modal */}
      <ConfirmModal
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={confirmToggle}
        title={userToToggle?.isActive ? 'Deactivate User' : 'Activate User'}
        message={'Are you sure you want to ' + (userToToggle?.isActive ? 'deactivate' : 'activate') + ' "' + (userToToggle?.name || '') + '"?'}
        confirmText={userToToggle?.isActive ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        variant={userToToggle?.isActive ? 'warning' : 'primary'}
      />
    </Page>
  );
}