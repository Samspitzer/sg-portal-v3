import { AlertTriangle, Building2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ExistingCompanyInfo {
  id: string;
  name: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
}

interface DuplicateCompanyModalProps {
  isOpen: boolean;
  existingCompany: ExistingCompanyInfo | null;
  onClose: () => void;
  onUseExisting: () => void;
}

export function DuplicateCompanyModal({
  isOpen,
  existingCompany,
  onClose,
  onUseExisting,
}: DuplicateCompanyModalProps) {
  if (!existingCompany) return null;

  const location = [existingCompany.city, existingCompany.state].filter(Boolean).join(', ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Already Exists"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Go Back
          </Button>
          <Button variant="primary" onClick={onUseExisting}>
            <Building2 className="w-4 h-4 mr-2" />
            View Existing
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
            A company with this name already exists in the system.
          </p>
        </div>

        {/* Existing Company Card */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white">
                {existingCompany.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {[existingCompany.phone, location, existingCompany.website]
                  .filter(Boolean)
                  .join(' • ') || 'No additional info'}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
          You can view the existing company or go back to modify the name.
        </p>
      </div>
    </Modal>
  );
}