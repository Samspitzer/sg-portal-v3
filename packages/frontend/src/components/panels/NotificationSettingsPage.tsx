import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Mail,
  Bell,
  Info,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks';

export function NotificationSettingsPage() {
  useDocumentTitle('Notification Settings');

  return (
    <div className="max-w-4xl mx-auto p-6 pt-8">
      {/* Page Header */}
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Configure your email notification preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
        >
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Theme settings</strong> can be changed using the theme toggle in the header.
            </p>
          </div>
        </motion.div>

        {/* Email Notifications Section - Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Email Notifications
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose which emails you'd like to receive
                </p>
              </div>
            </div>
          </div>

          {/* Coming Soon Placeholder */}
          <div className="p-12 text-center">
            <div className={clsx(
              'w-16 h-16 mx-auto mb-4 rounded-full',
              'bg-slate-100 dark:bg-slate-700',
              'flex items-center justify-center'
            )}>
              <Bell className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              Coming Soon
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Email notification settings will be available here as we add notification features to each panel.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}