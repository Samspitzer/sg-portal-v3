import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Plus, Building2, Contact, ArrowRight, } from 'lucide-react';
import { Page } from '@/components/layout';
import { Card, CardContent, Button } from '@/components/common';
import { useClientsStore } from '@/contexts';

const colorClasses = {
  brand: {
    bg: 'bg-brand-100 dark:bg-brand-900/30',
    icon: 'text-brand-600 dark:text-brand-400',
    hover: 'hover:border-brand-300 dark:hover:border-brand-700',
  },
  accent: {
    bg: 'bg-accent-100 dark:bg-accent-900/30',
    icon: 'text-accent-600 dark:text-accent-400',
    hover: 'hover:border-accent-300 dark:hover:border-accent-700',
  },
};

export function ClientsPage() {
  const navigate = useNavigate();
  const { companies, contacts } = useClientsStore();

  const tiles = [
    {
      id: 'companies',
      name: 'Companies',
      description: `${companies.length} company${companies.length !== 1 ? 'ies' : ''} registered`,
      icon: Building2,
      path: '/clients/companies',
      color: 'brand' as const,
    },
    {
      id: 'contacts',
      name: 'Contacts',
      description: `${contacts.length} contact${contacts.length !== 1 ? 's' : ''} registered`,
      icon: Contact,
      path: '/clients/contacts',
      color: 'accent' as const,
    },
  ];

  return (
    <Page
      title="Customers"
      description="Manage your client companies and contacts."
      actions={
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/clients/contacts')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
          <Button variant="primary" onClick={() => navigate('/clients/companies')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      }
    >
      {/* Tiles Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {tiles.map((tile, index) => {
          const colors = colorClasses[tile.color];
          const Icon = tile.icon;

          return (
            <motion.div
              key={tile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.1 }}
            >
              <Card
                hover
                className={clsx(
                  'h-full transition-all duration-200 border-2 border-transparent cursor-pointer',
                  colors.hover
                )}
                onClick={() => navigate(tile.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={clsx(
                      'w-14 h-14 rounded-xl flex items-center justify-center',
                      colors.bg
                    )}>
                      <Icon className={clsx('w-7 h-7', colors.icon)} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  </div>
                  
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                    {tile.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {tile.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </Page>
  );
}