// ============================================================================
// Add Forms - Index
// Location: src/components/panels/add-forms/index.ts
// 
// Exports all standalone add/create forms that can be used as overlays.
// These forms support stacking (opening one from another) with proper z-index.
// ============================================================================

// Base modal panel component
export { ModalPanel, ModalPanelFooter, type ModalPanelProps, type ModalPanelFooterProps } from './ModalPanel';

// Entity creation forms
export { AddCompanyForm, type AddCompanyFormProps, type AddCompanyFormData } from './AddCompanyForm';
export { AddContactForm, type AddContactFormProps, type AddContactFormData } from './AddContactForm';
export { AddLeadForm, type AddLeadFormProps, type AddLeadFormData } from './AddLeadForm';
export { AddDealForm, type AddDealFormProps, type AddDealFormData } from './AddDealForm';
export { AddTaskForm, type AddTaskFormProps, type AddTaskFormData } from './AddTaskForm';

// Form stack provider and hook
export { FormStackProvider, useFormStack } from './FormStackProvider';