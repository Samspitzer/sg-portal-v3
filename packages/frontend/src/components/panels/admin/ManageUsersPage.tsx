import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  Loader2,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, ConfirmModal } from '@/components/common';
import { useToast, useDepartmentsStore } from '@/contexts';
import { useFormChanges } from '@/hooks';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  positionId: string;
  isActive: boolean;
  createdAt: string;
}

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

// Empty - will be populated from API later
const mockUsers: User[] = [];

// User Modal Component
function UserModal({
  isOpen,
  onClose,
  user,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSave: (data: UserFormData) => void;
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
  useEffect(() => {
    if (isOpen) {
      initializeForm(getInitialData());
    }
  }, [isOpen, user]);

  // Reset position when department changes (if position not in new department)
  useEffect(() => {
    if (formData.departmentId && formData.positionId) {
      const positionExists = availablePositions.some(p => p.id === formData.positionId);
      if (!positionExists) {
        setFormData({ ...formData, positionId: '' });
      }
    }
  }, [formData.departmentId]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Error', 'Name and email are required');
      return;
    }
    onSave(formData);
    toast.success('Saved', user ? 'User updated successfully' : 'User added successfully');
  };

  const handleDiscard = () => {
    resetForm();
  };

  const handleDepartmentChange = (deptId: string) => {
    // Reset position when department changes
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
        <>
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
        </>
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

// User Card Component
function UserCard({
  user,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { departments } = useDepartmentsStore();

  // Get display names
  const department = departments.find(d => d.id === user.departmentId);
  const position = department?.positions.find(p => p.id === user.positionId);

  const displayPosition = position?.name || 'No Position';
  const displayDepartment = department?.name || 'No Department';
  return (
    <Card hover className="relative">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold',
              user.isActive
                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            )}>
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {user.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {displayPosition} • {displayDepartment}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800
                  rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                  <button
                    onClick={() => { onEdit(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                      hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <Edit className="w-4 h-4" />
                    Edit User
                  </button>
                  <button
                    onClick={() => { onToggleActive(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                      hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {user.isActive ? (
                      <>
                        <UserX className="w-4 h-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2
                      hover:bg-slate-100 dark:hover:bg-slate-700 text-danger-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3">
          <span className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            user.isActive
              ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
          )}>
            {user.isActive ? (
              <>
                <UserCheck className="w-3 h-3" />
                Active
              </>
            ) : (
              <>
                <UserX className="w-3 h-3" />
                Inactive
              </>
            )}
          </span>
        </div>

        {/* Contact Info */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Mail className="w-4 h-4" />
            <span>{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Phone className="w-4 h-4" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Page Component
export function ManageUsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const toast = useToast();

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleSave = async (formData: UserFormData) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString(),
      };
      setUsers([...users, newUser]);
    }

    setIsLoading(false);
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast.success('Deleted', `${userToDelete.name} has been removed`);
      setUserToDelete(null);
    }
  };

  const handleToggleActive = (user: User) => {
    setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    toast.success(
      user.isActive ? 'Deactivated' : 'Activated',
      `${user.name} has been ${user.isActive ? 'deactivated' : 'activated'}`
    );
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg
              bg-white dark:bg-slate-800 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

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

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <UserCard
                user={user}
                onEdit={() => { setEditingUser(user); setIsModalOpen(true); }}
                onDelete={() => handleDelete(user)}
                onToggleActive={() => handleToggleActive(user)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        user={editingUser}
        onSave={handleSave}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${userToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Page>
  );
}