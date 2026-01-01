import { useState } from 'react';
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
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button, Input } from '@/components/common';
import { useCompanyStore } from '@/contexts';
import { useToast } from '@/contexts';

export function CompanySettingsPage() {
  const { company, setCompany, } = useCompanyStore();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Local form state
  const [formData, setFormData] = useState(company);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Update the global store
    setCompany(formData);
    
    setIsLoading(false);
    setIsSaved(true);
    toast.success('Settings saved', 'Company information has been updated');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoData = reader.result as string;
        setFormData({ ...formData, logo: logoData });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: null });
  };

  return (
    <Page
      title="Company Settings"
      description="Manage your company information and branding."
      actions={
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : isSaved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
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

            <div className="flex items-center gap-6">
              {/* Logo Preview */}
              <div className={clsx(
                'w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center',
                formData.logo
                  ? 'border-transparent'
                  : 'border-slate-300 dark:border-slate-700'
              )}>
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt="Company Logo"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="text-center">
                    <Image className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs text-slate-400 mt-2">No logo</p>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <div className="flex flex-col gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className={clsx(
                      'flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
                      'bg-brand-500 text-white hover:bg-brand-600',
                      'transition-colors cursor-pointer'
                    )}>
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">Upload Logo</span>
                    </div>
                  </label>
                  {formData.logo && (
                    <Button variant="secondary" size="sm" onClick={handleRemoveLogo}>
                      <X className="w-4 h-4 mr-2" />
                      Remove Logo
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                  Recommended: 512x512px, PNG or SVG
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Letterhead Template - Placeholder */}
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

            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="mt-4 font-medium text-slate-600 dark:text-slate-400">Coming Soon</h4>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Upload and configure your letterhead template for invoices and documents
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}