// ============================================================================
// FormStackProvider - Global Form Stack Manager
// Location: src/components/panels/add-forms/FormStackProvider.tsx
// 
// Provides a context for opening add forms from anywhere in the app.
// Handles stacking of multiple forms with proper z-index management.
// ============================================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AddCompanyForm } from './AddCompanyForm';
import { AddContactForm } from './AddContactForm';
import { AddLeadForm } from './AddLeadForm';
import { AddDealForm } from './AddDealForm';
import { AddTaskForm } from './AddTaskForm';
import { EditTaskForm } from './EditTaskForm';
import type { Company, Contact, Lead, Deal, Task } from '@/contexts';

// ============================================================================
// Types
// ============================================================================

interface CompanyFormOptions {
  defaultName?: string;
  onCreated?: (company: Company) => void;
}

interface ContactFormOptions {
  defaultName?: string;
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  onCreated?: (contact: Contact) => void;
}

interface LeadFormOptions {
  defaultName?: string;
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  defaultContactId?: string;
  defaultContactName?: string;
  onCreated?: (lead: Lead) => void;
}

interface DealFormOptions {
  defaultName?: string;
  defaultStage?: string;
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  defaultContactId?: string;
  defaultContactName?: string;
  onCreated?: (deal: Deal) => void;
}

interface TaskFormOptions {
  defaultCompanyId?: string;
  defaultCompanyName?: string;
  defaultContactId?: string;
  defaultContactName?: string;
  defaultLinkedItemType?: 'lead' | 'deal';
  defaultLinkedItemId?: string;
  defaultLinkedItemName?: string;
  defaultDueDate?: string;
  onCreated?: (task: Task) => void;
}

interface EditTaskFormOptions {
  task: Task;
  onUpdated?: (task: Task) => void;
  onDeleted?: (taskId: string) => void;
}

interface FormStackContextValue {
  // Open form methods
  openAddCompany: (options?: CompanyFormOptions) => void;
  openAddContact: (options?: ContactFormOptions) => void;
  openAddLead: (options?: LeadFormOptions) => void;
  openAddDeal: (options?: DealFormOptions) => void;
  openAddTask: (options?: TaskFormOptions) => void;
  openEditTask: (options: EditTaskFormOptions) => void;
  
  // Current stack info
  stackDepth: number;
}

type FormType = 'company' | 'contact' | 'lead' | 'deal' | 'task' | 'edit-task';

interface FormStackItem {
  type: FormType;
  options: CompanyFormOptions | ContactFormOptions | LeadFormOptions | DealFormOptions | TaskFormOptions | EditTaskFormOptions;
}

// ============================================================================
// Context
// ============================================================================

const FormStackContext = createContext<FormStackContextValue | null>(null);

