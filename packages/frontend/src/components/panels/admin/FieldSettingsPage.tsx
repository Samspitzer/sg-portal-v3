import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  Plus,
  Building2,
  Edit2,
  Trash2,
  Users,
  User,
  GitBranch,
  ChevronRight,
  CornerDownRight,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal, ConfirmModal, Select } from '@/components/common';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { useFieldsStore, type Department, type Position } from '@/contexts';
import { useToast } from '@/contexts';
import { useDocumentTitle } from '@/hooks';

// Panel Section Header
function PanelSectionHeader({ title, icon, description }: { title: string; icon: React.ReactNode; description?: string }) {
  return (
    <div className="flex items-center gap-3 py-4 mb-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
    </div>
  );
}

// Compact position row with hierarchy indicator
function PositionRow({
  position,
  reportsToName,
  depth,
  onEdit,
  onDelete,
}: {
  position: Position;
  reportsToName: string | null;
  depth: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 group',
        depth > 0 && 'ml-4'
      )}
    >
      {depth > 0 && (
        <CornerDownRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
      )}
      <span className="text-sm text-slate-900 dark:text-white font-medium flex-1 truncate">
        {position.name}
      </span>
      {reportsToName && (
        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block truncate max-w-[100px]">
          → {reportsToName}
        </span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <Edit2 className="w-3 h-3 text-slate-400" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3 text-slate-400 hover:text-danger-500" />
        </button>
      </div>
    </div>
  );
}

