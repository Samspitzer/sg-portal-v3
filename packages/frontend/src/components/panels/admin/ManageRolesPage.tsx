import { Link } from 'react-router-dom';
import {
  Shield,
  Settings,
  ExternalLink,
  Building2,
  Users,
  FolderKanban,
  Calculator,
  Receipt,
  Lock,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/common';
import { useFieldsStore } from '@/contexts';
import { useDocumentTitle } from '@/hooks';

// Panel definitions for preview
const PANELS = [
  { id: 'admin', name: 'Admin', icon: Settings },
  { id: 'customers', name: 'Customers', icon: Users },
  { id: 'projects', name: 'Projects', icon: FolderKanban },
  { id: 'estimating', name: 'Estimating', icon: Calculator },
  { id: 'accounting', name: 'Accounting', icon: Receipt },
];

export function ManageRolesPage() {
  useDocumentTitle('Permissions');
  
  const { departments } = useFieldsStore();
  
  // Count total positions
  const totalPositions = departments.reduce((sum, dept) => sum + dept.positions.length, 0);

  return (
    <Page
      title="Permissions"
      description="Configure panel access for each position in your organization."
    >
      <div className="space-y-6">
        {/* Coming Soon Card */}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              Permissions Configuration Coming Soon
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              A comprehensive permissions matrix will allow you to configure panel access 
              for each position in your organizational structure.
            </p>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Linked Structure */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-500" />
                  Organizational Structure
                </h3>
                <Link to="/admin/fields">
                  <Button variant="secondary" size="sm">
                    <Settings className="w-4 h-4 mr-1.5" />
                    Edit
                    <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Departments</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{departments.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Positions</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{totalPositions}</span>
                </div>
              </div>

              {departments.length === 0 ? (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    No positions defined yet. Set up your organizational structure in Field Settings first.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {departments.slice(0, 4).map(dept => (
                    <div key={dept.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">{dept.name}</span>
                      <span className="text-slate-500">{dept.positions.length} positions</span>
                    </div>
                  ))}
                  {departments.length > 4 && (
                    <p className="text-xs text-slate-400">+{departments.length - 4} more departments</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panels Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-accent-500" />
                Panels to Configure
              </h3>
              
              <div className="space-y-2">
                {PANELS.map(panel => {
                  const Icon = panel.icon;
                  return (
                    <div 
                      key={panel.id}
                      className="flex items-center gap-3 py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{panel.name}</span>
                      <span className="ml-auto text-xs text-slate-400">Not configured</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What's Coming */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              What's Coming
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>Position-based access control matrix (Full Access / View Only / No Access)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>Panel-level and feature-level permissions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>Inheritance from reporting hierarchy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>Cross-department access grants (e.g., COO can view Finance)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500 mt-1">•</span>
                <span>Approval workflow permissions</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}