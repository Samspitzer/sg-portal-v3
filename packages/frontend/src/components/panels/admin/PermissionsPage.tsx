import { Shield, Lock, Users } from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent } from '@/components/common';
import { useDocumentTitle } from '@/hooks';

export function PermissionsPage() {
  useDocumentTitle('Permissions');
  return (
    <Page
      title="Permissions"
      description="Configure role-based access and permissions."
    >
      <Card>
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
            Permissions Management
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            This feature is coming soon. You'll be able to configure role-based permissions 
            for each page and feature in the portal.
          </p>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Users className="w-6 h-6 mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Role Management</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Lock className="w-6 h-6 mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Page Access</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Shield className="w-6 h-6 mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">Feature Permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}