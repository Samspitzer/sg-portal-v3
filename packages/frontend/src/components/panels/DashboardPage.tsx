import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FolderKanban,
  FileSpreadsheet,
  Users,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardHeader, CardContent, Button } from '@/components/common';
import { useAuthStore } from '@/contexts';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: typeof TrendingUp;
  color: 'brand' | 'accent' | 'success' | 'warning';
}

function StatCard({ title, value, change, icon: Icon, color }: StatCardProps) {
  const isPositive = change >= 0;
  
  const colorStyles = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-500',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-500',
  };

  return (
    <Card hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-success-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-danger-500" />
            )}
            <span
              className={clsx(
                'text-sm font-medium',
                isPositive ? 'text-success-600' : 'text-danger-600'
              )}
            >
              {isPositive ? '+' : ''}
              {change}%
            </span>
            <span className="text-sm text-slate-400">vs last month</span>
          </div>
        </div>
        <div className={clsx('p-3 rounded-xl', colorStyles[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
  type: 'project' | 'estimate' | 'invoice' | 'customer';
}

function ActivityItem({ title, description, time, type }: ActivityItemProps) {
  const icons = {
    project: FolderKanban,
    estimate: FileSpreadsheet,
    invoice: DollarSign,
    customer: Users,
  };

  const colors = {
    project: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
    estimate: 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
    invoice: 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-500',
    customer: 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-500',
  };

  const Icon = icons[type];

  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className={clsx('p-2 rounded-lg', colors[type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {title}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {description}
        </p>
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap">{time}</span>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();

  const stats: StatCardProps[] = [
    {
      title: 'Revenue',
      value: '$124,500',
      change: 12.5,
      icon: DollarSign,
      color: 'success',
    },
    {
      title: 'Active Projects',
      value: '24',
      change: 8.2,
      icon: FolderKanban,
      color: 'brand',
    },
    {
      title: 'Pending Estimates',
      value: '18',
      change: -3.1,
      icon: FileSpreadsheet,
      color: 'accent',
    },
    {
      title: 'Total Customers',
      value: '156',
      change: 5.4,
      icon: Users,
      color: 'warning',
    },
  ];

  const activities: ActivityItemProps[] = [
    {
      title: 'New project created',
      description: '123 Main Street Renovation',
      time: '2 min ago',
      type: 'project',
    },
    {
      title: 'Estimate approved',
      description: 'Commercial Kitchen Install - $45,000',
      time: '15 min ago',
      type: 'estimate',
    },
    {
      title: 'Invoice paid',
      description: 'Smith Residence - $12,500',
      time: '1 hour ago',
      type: 'invoice',
    },
    {
      title: 'New customer added',
      description: 'ABC Construction LLC',
      time: '2 hours ago',
      type: 'customer',
    },
    {
      title: 'Project completed',
      description: 'Office Building HVAC Upgrade',
      time: '3 hours ago',
      type: 'project',
    },
  ];

  return (
    <Page
      title={`Welcome back, ${user?.firstName || 'User'}`}
      description="Here's what's happening with your business today."
      actions={
        <Button
          variant="primary"
          rightIcon={<ArrowUpRight className="w-4 h-4" />}
        >
          View Reports
        </Button>
      }
    >
      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader
              title="Recent Activity"
              description="Latest updates across all panels"
              action={
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              }
            />
            <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card>
            <CardHeader
              title="Quick Actions"
              description="Frequently used actions"
            />
            <CardContent className="space-y-3">
              <Button variant="secondary" fullWidth leftIcon={<FolderKanban className="w-4 h-4" />}>
                New Project
              </Button>
              <Button variant="secondary" fullWidth leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
                Create Estimate
              </Button>
              <Button variant="secondary" fullWidth leftIcon={<Users className="w-4 h-4" />}>
                Add Customer
              </Button>
              <Button variant="secondary" fullWidth leftIcon={<DollarSign className="w-4 h-4" />}>
                New Invoice
              </Button>
            </CardContent>
          </Card>

          {/* System status */}
          <Card className="mt-6">
            <CardHeader title="System Status" />
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Activity className="w-5 h-5 text-success-500" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    All systems operational
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last checked: just now
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Page>
  );
}
