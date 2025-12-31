import { Page } from '@/components/layout';
import { Card, CardContent } from '@/components/common';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Page title={title} description={description}>
      <Card className="text-center py-16">
        <CardContent>
          <Construction className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
            Coming Soon
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            This panel is currently under development. Check back soon for updates.
          </p>
        </CardContent>
      </Card>
    </Page>
  );
}

export function AccountingPage() {
  return (
    <PlaceholderPage
      title="Accounting"
      description="Manage payments, reports, and financial analytics"
    />
  );
}

export function AdminPage() {
  return (
    <PlaceholderPage
      title="Admin Panel"
      description="System administration and user management"
    />
  );
}

export function DeveloperPage() {
  return (
    <PlaceholderPage
      title="Developer Tools"
      description="API documentation, logs, and debugging tools"
    />
  );
}
