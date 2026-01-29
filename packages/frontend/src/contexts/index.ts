export { useAuthStore } from './authStore';
export { useUIStore, initializeTheme } from './uiStore';
export { useToast } from './toastStore';
export { useCompanyStore, type CompanySettings, type CompanyOffice, type LetterheadTemplate } from './companyStore';
// Updated: fieldsStore replaces departmentsStore (backward compatible alias included)
export { 
  useFieldsStore, 
  useDepartmentsStore,  // Backward compatibility alias
  type Department, 
  type Position,
  type PositionLevel,
  // Sales field types
  type SalesStage,
  type SalesLabel,
  type SalesSource,
} from './fieldsStore';
export { useRolesStore, type Role, type Permission } from './rolesStore';
export { useNavigationGuardStore } from './navigationGuardStore';
export { useUsersStore, type User } from './usersStore';
export { 
  useClientsStore, 
  type Company, 
  type Contact, 
  type ContactRole, 
  type AdditionalContact,
  type ContactMethodType,
  type CompanyAddress,
  // REMOVED: CONTACT_ROLES - now in fieldsStore
  CONTACT_METHOD_TYPES,
  isDuplicateAddress,
  getCompanySalesRepIds,
  isCompanyAssignedToRep,
} from './clientsStore';
export {
  useTaskStore,
  type Task,
  type TaskType,
  type TaskStatus,
  type TaskPriority,
  type TaskInput,
  type TaskFilters,
  type LinkedEntity,
  type LinkedEntityType,
} from './taskStore';
export { 
  useTaskTypesStore, TASK_TYPE_ICONS, 
  type TaskTypeConfig, 
  type TaskTypeIconName 
} from './taskTypesStore';
// Sales store
export {
  useSalesStore,
  type Lead,
  type Deal,
  type LeadInput,
  type DealInput,
  type LeadStage,
  type DealStage,
  type LeadLabel,
  type LeadSource,
  type DealStatus,
  type JobsiteAddress,
  type SalesStore,
} from './salesStore';
