// ============================================================================
// Module Icon Mappings
// Location: src/config/icons.ts
// 
// Centralized icon mappings for modules/entities.
// Use these instead of defining icons in each component.
// ============================================================================

import {
  Building2,
  FolderKanban,
  CheckSquare,
  FileText,
  Receipt,
  User,
  Users,
  DollarSign,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon mapping for modules/entity types
 */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  // Companies
  companies: Building2,
  company: Building2,
  
  // Projects
  projects: FolderKanban,
  project: FolderKanban,
  
  // Tasks
  tasks: CheckSquare,
  task: CheckSquare,
  
  // Estimates
  estimates: FileText,
  estimate: FileText,
  
  // Invoices
  invoices: Receipt,
  invoice: Receipt,
  
  // Contacts
  contacts: User,
  contact: User,
  
  // Users
  users: Users,
  user: Users,
  
  // Deals
  deals: Briefcase,
  deal: Briefcase,
  
  // Accounting
  accounting: DollarSign,
};

/**
 * Get icon component for a module/entity type
 * @param module - Module name (case-insensitive)
 * @returns Icon component or FileText as fallback
 */
export function getModuleIcon(module: string): LucideIcon {
  const key = module.toLowerCase();
  return MODULE_ICONS[key] || FileText;
}

/**
 * Entity type icons (for linked entities in tasks)
 */
export const ENTITY_ICONS = {
  contact: User,
  company: Building2,
  project: FolderKanban,
  estimate: FileText,
  invoice: Receipt,
  deal: Briefcase,
} as const;

export type EntityIconType = keyof typeof ENTITY_ICONS;