// Department card with hierarchy tree
function DepartmentCard({
  department,
  parentDeptName,
  onEditDept,
  onDeleteDept,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
}: {
  department: Department;
  parentDeptName: string | null;
  onEditDept: () => void;
  onDeleteDept: () => void;
  onAddPosition: () => void;
  onEditPosition: (position: Position) => void;
  onDeletePosition: (position: Position) => void;
}) {
  // Build hierarchy tree
  const positionTree = useMemo(() => {
    const buildTree = (parentId: string | null, depth: number): { position: Position; depth: number }[] => {
      const children = department.positions
        .filter(p => p.reportsToPositionId === parentId)
        .sort((a, b) => a.order - b.order);
      
      const result: { position: Position; depth: number }[] = [];
      for (const child of children) {
        result.push({ position: child, depth });
        result.push(...buildTree(child.id, depth + 1));
      }
      return result;
    };
    
    return buildTree(null, 0);
  }, [department.positions]);

  const getReportsToName = (position: Position): string | null => {
    if (!position.reportsToPositionId) return null;
    const parent = department.positions.find(p => p.id === position.reportsToPositionId);
    return parent?.name || null;
  };

  return (
    <Card className="h-full">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                {department.name}
              </h3>
              {parentDeptName && (
                <p className="text-xs text-slate-400 truncate">→ {parentDeptName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={onEditDept}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              title="Edit department"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={onDeleteDept}
              className="p-1.5 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
              title="Delete department"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-danger-500" />
            </button>
          </div>
        </div>

        {/* Positions */}
        <div className="p-2 max-h-[200px] overflow-y-auto">
          {positionTree.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No positions</p>
          ) : (
            <div className="space-y-0.5">
              {positionTree.map(({ position, depth }) => (
                <PositionRow
                  key={position.id}
                  position={position}
                  reportsToName={getReportsToName(position)}
                  depth={depth}
                  onEdit={() => onEditPosition(position)}
                  onDelete={() => onDeletePosition(position)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add Position */}
        <div className="px-2 pb-2">
          <button
            onClick={onAddPosition}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded border border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Position
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FieldSettingsPage() {
  const {
    departments,
    contactRoles,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addPosition,
    updatePosition,
    deletePosition,
    addContactRole,
    updateContactRole,
    deleteContactRole,
    getDepartmentsByParent,
    getParentDepartment,
  } = useFieldsStore();
  const toast = useToast();
  useDocumentTitle('Field Settings');

  // Department modal state
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptParentId, setDeptParentId] = useState<string | null>(null);

  // Position modal state
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionDeptId, setPositionDeptId] = useState<string | null>(null);
  const [positionName, setPositionName] = useState('');
  const [positionReportsTo, setPositionReportsTo] = useState<string | null>(null);

  // Contact role state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);
  const [roleName, setRoleName] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'department' | 'position' | 'role';
    id: string;
    name: string;
  } | null>(null);

  // Build department hierarchy
  const topLevelDepts = useMemo(() => getDepartmentsByParent(null), [departments]);

  // Get parent options for department selector
  const getDeptParentOptions = (excludeId?: string) => {
    const options: { value: string; label: string }[] = [];
    
    const addOptions = (depts: Department[], prefix = '') => {
      depts.forEach(dept => {
        if (excludeId && dept.id === excludeId) return;
        options.push({ value: dept.id, label: prefix + dept.name });
        const children = getDepartmentsByParent(dept.id);
        if (children.length > 0) {
          addOptions(children, prefix + '  ');
        }
      });
    };
    
    addOptions(topLevelDepts);
    return options;
  };

  // Get position options for reports-to selector (within same department)
  const getReportsToOptions = (deptId: string, excludeId?: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return [];
    
    return dept.positions
      .filter(p => p.id !== excludeId)
      .map(p => ({ value: p.id, label: p.name }));
  };

  // ============ DEPARTMENT HANDLERS ============

  const openAddDeptModal = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptParentId(null);
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptParentId(dept.parentDepartmentId);
    setShowDeptModal(true);
  };

  const handleSaveDept = () => {
    if (!deptName.trim()) {
      toast.error('Error', 'Department name is required');
      return;
    }
    
    if (editingDept) {
      updateDepartment(editingDept.id, { name: deptName.trim(), parentDepartmentId: deptParentId });
      toast.success('Updated', 'Department updated');
    } else {
      addDepartment(deptName.trim(), deptParentId);
      toast.success('Added', 'Department created');
    }
    
    setShowDeptModal(false);
  };

  // ============ POSITION HANDLERS ============

  const openAddPositionModal = (deptId: string) => {
    setEditingPosition(null);
    setPositionDeptId(deptId);
    setPositionName('');
    setPositionReportsTo(null);
    setShowPositionModal(true);
  };

  const openEditPositionModal = (position: Position) => {
    setEditingPosition(position);
    setPositionDeptId(position.departmentId);
    setPositionName(position.name);
    setPositionReportsTo(position.reportsToPositionId);
    setShowPositionModal(true);
  };

  const handleSavePosition = () => {
    if (!positionName.trim()) {
      toast.error('Error', 'Position name is required');
      return;
    }
    
    if (editingPosition) {
      updatePosition(editingPosition.id, { 
        name: positionName.trim(), 
        reportsToPositionId: positionReportsTo 
      });
      toast.success('Updated', 'Position updated');
    } else if (positionDeptId) {
      addPosition(positionDeptId, positionName.trim(), positionReportsTo);
      toast.success('Added', 'Position created');
    }
    
    setShowPositionModal(false);
  };

  // ============ CONTACT ROLE HANDLERS ============

  const openAddRoleModal = () => {
    setEditingRoleIndex(null);
    setRoleName('');
    setShowRoleModal(true);
  };

  const openEditRoleModal = (index: number) => {
    setEditingRoleIndex(index);
    setRoleName(contactRoles[index] || '');
    setShowRoleModal(true);
  };

  const handleSaveRole = () => {
    if (!roleName.trim()) {
      toast.error('Error', 'Role name is required');
      return;
    }
    
    if (editingRoleIndex !== null) {
      const oldRole = contactRoles[editingRoleIndex];
      if (oldRole) {
        updateContactRole(oldRole, roleName.trim());
        toast.success('Updated', 'Role updated');
      }
    } else {
      if (contactRoles.some(r => r.toLowerCase() === roleName.trim().toLowerCase())) {
        toast.error('Error', 'This role already exists');
        return;
      }
      addContactRole(roleName.trim());
      toast.success('Added', 'Role created');
    }
    
    setShowRoleModal(false);
  };

  // ============ DELETE HANDLER ============

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'department') {
      deleteDepartment(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} removed`);
    } else if (deleteTarget.type === 'position') {
      deletePosition(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} removed`);
    } else if (deleteTarget.type === 'role') {
      deleteContactRole(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} removed`);
    }
    
    setDeleteTarget(null);
  };

  // ============ RENDER DEPARTMENT HIERARCHY ============

  const renderDepartments = (depts: Department[], level = 0) => {
    if (depts.length === 0) return null;
    
    return (
      <div className={clsx(level > 0 && 'mt-4')}>
        {level > 0 && depts[0] && (
          <div className="flex items-center gap-2 mb-2 ml-2">
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Reports to {departments.find(d => d.id === depts[0]!.parentDepartmentId)?.name}
            </span>
          </div>
        )}
        <div className={clsx(
          'grid gap-3',
          level === 0 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ml-4'
        )}>
          {depts.map(dept => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              parentDeptName={getParentDepartment(dept.id)?.name || null}
              onEditDept={() => openEditDeptModal(dept)}
              onDeleteDept={() => setDeleteTarget({ type: 'department', id: dept.id, name: dept.name })}
              onAddPosition={() => openAddPositionModal(dept.id)}
              onEditPosition={openEditPositionModal}
              onDeletePosition={(pos) => setDeleteTarget({ type: 'position', id: pos.id, name: pos.name })}
            />
          ))}
        </div>
        
        {/* Render child departments */}
        {depts.map(dept => {
          const children = getDepartmentsByParent(dept.id);
          return children.length > 0 ? (
            <div key={`children-${dept.id}`}>
              {renderDepartments(children, level + 1)}
            </div>
          ) : null;
        })}
      </div>
    );
  };

  return (
    <Page
      title="Field Settings"
      description="Manage organizational structure and dropdown options."
    >
      <div className="space-y-8">
        {/* ============ ADMIN PANEL SECTION ============ */}
        <section>
          <PanelSectionHeader
            title="Admin Panel"
            icon={<Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            description="Organization structure and user management"
          />

          <CollapsibleSection
            title="Organizational Structure"
            icon={<GitBranch className="w-4 h-4 text-brand-500" />}
            badge={departments.length > 0 ? `${departments.length} dept${departments.length !== 1 ? 's' : ''}` : undefined}
            defaultOpen={false}
            action={
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openAddDeptModal(); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Department
              </Button>
            }
          >
            <div className="p-4">
              {departments.length === 0 ? (
                <div className="text-center py-6">
                  <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm text-slate-500">No departments yet</p>
                  <Button variant="primary" size="sm" className="mt-3" onClick={openAddDeptModal}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Department
                  </Button>
                </div>
              ) : (
                renderDepartments(topLevelDepts)
              )}
            </div>
          </CollapsibleSection>
        </section>

        {/* ============ CUSTOMERS PANEL SECTION ============ */}
        <section>
          <PanelSectionHeader
            title="Customers Panel"
            icon={<Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            description="Contact and company fields"
          />

          <CollapsibleSection
            title="Contact Roles"
            icon={<User className="w-4 h-4 text-accent-500" />}
            badge={contactRoles.length > 0 ? `${contactRoles.length}` : undefined}
            defaultOpen={false}
            action={
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openAddRoleModal(); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Role
              </Button>
            }
          >
            <div className="p-3">
              {contactRoles.length === 0 ? (
                <div className="text-center py-4">
                  <User className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm text-slate-500">No contact roles</p>
                  <Button variant="primary" size="sm" className="mt-2" onClick={openAddRoleModal}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Role
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contactRoles.map((role, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full group hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-sm text-slate-700 dark:text-slate-300">{role}</span>
                      <button
                        onClick={() => openEditRoleModal(index)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded transition-all"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'role', id: role, name: role })}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-slate-500 hover:text-danger-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        </section>
      </div>

      {/* ============ DEPARTMENT MODAL ============ */}
      <Modal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        title={editingDept ? 'Edit Department' : 'Add Department'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeptModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveDept}>
              {editingDept ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Department Name"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="e.g., Marketing"
            autoFocus
          />
          <Select
            label="Reports To (Parent Department)"
            value={deptParentId || ''}
            onChange={(e) => setDeptParentId(e.target.value || null)}
            options={getDeptParentOptions(editingDept?.id)}
            placeholder="None (Top Level)"
          />
        </div>
      </Modal>

      {/* ============ POSITION MODAL ============ */}
      <Modal
        isOpen={showPositionModal}
        onClose={() => setShowPositionModal(false)}
        title={editingPosition ? 'Edit Position' : 'Add Position'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPositionModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSavePosition}>
              {editingPosition ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Position Name"
            value={positionName}
            onChange={(e) => setPositionName(e.target.value)}
            placeholder="e.g., Sales Manager"
            autoFocus
          />
          <Select
            label="Reports To"
            value={positionReportsTo || ''}
            onChange={(e) => setPositionReportsTo(e.target.value || null)}
            options={positionDeptId ? getReportsToOptions(positionDeptId, editingPosition?.id) : []}
            placeholder="None (Department Head)"
          />
          {!positionReportsTo && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Department heads escalate to parent department.
            </p>
          )}
        </div>
      </Modal>

      {/* ============ ROLE MODAL ============ */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={editingRoleIndex !== null ? 'Edit Role' : 'Add Role'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveRole}>
              {editingRoleIndex !== null ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <Input
          label="Role Name"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          placeholder="e.g., Superintendent"
          autoFocus
        />
      </Modal>

      {/* ============ DELETE CONFIRMATION ============ */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteTarget?.type === 'department' ? 'Department' : deleteTarget?.type === 'position' ? 'Position' : 'Role'}`}
        message={
          deleteTarget?.type === 'department'
            ? `Delete "${deleteTarget?.name}" and all its positions? Child departments will also be deleted.`
            : `Delete "${deleteTarget?.name}"?`
        }
        confirmText="Delete"
        variant="danger"
      />
    </Page>
  );
}