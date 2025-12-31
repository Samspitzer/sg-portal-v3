import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Camera,
  Upload,
} from 'lucide-react';
import { useAuthStore, useToast } from '@/contexts';

export function ProfilePage() {
  const { user } = useAuthStore();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file', 'Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Please select an image under 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
        toast.success('Photo updated', 'Your profile photo has been updated');
        // TODO: Upload to server
      };
      reader.readAsDataURL(file);
    }
  };

  const profileFields = [
    {
      id: 'fullName',
      label: 'Full Name',
      value: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—',
      icon: <User className="w-4 h-4" />,
      iconBg: 'bg-slate-100 dark:bg-slate-700',
      iconColor: 'text-slate-500 dark:text-slate-400',
    },
    {
      id: 'email',
      label: 'Email Address',
      value: user?.email || '—',
      icon: <Mail className="w-4 h-4" />,
      iconBg: 'bg-slate-100 dark:bg-slate-700',
      iconColor: 'text-slate-500 dark:text-slate-400',
    },
    {
      id: 'department',
      label: 'Department',
      value: user?.department || '—',
      icon: <Building2 className="w-4 h-4" />,
      iconBg: 'bg-slate-100 dark:bg-slate-700',
      iconColor: 'text-slate-500 dark:text-slate-400',
    },
    {
      id: 'jobTitle',
      label: 'Job Title',
      value: user?.jobTitle || '—',
      icon: <Briefcase className="w-4 h-4" />,
      iconBg: 'bg-slate-100 dark:bg-slate-700',
      iconColor: 'text-slate-500 dark:text-slate-400',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Your account information
        </p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Avatar Section */}
        <div className="px-6 py-8 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* Avatar with upload */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-primary-600 dark:text-primary-400 shadow-lg overflow-hidden">
                {avatarPreview || user?.avatarUrl ? (
                  <img 
                    src={avatarPreview || user?.avatarUrl} 
                    alt={user?.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                )}
              </div>
              
              {/* Upload overlay */}
              <button 
                onClick={handleAvatarClick}
                className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Upload className="w-6 h-6 text-white mb-1" />
                <span className="text-white text-xs font-medium">Upload</span>
              </button>
              
              {/* Camera button */}
              <button 
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary-500 hover:bg-primary-600 shadow-md flex items-center justify-center text-white transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            {/* User Name */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-4">
              {user?.displayName}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
            </p>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-6">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            Account Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profileFields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700"
              >
                <div className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  field.iconBg,
                  field.iconColor
                )}>
                  {field.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {field.label}
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {field.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Contact your administrator to update your profile information.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}