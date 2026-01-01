import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Building2,
  Globe,
  Mail,
  Phone,
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

interface CompanyInfo {
  name: string;
  website: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  logo: string | null;
}

const initialCompanyInfo: CompanyInfo = {
  name: 'Spades & Ghosts Design LLC',
  website: 'https://sgbsny.com',
  email: 'info@sgbsny.com',
  phone: '(555) 123-4567',
  address: {
    street: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'United States',
  },
  logo: null,
};

export function CompanySettingsPage() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialCompanyInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyInfo({ ...companyInfo, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyInfo({ ...companyInfo, logo: null });
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
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                leftIcon={<Building2 className="w-4 h-4" />}
              />
              <Input
                label="Website"
                type="url"
                value={companyInfo.website}
                onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                leftIcon={<Globe className="w-4 h-4" />}
              />
              <Input
                label="Main Email"
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Phone"
                type="tel"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                leftIcon={<Phone className="w-4 h-4" />}
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
                value={companyInfo.address.street}
                onChange={(e) => setCompanyInfo({
                  ...companyInfo,
                  address: { ...companyInfo.address, street: e.target.value }
                })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={companyInfo.address.city}
                  onChange={(e) => setCompanyInfo({
                    ...companyInfo,
                    address: { ...companyInfo.address, city: e.target.value }
                  })}
                />
                <Input
                  label="State"
                  value={companyInfo.address.state}
                  onChange={(e) => setCompanyInfo({
                    ...companyInfo,
                    address: { ...companyInfo.address, state: e.target.value }
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ZIP Code"
                  value={companyInfo.address.zip}
                  onChange={(e) => setCompanyInfo({
                    ...companyInfo,
                    address: { ...companyInfo.address, zip: e.target.value }
                  })}
                />
                <Input
                  label="Country"
                  value={companyInfo.address.country}
                  onChange={(e) => setCompanyInfo({
                    ...companyInfo,
                    address: { ...companyInfo.address, country: e.target.value }
                  })}
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
                companyInfo.logo
                  ? 'border-transparent'
                  : 'border-slate-300 dark:border-slate-700'
              )}>
                {companyInfo.logo ? (
                  <img
                    src={companyInfo.logo}
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
                  {companyInfo.logo && (
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