import { AlertTriangle, Building2, MapPin, Plus, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ExistingCompanyInfo {
  id: string;
  slug?: string;
  name: string;
  phone?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface NewCompanyInfo {
  name: string;
  phone?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

type DuplicateType = 'exact' | 'different-address' | 'different-website';

interface DuplicateCompanyModalProps {
  isOpen: boolean;
  duplicateType: DuplicateType;
  existingCompany: ExistingCompanyInfo | null;
  newCompanyInfo?: NewCompanyInfo | null;
  onClose: () => void;
  onViewExisting: () => void;
  onAddAsNewLocation?: () => void;
  onCreateSeparate?: () => void;
}

export function DuplicateCompanyModal({
  isOpen,
  duplicateType,
  existingCompany,
  newCompanyInfo,
  onClose,
  onViewExisting,
  onAddAsNewLocation,
  onCreateSeparate,
}: DuplicateCompanyModalProps) {
  if (!existingCompany) return null;

  const existingLocation = [existingCompany.city, existingCompany.state].filter(Boolean).join(', ');
  const existingFullAddress = [existingCompany.street, existingCompany.city, existingCompany.state, existingCompany.zip]
    .filter(Boolean)
    .join(', ');
  
  const newFullAddress = newCompanyInfo
    ? [newCompanyInfo.street, newCompanyInfo.city, newCompanyInfo.state, newCompanyInfo.zip].filter(Boolean).join(', ')
    : '';

  // Exact duplicate - block creation
  if (duplicateType === 'exact') {
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
            <Button variant="primary" onClick={onViewExisting}>
              <Building2 className="w-4 h-4 mr-2" />
              View Existing
            </Button>
          </>
        }
      >
        <div className="py-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              A company with this name and address already exists in the system. Duplicate entries are not allowed.
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
                  {[existingCompany.phone, existingLocation, existingCompany.website]
                    .filter(Boolean)
                    .join(' • ') || 'No additional info'}
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            View the existing company or go back to modify the details.
          </p>
        </div>
      </Modal>
    );
  }

  // Different address or website - show options
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Similar Company Found"
      size="lg"
    >
      <div className="py-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A company named <strong>"{existingCompany.name}"</strong> already exists
            {duplicateType === 'different-address' && ' at a different address'}
            {duplicateType === 'different-website' && ' with a different website'}.
            What would you like to do?
          </p>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Existing Company */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Existing Company
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-brand-500" />
              <span className="font-medium text-slate-900 dark:text-white">{existingCompany.name}</span>
            </div>
            {existingFullAddress && (
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{existingFullAddress}</span>
              </div>
            )}
            {existingCompany.website && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 ml-5">
                {existingCompany.website}
              </div>
            )}
          </div>

          {/* New Company */}
          <div className="p-4 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
            <div className="text-xs font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wide mb-2">
              New Entry
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-brand-500" />
              <span className="font-medium text-slate-900 dark:text-white">{newCompanyInfo?.name || existingCompany.name}</span>
            </div>
            {newFullAddress && (
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{newFullAddress}</span>
              </div>
            )}
            {newCompanyInfo?.website && (
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 ml-5">
                {newCompanyInfo.website}
              </div>
            )}
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-3">
          {/* Add as New Location */}
          {onAddAsNewLocation && duplicateType === 'different-address' && (
            <button
              onClick={onAddAsNewLocation}
              className="w-full p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center group-hover:bg-brand-200 dark:group-hover:bg-brand-900/50 transition-colors">
                  <Plus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Add as New Location</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Add this address as a secondary office to the existing company
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Create Separate Company */}
          {onCreateSeparate && (
            <button
              onClick={onCreateSeparate}
              className="w-full p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-accent-500 dark:hover:border-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/10 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center group-hover:bg-accent-200 dark:group-hover:bg-accent-900/50 transition-colors">
                  <Building2 className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-white">Create Separate Company</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Create a new company with the same name (separate entity)
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* View Existing */}
          <button
            onClick={onViewExisting}
            className="w-full p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                <ExternalLink className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">View Existing Company</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Open the existing company's detail page
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Cancel button */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}