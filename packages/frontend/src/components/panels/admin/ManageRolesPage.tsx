import { Shield } from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent } from '@/components/common';
import { useDocumentTitle } from '@/hooks';

export function ManageRolesPage() {
  useDocumentTitle('Roles');
  return (
    <Page
      title="Manage Roles"
      description="Define roles and configure their permissions."
    >
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
            Coming Soon
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Role and permission management will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}