export function useFormStack() {
  const context = useContext(FormStackContext);
  if (!context) {
    throw new Error('useFormStack must be used within a FormStackProvider');
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

interface FormStackProviderProps {
  children: ReactNode;
}

export function FormStackProvider({ children }: FormStackProviderProps) {
  // Stack of open forms
  const [formStack, setFormStack] = useState<FormStackItem[]>([]);

  // Push a form onto the stack
  const pushForm = useCallback((type: FormType, options: FormStackItem['options']) => {
    setFormStack(prev => [...prev, { type, options }]);
  }, []);

  // Pop the top form from the stack
  const popForm = useCallback(() => {
    setFormStack(prev => prev.slice(0, -1));
  }, []);

  // Open form methods
  const openAddCompany = useCallback((options: CompanyFormOptions = {}) => {
    pushForm('company', options);
  }, [pushForm]);

  const openAddContact = useCallback((options: ContactFormOptions = {}) => {
    pushForm('contact', options);
  }, [pushForm]);

  const openAddLead = useCallback((options: LeadFormOptions = {}) => {
    pushForm('lead', options);
  }, [pushForm]);

  const openAddDeal = useCallback((options: DealFormOptions = {}) => {
    pushForm('deal', options);
  }, [pushForm]);

  const openAddTask = useCallback((options: TaskFormOptions = {}) => {
    pushForm('task', options);
  }, [pushForm]);

  const openEditTask = useCallback((options: EditTaskFormOptions) => {
    pushForm('edit-task', options);
  }, [pushForm]);

  // Context value
  const contextValue: FormStackContextValue = {
    openAddCompany,
    openAddContact,
    openAddLead,
    openAddDeal,
    openAddTask,
    openEditTask,
    stackDepth: formStack.length,
  };

  // Render all forms in the stack
  const renderForms = () => {
    return formStack.map((item, index) => {
      const stackLevel = index;
      const isOpen = true; // All items in stack are open

      const handleClose = () => {
        // Remove this form and all forms above it
        setFormStack(prev => prev.slice(0, index));
      };

      // Callbacks for opening nested forms
      const handleAddCompanyFromChild = (searchTerm: string, callback: (company: { id: string; name: string }) => void) => {
        pushForm('company', {
          defaultName: searchTerm,
          onCreated: (createdCompany: Company) => {
            callback({ id: createdCompany.id, name: createdCompany.name });
          },
        });
      };

      const handleAddContactFromChild = (
        searchTerm: string,
        companyId: string,
        companyName: string,
        callback: (contact: { id: string; name: string }) => void
      ) => {
        pushForm('contact', {
          defaultName: searchTerm,
          defaultCompanyId: companyId,
          defaultCompanyName: companyName,
          onCreated: (createdContact: Contact) => {
            const name = `${createdContact.firstName} ${createdContact.lastName}`.trim();
            callback({ id: createdContact.id, name });
          },
        });
      };

      const handleAddLeadFromChild = (
        searchTerm: string,
        companyId: string,
        companyName: string,
        contactId: string | undefined,
        contactName: string | undefined,
        callback: (lead: { id: string; name: string }) => void
      ) => {
        pushForm('lead', {
          defaultName: searchTerm,
          defaultCompanyId: companyId,
          defaultCompanyName: companyName,
          defaultContactId: contactId,
          defaultContactName: contactName,
          onCreated: (createdLead: Lead) => {
            callback({ id: createdLead.id, name: createdLead.name });
          },
        });
      };

      const handleAddDealFromChild = (
        searchTerm: string,
        companyId: string,
        companyName: string,
        contactId: string | undefined,
        contactName: string | undefined,
        callback: (deal: { id: string; name: string }) => void
      ) => {
        pushForm('deal', {
          defaultName: searchTerm,
          defaultCompanyId: companyId,
          defaultCompanyName: companyName,
          defaultContactId: contactId,
          defaultContactName: contactName,
          onCreated: (createdDeal: Deal) => {
            callback({ id: createdDeal.id, name: createdDeal.name });
          },
        });
      };

      switch (item.type) {
        case 'company': {
          const opts = item.options as CompanyFormOptions;
          return (
            <AddCompanyForm
              key={`company-${index}`}
              isOpen={isOpen}
              onClose={handleClose}
              defaultName={opts.defaultName}
              stackLevel={stackLevel}
              onCreated={(company) => {
                opts.onCreated?.(company);
                popForm();
              }}
            />
          );
        }

        case 'contact': {
          const opts = item.options as ContactFormOptions;
          return (
            <AddContactForm
              key={`contact-${index}`}
              isOpen={isOpen}
              onClose={handleClose}
              defaultName={opts.defaultName}
              defaultCompanyId={opts.defaultCompanyId}
              defaultCompanyName={opts.defaultCompanyName}
              stackLevel={stackLevel}
              onAddCompany={handleAddCompanyFromChild}
              onCreated={(contact) => {
                opts.onCreated?.(contact);
                popForm();
              }}
            />
          );
        }

        case 'lead': {
          const opts = item.options as LeadFormOptions;
          return (
            <AddLeadForm
              key={`lead-${index}`}
              isOpen={isOpen}
              onClose={handleClose}
              defaultName={opts.defaultName}
              defaultCompanyId={opts.defaultCompanyId}
              defaultCompanyName={opts.defaultCompanyName}
              defaultContactId={opts.defaultContactId}
              defaultContactName={opts.defaultContactName}
              stackLevel={stackLevel}
              onAddCompany={handleAddCompanyFromChild}
              onAddContact={handleAddContactFromChild}
              onCreated={(lead) => {
                opts.onCreated?.(lead);
                popForm();
              }}
            />
          );
        }

        case 'deal': {
          const opts = item.options as DealFormOptions;
          return (
            <AddDealForm
              key={`deal-${index}`}
              isOpen={isOpen}
              onClose={handleClose}
              defaultName={opts.defaultName}
              defaultStage={opts.defaultStage}
              defaultCompanyId={opts.defaultCompanyId}
              defaultCompanyName={opts.defaultCompanyName}
              defaultContactId={opts.defaultContactId}
              defaultContactName={opts.defaultContactName}
              stackLevel={stackLevel}
              onAddCompany={handleAddCompanyFromChild}
              onAddContact={handleAddContactFromChild}
              onCreated={(deal) => {
                opts.onCreated?.(deal);
                popForm();
              }}
            />
          );
        }

        case 'task': {
          const opts = item.options as TaskFormOptions;
          return (
            <AddTaskForm
              key={`task-${index}`}
              isOpen={isOpen}
              onClose={handleClose}
              defaultCompanyId={opts.defaultCompanyId}
              defaultCompanyName={opts.defaultCompanyName}
              defaultContactId={opts.defaultContactId}
              defaultContactName={opts.defaultContactName}
              defaultLinkedItemType={opts.defaultLinkedItemType}
              defaultLinkedItemId={opts.defaultLinkedItemId}
              defaultLinkedItemName={opts.defaultLinkedItemName}
              defaultDueDate={opts.defaultDueDate}
              stackLevel={stackLevel}
              onAddCompany={handleAddCompanyFromChild}
              onAddContact={handleAddContactFromChild}
              onAddLead={handleAddLeadFromChild}
              onAddDeal={handleAddDealFromChild}
              onCreated={(task) => {
                opts.onCreated?.(task);
                popForm();
              }}
            />
          );
        }

        case 'edit-task': {
          const opts = item.options as EditTaskFormOptions;
          return (
            <EditTaskForm
              key={`edit-task-${index}`}
              task={opts.task}
              isOpen={isOpen}
              onClose={handleClose}
              onAddCompany={handleAddCompanyFromChild}
              onAddContact={handleAddContactFromChild}
              onUpdated={(task) => {
                opts.onUpdated?.(task);
                popForm();
              }}
              onDeleted={(taskId) => {
                opts.onDeleted?.(taskId);
                popForm();
              }}
            />
          );
        }

        default:
          return null;
      }
    });
  };

  return (
    <FormStackContext.Provider value={contextValue}>
      {children}
      {renderForms()}
    </FormStackContext.Provider>
  );
}

export default FormStackProvider;