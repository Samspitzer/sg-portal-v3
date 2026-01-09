import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Building2,
  Briefcase,
  Edit,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, ConfirmModal } from '@/components/common';
import { useDepartmentsStore, type Department, type Position } from '@/contexts';
import { useToast } from '@/contexts';
import { useDocumentTitle } from '@/hooks';

export function ManageDepartmentsPage() {
  const { departments, addDepartment, updateDepartment, deleteDepartment, addPosition, updatePosition, deletePosition } = useDepartmentsStore();
  const toast = useToast();
  useDocumentTitle('Departments');

  // Department modal state
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [editingDeptName, setEditingDeptName] = useState(false);
  const [deptNameValue, setDeptNameValue] = useState('');

  // Position editing state
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [positionNameValue, setPositionNameValue] = useState('');
  const [showAddPositionInput, setShowAddPositionInput] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'department' | 'position'; id: string; name: string } | null>(null);

  // Get current department from store
  const currentDept = selectedDeptId ? departments.find(d => d.id === selectedDeptId) : null;

  // Open department detail modal
  const openDeptModal = (dept: Department) => {
    setSelectedDeptId(dept.id);
    setEditingDeptName(false);
    setEditingPositionId(null);
    setShowAddPositionInput(false);
  };

  const closeDeptModal = () => {
    setSelectedDeptId(null);
    setEditingDeptName(false);
    setEditingPositionId(null);
    setShowAddPositionInput(false);
    setNewPositionName('');
  };

  // Department CRUD
  const handleAddDepartment = () => {
    if (!deptNameValue.trim()) {
      toast.error('Error', 'Department name is required');
      return;
    }
    addDepartment(deptNameValue.trim());
    toast.success('Department Added', `${deptNameValue} has been created`);
    setDeptNameValue('');
    setShowAddDeptModal(false);
  };

  const startEditDeptName = () => {
    if (currentDept) {
      setDeptNameValue(currentDept.name);
      setEditingDeptName(true);
    }
  };

  const saveDeptName = () => {
    if (!currentDept || !deptNameValue.trim()) {
      toast.error('Error', 'Department name is required');
      return;
    }
    updateDepartment(currentDept.id, deptNameValue.trim());
    toast.success('Updated', 'Department name updated');
    setEditingDeptName(false);
    setDeptNameValue('');
  };

  const cancelEditDeptName = () => {
    setEditingDeptName(false);
    setDeptNameValue('');
  };

  // Position CRUD
  const handleAddPosition = () => {
    if (!currentDept || !newPositionName.trim()) {
      toast.error('Error', 'Position name is required');
      return;
    }
    addPosition(currentDept.id, newPositionName.trim());
    toast.success('Position Added', `${newPositionName} has been added`);
    setNewPositionName('');
    setShowAddPositionInput(false);
  };

  const startEditPosition = (position: Position) => {
    setEditingPositionId(position.id);
    setPositionNameValue(position.name);
  };

  const savePositionName = () => {
    if (!editingPositionId || !positionNameValue.trim()) {
      toast.error('Error', 'Position name is required');
      return;
    }
    updatePosition(editingPositionId, positionNameValue.trim());
    toast.success('Updated', 'Position name updated');
    setEditingPositionId(null);
    setPositionNameValue('');
  };

  const cancelEditPosition = () => {
    setEditingPositionId(null);
    setPositionNameValue('');
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'department') {
      deleteDepartment(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} department removed`);
      closeDeptModal();
    } else {
      deletePosition(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} position removed`);
    }
    setDeleteTarget(null);
  };

  return (
    <Page
      title="Manage Departments"
      description="Organize your company structure with departments and positions."
      actions={
        <Button variant="primary" onClick={() => { setDeptNameValue(''); setShowAddDeptModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      }
    >
      {departments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
              No departments yet
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Get started by creating your first department
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => { setDeptNameValue(''); setShowAddDeptModal(true); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {departments.map((dept, index) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card
              hover
              className="cursor-pointer h-full"
              onClick={() => openDeptModal(dept)}
              >
  <CardContent className="p-4 h-full">
    <div className="flex flex-col items-center text-center h-full justify-center min-h-[120px]">
                    <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-3">
                      <Building2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {dept.positions.length} position{dept.positions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Add Department Tile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: departments.length * 0.03 }}
          >
            <Card
              hover
              className="cursor-pointer h-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500"
              onClick={() => { setDeptNameValue(''); setShowAddDeptModal(true); }}
            >
              <CardContent className="p-4 h-full">
                <div className="flex flex-col items-center text-center h-full justify-center min-h-[120px]">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Plus className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="font-medium text-slate-500 dark:text-slate-400 text-sm">
                    Add Department
                  </h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Department Detail Modal */}
      <Modal
        isOpen={!!selectedDeptId}
        onClose={closeDeptModal}
        title={editingDeptName ? 'Edit Department' : (currentDept?.name || '')}
        size="md"
        hasUnsavedChanges={editingDeptName || editingPositionId !== null || showAddPositionInput}
        onSaveChanges={() => {
          if (editingDeptName) {
            saveDeptName();
          } else if (editingPositionId) {
            savePositionName();
          } else if (showAddPositionInput) {
            handleAddPosition();
          }
        }}
        onDiscardChanges={() => {
          setEditingDeptName(false);
          setEditingPositionId(null);
          setShowAddPositionInput(false);
          setDeptNameValue('');
          setPositionNameValue('');
          setNewPositionName('');
          toast.info('Discarded', 'Changes were not saved');
        }}
      >
        {currentDept && (
          <div className="space-y-4">
            {/* Department Name Section */}
            {editingDeptName ? (
              <div className="flex items-center gap-2">
                <Input
                    id="edit-dept-name"
                    value={deptNameValue}
                    onChange={(e) => setDeptNameValue(e.target.value)}
                    placeholder="Department name"
                    autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDeptName();
                    // Don't handle Escape here - let Modal handle it for unsaved changes warning
                  }}
                />
                <Button size="sm" variant="primary" onClick={saveDeptName}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="secondary" onClick={cancelEditDeptName}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {currentDept.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {currentDept.positions.length} position{currentDept.positions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={startEditDeptName}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget({ type: 'department', id: currentDept.id, name: currentDept.name })}
                    className="text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Positions List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Positions
                </h4>
                {!showAddPositionInput && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAddPositionInput(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {/* Add Position Input */}
                {showAddPositionInput && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <Input
                      id="add-position-name"
                       value={newPositionName}
                       onChange={(e) => setNewPositionName(e.target.value)}
                       placeholder="Position name"
                       autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddPosition();
                        // Don't handle Escape here - let Modal handle it for unsaved changes warning
                      }}
                    />
                    <Button size="sm" variant="primary" onClick={handleAddPosition}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => { setShowAddPositionInput(false); setNewPositionName(''); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Position Items */}
                {currentDept.positions.length === 0 && !showAddPositionInput ? (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm">No positions yet</p>
                  </div>
                ) : (
                  currentDept.positions.map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                    >
                      <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />

                      {editingPositionId === position.id ? (
                        <>
                          <Input
                             id={`edit-position-${position.id}`}
                             value={positionNameValue}
                             onChange={(e) => setPositionNameValue(e.target.value)}
                             autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePositionName();
                              // Don't handle Escape here - let Modal handle it for unsaved changes warning
                            }}
                          />
                          <Button size="sm" variant="primary" onClick={savePositionName}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEditPosition}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-slate-700 dark:text-slate-300 text-sm">
                            {position.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditPosition(position)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget({ type: 'position', id: position.id, name: position.name })}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Department Modal */}
      <Modal
        isOpen={showAddDeptModal}
        onClose={() => { setShowAddDeptModal(false); setDeptNameValue(''); }}
        title="Add Department"
        size="sm"
        hasUnsavedChanges={deptNameValue.trim().length > 0}
        onSaveChanges={handleAddDepartment}
        onDiscardChanges={() => {
          setDeptNameValue('');
          setShowAddDeptModal(false);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAddDeptModal(false); setDeptNameValue(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddDepartment}>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </>
        }
      >
        <Input
          label="Department Name"
          value={deptNameValue}
          onChange={(e) => setDeptNameValue(e.target.value)}
          placeholder="e.g., Marketing"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddDepartment();
          }}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type === 'department' ? 'Department' : 'Position'}`}
        message={
          deleteTarget?.type === 'department'
            ? `Are you sure you want to delete "${deleteTarget?.name}"? This will also remove all positions within this department.`
            : `Are you sure you want to delete the "${deleteTarget?.name}" position?`
        }
        confirmText="Delete"
        variant="danger"
      />
    </Page>
  );
}