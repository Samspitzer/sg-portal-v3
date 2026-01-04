import { AlertTriangle, UserCheck, ArrowDown } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

type DuplicateType = 'exact' | 'name-only';

interface ExistingContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneMobile?: string;
  phoneOffice?: string;
  companyId: string;
  companyName?: string;
}

interface NewContactInfo {
  firstName: string;
  lastName: string;
  email?: string;
  phoneMobile?: string;
  phoneOffice?: string;
  companyId: string;
  companyName?: string;
}

interface DuplicateContactModalProps {
  isOpen: boolean;
  duplicateType: DuplicateType;
  existingContact: ExistingContactInfo | null;
  newContactInfo: NewContactInfo | null;
  onClose: () => void;
  onTransferAndUpdate: () => void;
  onCreateNew: () => void;
}

export function DuplicateContactModal({
  isOpen,
  duplicateType,
  existingContact,
  newContactInfo,
  onClose,
  onTransferAndUpdate,
  onCreateNew,
}: DuplicateContactModalProps) {
  if (!existingContact) return null;

  const fullName = existingContact.firstName + ' ' + existingContact.lastName;

  // Scenario 1: Exact match (name + email) - Cannot create
  if (duplicateType === 'exact') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Contact Already Exists"
        size="md"
        footer={
          <Button variant="primary" onClick={onClose}>
            Go Back
          </Button>
        }
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            A contact with this name and email already exists in the system.
          </p>

          {/* Existing Contact Card */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-sm font-semibold text-accent-600 dark:text-accent-400">
                {existingContact.firstName.charAt(0)}{existingContact.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white">
                  {fullName}
                </div>
                {existingContact.email && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {existingContact.email}
                  </div>
                )}
                {existingContact.companyName && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {existingContact.companyName}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            Please go back and modify the contact information.
          </p>
        </div>
      </Modal>
    );
  }

  // Scenario 2: Name matches but email is different - Ask if same person
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Similar Contact Found"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onCreateNew}>
            Different Person
          </Button>
          <Button variant="primary" onClick={onTransferAndUpdate}>
            <UserCheck className="w-4 h-4 mr-2" />
            Same Person
          </Button>
        </>
      }
    >
      <div className="py-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A contact named <strong>{fullName}</strong> already exists. Is this the same person?
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="space-y-3">
          {/* Existing Contact */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              EXISTING CONTACT
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-xs font-semibold text-accent-600 dark:text-accent-400">
                {existingContact.firstName.charAt(0)}{existingContact.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {existingContact.email || 'No email'} • {existingContact.companyName || 'No company'}
                </div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowDown className="w-4 h-4 text-slate-400" />
          </div>

          {/* New Contact Info */}
          {newContactInfo && (
            <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
              <div className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-2">
                NEW INFORMATION
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-semibold text-brand-600 dark:text-brand-400">
                  {newContactInfo.firstName.charAt(0)}{newContactInfo.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {newContactInfo.firstName} {newContactInfo.lastName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {newContactInfo.email || 'No email'} • {newContactInfo.companyName || 'No company'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400">
          <p><strong>Same Person:</strong> Updates existing contact with new company and info</p>
          <p className="mt-1"><strong>Different Person:</strong> Creates a new separate contact</p>
        </div>
      </div>
    </Modal>
  );
}