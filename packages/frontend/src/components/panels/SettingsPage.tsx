import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Sun,
  Moon,
  Monitor,
  Mail,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useUIStore, useToast } from '@/contexts';
import { Modal } from '@/components/common';

type ThemeOption = 'light' | 'dark' | 'system';

interface SettingsFormData {
  theme: ThemeOption;
}

export function SettingsPage() {
  const { theme, setTheme } = useUIStore();
  const toast = useToast();

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
  // Track original and current settings
  const [originalSettings] = useState<SettingsFormData>({ theme });
  const [currentSettings, setCurrentSettings] = useState<SettingsFormData>({ theme });
  
  const hasChanges = currentSettings.theme !== originalSettings.theme;

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

  const handleThemeSelect = (newTheme: ThemeOption) => {
    setCurrentSettings({ ...currentSettings, theme: newTheme });
    // Preview the theme immediately
    setTheme(newTheme);
  };

  const handleSave = () => {
    // Theme is already applied via preview
    toast.success('Settings saved', 'Your preferences have been updated');
  };

  const handleDiscard = () => {
    setTheme(originalSettings.theme);
    setCurrentSettings(originalSettings);
    toast.info('Changes discarded', 'Your changes were not saved');
  };

  const themeOptions = [
    {
      id: 'light' as const,
      label: 'Light',
      description: 'Light background with dark text',
      icon: <Sun className="w-5 h-5" />,
    },
    {
      id: 'dark' as const,
      label: 'Dark',
      description: 'Dark background with light text',
      icon: <Moon className="w-5 h-5" />,
    },
    {
      id: 'system' as const,
      label: 'System',
      description: 'Follows your device settings',
      icon: <Monitor className="w-5 h-5" />,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 pt-8">
      {/* Page Header */}
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Manage your preferences
            </p>
          </div>
          {hasChanges && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Appearance
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleThemeSelect(option.id)}
                  className={clsx(
                    'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                    currentSettings.theme === option.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  {currentSettings.theme === option.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    'bg-slate-100 dark:bg-slate-700',
                    'text-slate-500 dark:text-slate-400'
                  )}>
                    {option.icon}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      {option.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Email Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <button
            onClick={() => setEmailModalOpen(true)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={clsx(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                'bg-slate-100 dark:bg-slate-700',
                'text-slate-500 dark:text-slate-400'
              )}>
                <Mail className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  Email Notifications
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure when and how you receive email notifications
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end gap-3"
        >
          {hasChanges && (
            <button
              onClick={handleDiscard}
              className="px-6 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium rounded-xl transition-colors"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={clsx(
              'px-6 py-2.5 font-semibold rounded-xl transition-colors',
              hasChanges
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            )}
          >
            Save Changes
          </button>
        </motion.div>
      </div>

      {/* Email Notifications Modal */}
      <Modal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Email Notifications"
        description="Configure your notification preferences"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setEmailModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setEmailModalOpen(false);
                toast.success('Saved', 'Notification settings updated');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </>
        }
      >
        <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
          <Mail className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Email notification settings will be configured here.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Schedule times, notification types, recipients, etc.
          </p>
        </div>
      </Modal>
    </div>
  );
}