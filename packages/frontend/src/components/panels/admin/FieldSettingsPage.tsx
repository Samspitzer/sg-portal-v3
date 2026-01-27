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
  AlertTriangle,
  CheckSquare,
  Handshake,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Button, Input, Modal, Select, Toggle } from '@/components/common';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TaskTypeIcon } from '@/components/common/TaskTypeIcon';
import { useFieldsStore, useUsersStore, type Department, type Position } from '@/contexts';
import { useTaskTypesStore, TASK_TYPE_ICONS, type TaskTypeConfig, type TaskTypeIconName } from '@/contexts/taskTypesStore';
import { useToast } from '@/contexts';
import { useDocumentTitle } from '@/hooks';

// Panel Section Header with gradient icon - inside card style
function PanelSectionHeader({ 
  title, 
  icon, 
  description,
  gradient = 'from-slate-600 to-slate-700',
  children
}: { 
  title: string; 
  icon: React.ReactNode; 
  description?: string;
  gradient?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className={clsx(
          'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md',
          gradient
        )}>
          <span className="text-white">{icon}</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {/* Content - subsections go here */}
      {children && (
        <div className="p-2">
          {children}
        </div>
      )}
    </div>
  );
}

// Icon Picker Component for Task Types
function IconPicker({ value, onChange }: { value: TaskTypeIconName; onChange: (icon: TaskTypeIconName) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full h-10 px-3 flex items-center gap-2 rounded-lg border',
          'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
          'hover:border-slate-300 dark:hover:border-slate-600 transition-colors'
        )}
      >
        <TaskTypeIcon icon={value} className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {TASK_TYPE_ICONS.find(i => i.value === value)?.label || value}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            <div className="grid grid-cols-5 gap-1">
              {TASK_TYPE_ICONS.map(icon => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => { onChange(icon.value); setIsOpen(false); }}
                  className={clsx(
                    'p-2 rounded-lg flex flex-col items-center gap-1 transition-colors',
                    value === icon.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  )}
                  title={icon.label}
                >
                  <TaskTypeIcon icon={icon.value} className="w-5 h-5" />
                  <span className="text-[10px] truncate w-full text-center">{icon.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Department card - compact with popup for positions
function DepartmentCard({
  department,
  parentDeptName,
  allDepartments,
  onEditDept,
  onDeleteDept,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
}: {
  department: Department;
  parentDeptName: string | null;
  allDepartments: Department[];
  onEditDept: () => void;
  onDeleteDept: () => void;
  onAddPosition: () => void;
  onEditPosition: (position: Position) => void;
  onDeletePosition: (position: Position) => void;
}) {
  const [showPositions, setShowPositions] = useState(false);
  
  // Build hierarchy tree - only same department positions for tree structure
  const positionTree = useMemo(() => {
    const buildTree = (parentId: string | null, depth: number): { position: Position; depth: number }[] => {
      const children = department.positions
        .filter(p => {
          // Only include in tree if reports to position in same department OR is a root
          if (p.reportsToPositionId === parentId) return true;
          // If reports to external dept, show at root level (depth 0)
          if (parentId === null && p.reportsToPositionId) {
            const reportsToInSameDept = department.positions.find(pos => pos.id === p.reportsToPositionId);
            return !reportsToInSameDept; // Not in same dept = show at root
          }
          return false;
        })
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

  const getReportsToInfo = (position: Position): { name: string | null; externalDept: string | null } => {
    if (!position.reportsToPositionId) return { name: null, externalDept: null };
    
    // Check same department first
    const sameDeptParent = department.positions.find(p => p.id === position.reportsToPositionId);
    if (sameDeptParent) {
      return { name: sameDeptParent.name, externalDept: null };
    }
    
    // Check other departments
    for (const otherDept of allDepartments) {
      if (otherDept.id === department.id) continue;
      const externalParent = otherDept.positions.find(p => p.id === position.reportsToPositionId);
      if (externalParent) {
        return { name: externalParent.name, externalDept: otherDept.name };
      }
    }
    
    return { name: null, externalDept: null };
  };

  return (
    <>
      {/* Compact Card */}
      <div
        onClick={() => setShowPositions(true)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-slate-900 dark:text-white text-sm truncate">
                {department.name}
              </h3>
              {parentDeptName && (
                <p className="text-[10px] text-brand-500 truncate">→ {parentDeptName}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
            {department.positions.length}
          </span>
        </div>
      </div>

      {/* Positions Popup Modal */}
      <Modal
        isOpen={showPositions}
        onClose={() => setShowPositions(false)}
        title={department.name}
        size="md"
      >
        <div className="space-y-3">
          {/* Department Actions */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              {parentDeptName ? (
                <span>Reports to: <span className="text-brand-600">{parentDeptName}</span></span>
              ) : (
                <span>Top-level department</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEditDept(); setShowPositions(false); }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Edit department"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteDept(); setShowPositions(false); }}
                className="p-1.5 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
                title="Delete department"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-danger-500" />
              </button>
            </div>
          </div>

          {/* Positions List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Positions ({department.positions.length})
              </h4>
              <button
                onClick={onAddPosition}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            
            {positionTree.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No positions in this department</p>
            ) : (
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                {positionTree.map(({ position, depth }) => {
                  const reportsInfo = getReportsToInfo(position);
                  return (
                    <div
                      key={position.id}
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
                      {reportsInfo.name && (
                        <span className={clsx(
                          'text-xs truncate max-w-[120px]',
                          reportsInfo.externalDept 
                            ? 'text-brand-600 dark:text-brand-400' 
                            : 'text-slate-400 dark:text-slate-500'
                        )}>
                          → {reportsInfo.name}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => onEditPosition(position)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                        </button>
                        <button
                          onClick={() => onDeletePosition(position)}
                          className="p-1 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-slate-400 hover:text-danger-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
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
  const { users } = useUsersStore();
  const { taskTypes, createTaskType, updateTaskType, deleteTaskType } = useTaskTypesStore();
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
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);

  // Contact role state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);
  const [roleName, setRoleName] = useState('');

  // Task type state
  const [showTaskTypeModal, setShowTaskTypeModal] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<TaskTypeConfig | null>(null);
  const [taskTypeLabel, setTaskTypeLabel] = useState('');
  const [taskTypeValue, setTaskTypeValue] = useState('');
  const [taskTypeIcon, setTaskTypeIcon] = useState<TaskTypeIconName>('check-square');
  const [taskTypeIsActive, setTaskTypeIsActive] = useState(true);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'department' | 'position' | 'role' | 'taskType';
    id: string;
    name: string;
  } | null>(null);
  
  // Helper to check position dependencies
  const getPositionDependencies = (positionId: string) => {
    // Users assigned to this position
    const assignedUsers = users.filter(u => u.positionId === positionId);
    
    // Users who have someone in this position as their ADDITIONAL supervisor (supervisorId override)
    const usersWithThisAsSupervisor = users.filter(u => {
      // Get users in this position
      const usersInPosition = users.filter(usr => usr.positionId === positionId && usr.isActive);
      // Check if any user has one of them as their supervisorId
      return usersInPosition.some(sup => (u as any).supervisorId === sup.id);
    });
    
    // Positions that report to this position
    const allPositions = departments.flatMap(d => d.positions);
    const reportingPositions = allPositions.filter(p => p.reportsToPositionId === positionId);
    
    // Get the position being deleted to find what it reports to
    const positionBeingDeleted = allPositions.find(p => p.id === positionId);
    const willReportTo = positionBeingDeleted?.reportsToPositionId 
      ? allPositions.find(p => p.id === positionBeingDeleted.reportsToPositionId)
      : null;
    
    // Check if this is a department head
    const dept = departments.find(d => d.id === positionBeingDeleted?.departmentId);
    const sameDeptPositionIds = dept?.positions.map(p => p.id) || [];
    const reportsToSameDept = positionBeingDeleted?.reportsToPositionId 
      ? sameDeptPositionIds.includes(positionBeingDeleted.reportsToPositionId)
      : false;
    const isDepartmentHead = !reportsToSameDept;
    
    // Get executive supervisor info (if dept head reports to exec)
    const execSupervisor = isDepartmentHead && positionBeingDeleted?.reportsToPositionId
      ? allPositions.find(p => p.id === positionBeingDeleted.reportsToPositionId)
      : null;
    
    return {
      assignedUsers,
      usersWithThisAsSupervisor,
      reportingPositions,
      willReportTo,
      isDepartmentHead,
      execSupervisor,
      position: positionBeingDeleted,
      hasAssignedUsers: assignedUsers.length > 0,
      hasUsersWithThisAsSupervisor: usersWithThisAsSupervisor.length > 0,
      hasReportingPositions: reportingPositions.length > 0,
      hasDependencies: assignedUsers.length > 0 || usersWithThisAsSupervisor.length > 0,
    };
  };
  
  // Helper to check department dependencies  
  const getDepartmentDependencies = (departmentId: string) => {
    // Get this department and all child departments recursively
    const getAllChildDeptIds = (deptId: string): string[] => {
      const children = getDepartmentsByParent(deptId);
      return [deptId, ...children.flatMap(c => getAllChildDeptIds(c.id))];
    };
    const allAffectedDeptIds = getAllChildDeptIds(departmentId);
    
    // Users assigned to this department OR any child department
    const assignedUsers = users.filter(u => allAffectedDeptIds.includes(u.departmentId));
    
    // All positions in affected departments
    const affectedPositions = departments
      .filter(d => allAffectedDeptIds.includes(d.id))
      .flatMap(d => d.positions);
    const affectedPositionIds = affectedPositions.map(p => p.id);
    
    // Positions OUTSIDE this department that report to positions INSIDE this department
    const allPositions = departments.flatMap(d => d.positions);
    const externalReportingPositions = allPositions.filter(p => 
      !affectedPositionIds.includes(p.id) && 
      p.reportsToPositionId && 
      affectedPositionIds.includes(p.reportsToPositionId)
    );
    
    // Users outside this department who have supervisorId pointing to users in affected positions
    const usersInAffectedPositions = users.filter(u => affectedPositionIds.includes(u.positionId));
    const externalUsersWithSupervisorHere = users.filter(u => 
      !allAffectedDeptIds.includes(u.departmentId) &&
      usersInAffectedPositions.some(sup => (u as any).supervisorId === sup.id)
    );
    
    // Child departments
    const childDepts = getDepartmentsByParent(departmentId);
    
    // Get all positions in this department (direct)
    const dept = departments.find(d => d.id === departmentId);
    const positions = dept?.positions || [];
    
    return {
      assignedUsers,
      childDepts,
      positions,
      affectedPositions,
      externalReportingPositions,
      externalUsersWithSupervisorHere,
      hasAssignedUsers: assignedUsers.length > 0,
      hasChildDepts: childDepts.length > 0,
      hasPositions: positions.length > 0,
      hasExternalReporting: externalReportingPositions.length > 0 || externalUsersWithSupervisorHere.length > 0,
      hasDependencies: assignedUsers.length > 0 || externalReportingPositions.length > 0 || externalUsersWithSupervisorHere.length > 0,
    };
  };

  // Build department hierarchy
  const topLevelDepts = useMemo(() => getDepartmentsByParent(null), [departments]);

  // Sorted task types
  const sortedTaskTypes = useMemo(() => 
    [...taskTypes].sort((a, b) => a.sortOrder - b.sortOrder), 
    [taskTypes]
  );

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
    setIsDepartmentHead(false);
    setShowPositionModal(true);
  };

  const openEditPositionModal = (position: Position) => {
    // Check if this is a department head (reports to no one in same dept OR reports to exec)
    const dept = departments.find(d => d.id === position.departmentId);
    const sameDeptPositionIds = dept?.positions.map(p => p.id) || [];
    const reportsToSameDept = position.reportsToPositionId 
      ? sameDeptPositionIds.includes(position.reportsToPositionId)
      : false;
    
    setEditingPosition(position);
    setPositionDeptId(position.departmentId);
    setPositionName(position.name);
    setIsDepartmentHead(!reportsToSameDept);
    setPositionReportsTo(position.reportsToPositionId);
    setShowPositionModal(true);
  };

  const handleSavePosition = () => {
    if (!positionName.trim()) {
      toast.error('Error', 'Position name is required');
      return;
    }
    
    // If not a department head, reportsTo must be set (same-dept)
    // If department head, reportsTo can be null or exec position
    const finalReportsTo = isDepartmentHead ? positionReportsTo : positionReportsTo;
    
    if (editingPosition) {
      updatePosition(editingPosition.id, { 
        name: positionName.trim(), 
        reportsToPositionId: finalReportsTo 
      });
      toast.success('Updated', 'Position updated');
    } else if (positionDeptId) {
      addPosition(positionDeptId, positionName.trim(), finalReportsTo);
      toast.success('Added', 'Position created');
    }
    
    setShowPositionModal(false);
  };
  
  // Handle department head checkbox toggle
  const handleDepartmentHeadToggle = (checked: boolean) => {
    setIsDepartmentHead(checked);
    if (checked) {
      // Clear same-dept reportsTo when becoming dept head
      setPositionReportsTo(null);
    } else {
      // Clear exec reportsTo when no longer dept head
      setPositionReportsTo(null);
    }
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

  // ============ TASK TYPE HANDLERS ============

  const openAddTaskTypeModal = () => {
    setEditingTaskType(null);
    setTaskTypeLabel('');
    setTaskTypeValue('');
    setTaskTypeIcon('check-square');
    setTaskTypeIsActive(true);
    setShowTaskTypeModal(true);
  };

  const openEditTaskTypeModal = (taskType: TaskTypeConfig) => {
    setEditingTaskType(taskType);
    setTaskTypeLabel(taskType.label);
    setTaskTypeValue(taskType.value);
    setTaskTypeIcon(taskType.icon);
    setTaskTypeIsActive(taskType.isActive);
    setShowTaskTypeModal(true);
  };

  const handleSaveTaskType = async () => {
    if (!taskTypeLabel.trim()) {
      toast.error('Error', 'Label is required');
      return;
    }
    
    const finalValue = taskTypeValue.trim() || taskTypeLabel.toLowerCase().replace(/\s+/g, '_');
    
    if (editingTaskType) {
      await updateTaskType(editingTaskType.id, {
        label: taskTypeLabel.trim(),
        value: finalValue,
        icon: taskTypeIcon,
        isActive: taskTypeIsActive,
      });
      toast.success('Updated', 'Task type updated');
    } else {
      await createTaskType({
        label: taskTypeLabel.trim(),
        value: finalValue,
        icon: taskTypeIcon,
        isActive: taskTypeIsActive,
      });
      toast.success('Added', 'Task type created');
    }
    
    setShowTaskTypeModal(false);
  };

  const handleToggleTaskTypeActive = async (taskType: TaskTypeConfig) => {
    await updateTaskType(taskType.id, { isActive: !taskType.isActive });
    toast.info(
      taskType.isActive ? 'Deactivated' : 'Activated',
      `${taskType.label} is now ${taskType.isActive ? 'inactive' : 'active'}`
    );
  };

  // ============ DELETE HANDLER ============

  const handleConfirmDelete = (options?: { newDeptHeadId?: string; inheritExecSupervisor?: boolean }) => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'department') {
      deleteDepartment(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} removed`);
    } else if (deleteTarget.type === 'position') {
      // If we're promoting a new dept head, update them first
      if (options?.newDeptHeadId) {
        const deps = getPositionDependencies(deleteTarget.id);
        const execSupervisorId = options.inheritExecSupervisor ? deps.execSupervisor?.id : null;
        
        // Make the new position a department head (reports to exec or null)
        updatePosition(options.newDeptHeadId, { reportsToPositionId: execSupervisorId || null });
        
        // Update other reporting positions to report to the new dept head
        deps.reportingPositions
          .filter(p => p.id !== options.newDeptHeadId)
          .forEach(p => {
            updatePosition(p.id, { reportsToPositionId: options.newDeptHeadId! });
          });
      }
      
      deletePosition(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} removed`);
    } else if (deleteTarget.type === 'role') {
      deleteContactRole(deleteTarget.id);
      toast.success('Deleted', `${deleteTarget.name} removed`);
    } else if (deleteTarget.type === 'taskType') {
      deleteTaskType(deleteTarget.id);
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
          'grid gap-2',
          level === 0 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ml-4'
        )}>
          {depts.map(dept => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              parentDeptName={getParentDepartment(dept.id)?.name || null}
              allDepartments={departments}
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
      <div className="space-y-6">
        {/* ============ ADMIN PANEL SECTION ============ */}
        <PanelSectionHeader
          title="Admin Panel"
          icon={<Users className="w-5 h-5" />}
          description="Organization structure and user management"
          gradient="from-blue-500 to-blue-600"
        >
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
        </PanelSectionHeader>

        {/* ============ TASKS PANEL SECTION ============ */}
        <PanelSectionHeader
          title="Tasks Panel"
          icon={<CheckSquare className="w-5 h-5" />}
          description="Task types and categories"
          gradient="from-cyan-500 to-cyan-600"
        >
          <CollapsibleSection
            title="Task Types"
            icon={<CheckSquare className="w-4 h-4 text-blue-500" />}
            badge={taskTypes.length > 0 ? `${taskTypes.length}` : undefined}
            defaultOpen={false}
            action={
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openAddTaskTypeModal(); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Type
              </Button>
            }
          >
            <div className="p-3">
              {sortedTaskTypes.length === 0 ? (
                <div className="text-center py-4">
                  <CheckSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-sm text-slate-500">No task types configured</p>
                  <Button variant="primary" size="sm" className="mt-2" onClick={openAddTaskTypeModal}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Task Type
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sortedTaskTypes.map(taskType => (
                    <div
                      key={taskType.id}
                      className={clsx(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full group transition-colors',
                        taskType.isActive
                          ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                          : 'bg-slate-50 dark:bg-slate-800/50 opacity-50'
                      )}
                    >
                      <TaskTypeIcon icon={taskType.icon} className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{taskType.label}</span>
                      <button
                        onClick={() => handleToggleTaskTypeActive(taskType)}
                        className={clsx(
                          'px-1.5 py-0.5 text-[10px] font-medium rounded-full transition-colors',
                          taskType.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        )}
                      >
                        {taskType.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => openEditTaskTypeModal(taskType)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-300 dark:hover:bg-slate-600 rounded transition-all"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'taskType', id: taskType.id, name: taskType.label })}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-slate-500 hover:text-danger-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Tips */}
              {sortedTaskTypes.length > 0 && (
                <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <strong>Tips:</strong> Inactive types won't appear in task forms but existing tasks will keep their type.
                  </p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </PanelSectionHeader>

        {/* ============ CUSTOMERS PANEL SECTION ============ */}
        <PanelSectionHeader
          title="Customers Panel"
          icon={<Building2 className="w-5 h-5" />}
          description="Contact and company fields"
          gradient="from-emerald-500 to-emerald-600"
        >
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
        </PanelSectionHeader>

        {/* ============ SALES PANEL SECTION ============ */}
        <PanelSectionHeader
          title="Sales Panel"
          icon={<Handshake className="w-5 h-5" />}
          description="Pipeline stages and deal settings"
          gradient="from-teal-500 to-teal-600"
        >
          <CollapsibleSection
            title="Pipeline Stages"
            icon={<TrendingUp className="w-4 h-4 text-teal-500" />}
            badge="Coming Soon"
            defaultOpen={false}
          >
            <div className="p-4">
              <div className="text-center py-6">
                <TrendingUp className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm text-slate-500">Pipeline stages configuration coming soon</p>
                <p className="text-xs text-slate-400 mt-1">Define stages like Lead, Qualified, Proposal, Negotiation, Closed</p>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Deal Sources"
            icon={<Target className="w-4 h-4 text-teal-500" />}
            badge="Coming Soon"
            defaultOpen={false}
          >
            <div className="p-4">
              <div className="text-center py-6">
                <Target className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm text-slate-500">Deal source options coming soon</p>
                <p className="text-xs text-slate-400 mt-1">Track where deals come from: Referral, Website, Cold Call, etc.</p>
              </div>
            </div>
          </CollapsibleSection>
        </PanelSectionHeader>
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
          
          {/* Department Head Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Department Head
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Top position in this department
              </p>
            </div>
            <Toggle
              checked={isDepartmentHead}
              onChange={handleDepartmentHeadToggle}
            />
          </div>
          
          {/* Reports To - Different options based on department head status */}
          {isDepartmentHead ? (
            // Department Head: can optionally report to Executive
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reports To (Executive)
              </label>
              {(() => {
                // Find Executive department
                const execDept = departments.find(d => 
                  d.name.toLowerCase().includes('executive') || 
                  d.name.toLowerCase().includes('exec') ||
                  d.name.toLowerCase() === 'c-suite' ||
                  d.name.toLowerCase() === 'leadership'
                );
                
                // Don't show if we're in the exec department
                if (!execDept || execDept.id === positionDeptId) {
                  return (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No executive department found
                    </p>
                  );
                }
                
                const execOptions = execDept.positions.filter(p => p.id !== editingPosition?.id);
                
                if (execOptions.length === 0) {
                  return (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No positions in {execDept.name}
                    </p>
                  );
                }
                
                return (
                  <Select
                    value={positionReportsTo || ''}
                    onChange={(e) => setPositionReportsTo(e.target.value || null)}
                    options={execOptions.map(p => ({ value: p.id, label: p.name }))}
                    placeholder="None (no executive supervisor)"
                  />
                );
              })()}
            </div>
          ) : (
            // Not Department Head: must report to someone in same department
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reports To
              </label>
              {(() => {
                const dept = departments.find(d => d.id === positionDeptId);
                const sameDeptOptions = dept?.positions.filter(p => p.id !== editingPosition?.id) || [];
                
                if (sameDeptOptions.length === 0) {
                  return (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No other positions in this department
                    </p>
                  );
                }
                
                return (
                  <Select
                    value={positionReportsTo || ''}
                    onChange={(e) => setPositionReportsTo(e.target.value || null)}
                    options={sameDeptOptions.map(p => ({ value: p.id, label: p.name }))}
                    placeholder="Select supervisor..."
                  />
                );
              })()}
              {!positionReportsTo && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Please select a supervisor or mark as Department Head
                </p>
              )}
            </div>
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

      {/* ============ TASK TYPE MODAL ============ */}
      <Modal
        isOpen={showTaskTypeModal}
        onClose={() => setShowTaskTypeModal(false)}
        title={editingTaskType ? 'Edit Task Type' : 'Add Task Type'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTaskTypeModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveTaskType}>
              {editingTaskType ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Label"
            value={taskTypeLabel}
            onChange={(e) => setTaskTypeLabel(e.target.value)}
            placeholder="e.g., Phone Call"
            autoFocus
          />

          <div>
            <Input
              label="Value (system name)"
              value={taskTypeValue}
              onChange={(e) => setTaskTypeValue(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="e.g., phone_call"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Used internally. Auto-generated from label if empty.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Icon
            </label>
            <IconPicker value={taskTypeIcon} onChange={setTaskTypeIcon} />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Active
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visible in task forms
              </p>
            </div>
            <Toggle
              checked={taskTypeIsActive}
              onChange={setTaskTypeIsActive}
            />
          </div>
        </div>
      </Modal>

      {/* ============ DELETE CONFIRMATION ============ */}
      {deleteTarget && deleteTarget.type !== 'taskType' && (
        <DeleteConfirmationModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          getPositionDependencies={getPositionDependencies}
          getDepartmentDependencies={getDepartmentDependencies}
        />
      )}

      {/* Simple delete confirmation for task types */}
      {deleteTarget && deleteTarget.type === 'taskType' && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          title="Delete Task Type"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleConfirmDelete()}>Delete</Button>
            </>
          }
        >
          <p className="text-slate-600 dark:text-slate-400">
            Delete the task type "{deleteTarget.name}"? Tasks with this type will keep their type but it won't be selectable for new tasks.
          </p>
        </Modal>
      )}
    </Page>
  );
}

// Delete Confirmation Modal with dependency warnings
function DeleteConfirmationModal({
  target,
  onClose,
  onConfirm,
  getPositionDependencies,
  getDepartmentDependencies,
}: {
  target: { type: 'department' | 'position' | 'role' | 'taskType'; id: string; name: string };
  onClose: () => void;
  onConfirm: (options?: { newDeptHeadId?: string; inheritExecSupervisor?: boolean }) => void;
  getPositionDependencies: (id: string) => {
    assignedUsers: any[];
    usersWithThisAsSupervisor: any[];
    reportingPositions: any[];
    willReportTo: any | null;
    isDepartmentHead: boolean;
    execSupervisor: any | null;
    position: any | null;
    hasAssignedUsers: boolean;
    hasUsersWithThisAsSupervisor: boolean;
    hasReportingPositions: boolean;
    hasDependencies: boolean;
  };
  getDepartmentDependencies: (id: string) => {
    assignedUsers: any[];
    childDepts: any[];
    positions: any[];
    affectedPositions: any[];
    externalReportingPositions: any[];
    externalUsersWithSupervisorHere: any[];
    hasAssignedUsers: boolean;
    hasChildDepts: boolean;
    hasPositions: boolean;
    hasExternalReporting: boolean;
    hasDependencies: boolean;
  };
}) {
  const [newDeptHeadId, setNewDeptHeadId] = useState<string>('');
  const [inheritExecSupervisor, setInheritExecSupervisor] = useState(true);
  
  const positionDeps = target.type === 'position' ? getPositionDependencies(target.id) : null;
  const deptDeps = target.type === 'department' ? getDepartmentDependencies(target.id) : null;
  
  // Check if this is a dept head with reporting positions (needs succession)
  const needsSuccession = positionDeps?.isDepartmentHead && positionDeps?.hasReportingPositions;
  
  // Critical = cannot delete (users assigned or external dependencies)
  const hasCriticalDependencies = 
    (positionDeps?.hasAssignedUsers) || 
    (positionDeps?.hasUsersWithThisAsSupervisor) ||
    (deptDeps?.hasDependencies);
  
  // Warnings = can delete but will affect other things (non-dept-head with reporting positions)
  const hasWarnings = 
    (positionDeps?.hasReportingPositions && !positionDeps?.isDepartmentHead && !hasCriticalDependencies);
  
  // For dept head deletion, must select successor
  const canDeleteDeptHead = needsSuccession ? !!newDeptHeadId : true;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Delete ${target.type === 'department' ? 'Department' : target.type === 'position' ? 'Position' : 'Role'}`}
    >
      <div className="space-y-4">
        {/* Critical dependencies for Position */}
        {positionDeps?.hasAssignedUsers && (
          <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-danger-800 dark:text-danger-200">
                  Users are assigned to this position
                </p>
                <p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
                  {positionDeps.assignedUsers.length} user{positionDeps.assignedUsers.length !== 1 ? 's' : ''}: 
                  <span className="font-medium"> {positionDeps.assignedUsers.map((u: any) => u.name).join(', ')}</span>
                </p>
                <p className="text-sm text-danger-600 dark:text-danger-400 mt-2">
                  Reassign these users to a different position before deleting.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Users with this position holder as additional supervisor */}
        {positionDeps?.hasUsersWithThisAsSupervisor && (
          <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-danger-800 dark:text-danger-200">
                  Users have supervisors in this position
                </p>
                <p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
                  {positionDeps.usersWithThisAsSupervisor.length} user{positionDeps.usersWithThisAsSupervisor.length !== 1 ? 's have' : ' has'} an additional supervisor assigned from this position.
                </p>
                <p className="text-sm text-danger-600 dark:text-danger-400 mt-2">
                  Update their supervisor assignments before deleting.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Department Head Succession - only show if no critical deps */}
        {needsSuccession && !hasCriticalDependencies && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  This is a Department Head
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {positionDeps!.reportingPositions.length} position{positionDeps!.reportingPositions.length !== 1 ? 's' : ''} report to this position:
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 ml-4 list-disc">
                  {positionDeps!.reportingPositions.map((p: any) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="space-y-3 mt-4">
              <Select
                label="Select the new Department Head:"
                value={newDeptHeadId}
                onChange={(e) => setNewDeptHeadId(e.target.value)}
                options={positionDeps!.reportingPositions.map((p: any) => ({ value: p.id, label: p.name }))}
                placeholder="Select a position..."
              />
              
              {positionDeps?.execSupervisor && newDeptHeadId && (
                <div className="flex items-center justify-between p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    New Department Head reports to <strong>{positionDeps.execSupervisor.name}</strong>
                  </span>
                  <Toggle
                    checked={inheritExecSupervisor}
                    onChange={setInheritExecSupervisor}
                    size="sm"
                  />
                </div>
              )}
              
              {newDeptHeadId && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  The other positions will report to the new Department Head.
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Critical dependencies for Department */}
        {deptDeps?.hasAssignedUsers && (
          <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-danger-800 dark:text-danger-200">
                  Users are assigned to this department
                </p>
                <p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
                  {deptDeps.assignedUsers.length} user{deptDeps.assignedUsers.length !== 1 ? 's' : ''}: 
                  <span className="font-medium"> {deptDeps.assignedUsers.slice(0, 5).map((u: any) => u.name).join(', ')}</span>
                  {deptDeps.assignedUsers.length > 5 && ` and ${deptDeps.assignedUsers.length - 5} more`}
                </p>
                <p className="text-sm text-danger-600 dark:text-danger-400 mt-2">
                  Reassign all users before deleting this department.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {deptDeps?.hasExternalReporting && (
          <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-danger-800 dark:text-danger-200">
                  External dependencies exist
                </p>
                <ul className="text-sm text-danger-700 dark:text-danger-300 mt-1 space-y-1">
                  {deptDeps.externalReportingPositions.length > 0 && (
                    <li>• {deptDeps.externalReportingPositions.length} position{deptDeps.externalReportingPositions.length !== 1 ? 's' : ''} from other departments report to positions here</li>
                  )}
                  {deptDeps.externalUsersWithSupervisorHere.length > 0 && (
                    <li>• {deptDeps.externalUsersWithSupervisorHere.length} user{deptDeps.externalUsersWithSupervisorHere.length !== 1 ? 's' : ''} from other departments have supervisors here</li>
                  )}
                </ul>
                <p className="text-sm text-danger-600 dark:text-danger-400 mt-2">
                  Update these reporting structures before deleting.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Info about what will be deleted (for department) */}
        {deptDeps && !hasCriticalDependencies && (deptDeps.hasChildDepts || deptDeps.hasPositions) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This will delete:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-400 mt-1 space-y-0.5">
              {deptDeps.hasPositions && (
                <li>• {deptDeps.positions.length} position{deptDeps.positions.length !== 1 ? 's' : ''}</li>
              )}
              {deptDeps.hasChildDepts && (
                <li>• {deptDeps.childDepts.length} child department{deptDeps.childDepts.length !== 1 ? 's' : ''} and their positions</li>
              )}
            </ul>
          </div>
        )}
        
        {/* Warning for non-dept-head positions that will be reassigned */}
        {hasWarnings && positionDeps?.hasReportingPositions && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Reporting structure will be updated
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {positionDeps.reportingPositions.length} position{positionDeps.reportingPositions.length !== 1 ? 's' : ''} currently report to "{target.name}".
                  {positionDeps.willReportTo 
                    ? <> They will be reassigned to report to <strong>{positionDeps.willReportTo.name}</strong>.</>
                    : <> They will become department heads (no supervisor).</>
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Normal message when no dependencies */}
        {!hasCriticalDependencies && !hasWarnings && !needsSuccession && (
          <p className="text-slate-600 dark:text-slate-400">
            {target.type === 'role' 
              ? `Delete the role "${target.name}"?`
              : `Delete "${target.name}"? This action cannot be undone.`
            }
          </p>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {hasCriticalDependencies ? (
            <Button variant="secondary" disabled>
              Cannot Delete
            </Button>
          ) : needsSuccession ? (
            <Button 
              variant="danger" 
              onClick={() => onConfirm({ newDeptHeadId, inheritExecSupervisor })}
              disabled={!canDeleteDeptHead}
            >
              Delete & Assign
            </Button>
          ) : (
            <Button variant="danger" onClick={() => onConfirm()}>
              {hasWarnings ? 'Delete Anyway' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}