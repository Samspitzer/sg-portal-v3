import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Check,
  Loader2,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input } from '@/components/common';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  isActive: boolean;
  createdAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  isActive: boolean;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  isActive: true,
};

// Mock data - replace with API calls later
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@sgbsny.com',
    phone: '(555) 123-4567',
    department: 'Operations',
    position: 'Manager',
    isActive: true,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@sgbsny.com',
    phone: '(555) 234-5678',
    department: 'Accounting',
    position: 'Accountant',
    isActive: true,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Mike Williams',
    email: 'mike@sgbsny.com',
    phone: '(555) 345-6789',
    department: 'Projects',
    position: 'Project Manager',
    isActive: false,
    createdAt: '2024-03-10',
  },
];

const DEPARTMENTS = [
  'Operations',
  'Accounting',
  'Projects',
  'Estimating',
  'Sales',
  'Administration',
];

const POSITIONS = [
  'Manager',
  'Supervisor',
  'Accountant',
  'Project Manager',
  'Estimator',
  'Sales Representative',
  'Administrator',
  'Assistant',
];

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
  const [formData, setFormData] = useState<UserFormData>(
    user
      ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
          department: user.department,
          position: user.position,
          isActive: user.isActive,
        }
      : initialFormData
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {user ? 'Edit User' : 'Add New User'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  required
                />
                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@sgbsny.com"
                  required
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

            {/* Account Settings */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                Account Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg
                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Position
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg
                      bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Position</option>
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={clsx(
                      'w-11 h-6 rounded-full transition-colors relative',
                      formData.isActive ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  >
                    <div
                      className={clsx(
                        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                        formData.isActive ? 'translate-x-5.5 left-0.5' : 'left-0.5'
                      )}
                      style={{ transform: formData.isActive ? 'translateX(22px)' : 'translateX(0)' }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
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

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
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
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
                {user.position} • {user.department}
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
    if (window.confirm(`Are you sure you want to delete "${user.name}"?`)) {
      setUsers(users.filter(u => u.id !== user.id));
    }
  };

  const handleToggleActive = (user: User) => {
    setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
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

      {/* Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        user={editingUser}
        onSave={handleSave}
        isLoading={isLoading}
      />
    </Page>
  );
}