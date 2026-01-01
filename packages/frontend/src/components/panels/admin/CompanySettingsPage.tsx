import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Building2,
  MapPin,
  Upload,
  Image,
  FileText,
  Check,
  Loader2,
  X,
  Eye,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal } from '@/components/common';
import { useCompanyStore, useToast } from '@/contexts';

export function CompanySettingsPage() {
  const { company, setCompany } = useCompanyStore();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showLetterheadPreview, setShowLetterheadPreview] = useState(false);

  // Track original and current form data
  const [originalData, setOriginalData] = useState(company);
  const [formData, setFormData] = useState(company);

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(originalData) !== JSON.stringify(formData);

  // Warn on browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setCompany(formData);
    setOriginalData(formData);
    setIsLoading(false);
    toast.success('Settings saved', 'Company information has been updated');
  };

  const handleDiscard = () => {
    setFormData(originalData);
    toast.info('Changes discarded', 'Your changes were not saved');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Please upload a file under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type', 'Please upload a PNG, JPG, or PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Please upload a file under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, letterhead: reader.result as string });
        toast.success('Letterhead uploaded', 'Preview and save to apply changes');
      };
      reader.readAsDataURL(file);
    }
  };

  const isPdf = formData.letterhead?.startsWith('data:application/pdf');

  return (
    <Page
      title="Company Settings"
      description="Manage your company information and branding."
      actions={
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full mr-2">
              Unsaved changes
            </span>
          )}
          {hasChanges && (
            <Button variant="secondary" onClick={handleDiscard}>
              Discard
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Company Information</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Basic company details</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Company Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
              />
              <Input
                label="Website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
              <Input
                label="Main Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@example.com"
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Address</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Company location</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Street Address"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
                placeholder="123 Main Street"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={formData.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value }
                  })}
                  placeholder="New York"
                />
                <Input
                  label="State"
                  value={formData.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, state: e.target.value }
                  })}
                  placeholder="NY"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ZIP Code"
                  value={formData.address.zip}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, zip: e.target.value }
                  })}
                  placeholder="10001"
                />
                <Input
                  label="Country"
                  value={formData.address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, country: e.target.value }
                  })}
                  placeholder="United States"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Logo */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                <Image className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Company Logo</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Used throughout the portal</p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div className={clsx(
                'w-28 h-28 rounded-xl flex items-center justify-center flex-shrink-0',
                'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              )}>
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="Company Logo"
                    className="w-full h-full object-contain rounded-xl p-2"
                  />
                ) : (
                  <Image className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className={clsx(
                    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg w-full',
                    'border-2 border-dashed border-slate-300 dark:border-slate-600',
                    'hover:border-brand-400 dark:hover:border-brand-500',
                    'hover:bg-brand-50/50 dark:hover:bg-brand-900/10',
                    'text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400',
                    'transition-colors cursor-pointer'
                  )}>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {formData.logo ? 'Replace Logo' : 'Upload Logo'}
                    </span>
                  </div>
                </label>
                {formData.logo && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setFormData({ ...formData, logo: null })}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  PNG, JPG or SVG. Max 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Letterhead Template */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Letterhead Template</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">For invoices and documents</p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              {/* Letterhead Preview */}
              <div 
                className={clsx(
                  'w-28 h-36 rounded-xl flex items-center justify-center flex-shrink-0',
                  'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                  formData.letterhead && 'cursor-pointer group relative overflow-hidden'
                )}
                onClick={() => formData.letterhead && setShowLetterheadPreview(true)}
              >
                {formData.letterhead ? (
                  <>
                    {isPdf ? (
                      <FileText className="w-10 h-10 text-red-500" />
                    ) : (
                      <img
                        src={formData.letterhead}
                        alt="Letterhead Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </>
                ) : (
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={handleLetterheadUpload}
                    className="hidden"
                  />
                  <div className={clsx(
                    'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg w-full',
                    'border-2 border-dashed border-slate-300 dark:border-slate-600',
                    'hover:border-brand-400 dark:hover:border-brand-500',
                    'hover:bg-brand-50/50 dark:hover:bg-brand-900/10',
                    'text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400',
                    'transition-colors cursor-pointer'
                  )}>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {formData.letterhead ? 'Replace Letterhead' : 'Upload Letterhead'}
                    </span>
                  </div>
                </label>
                {formData.letterhead && (
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => setShowLetterheadPreview(true)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => setFormData({ ...formData, letterhead: null })}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  PNG, JPG or PDF. Max 5MB. Used as background for documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

     {/* Letterhead Preview Modal */}
      <Modal
        isOpen={showLetterheadPreview}
        onClose={() => setShowLetterheadPreview(false)}
        title="Letterhead Preview"
        size="xl"
      >
        <div className="flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900 rounded-lg min-h-[400px]">
          {isPdf ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-red-500" />
              <p className="mt-4 text-slate-600 dark:text-slate-400">
                PDF preview coming soon
              </p>
              <a href={formData.letterhead || '#'} download="letterhead.pdf" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                <Upload className="w-4 h-4 rotate-180" />
                Download PDF
              </a>
            </div>
          ) : (
            <img
              src={formData.letterhead || ''}
              alt="Letterhead Full Preview"
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            />
          )}
        </div>
      </Modal>
    </Page>
  );
}