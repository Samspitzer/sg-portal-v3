// ============================================================================
// AddItemPanel Component
// Location: src/components/panels/AddItemPanel.tsx
// 
// Generic slide-over panel for adding/editing items (leads, deals, tasks, etc.)
// Uses SlidePanel layout component for consistent behavior.
// 
// Field definitions will come from fieldsStore in the future when
// Fields Settings page is implemented.
// ============================================================================

import { type ReactNode } from 'react';
import { SlidePanel, type SlidePanelSize } from '@/components/layout';

// ============================================================================
// Types
// ============================================================================

export interface AddItemPanelProps {
  /** Whether panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Panel title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Icon to show in header */
  icon?: ReactNode;
  /** Panel size preset (only used when not resizable) */
  size?: SlidePanelSize;
  /** Allow resizing by dragging left edge */
  resizable?: boolean;
  /** Initial width when resizable (px) */
  initialWidth?: number;
  /** Minimum width when resizable (px) */
  minWidth?: number;
  /** Maximum width when resizable (px) */
  maxWidth?: number;
  /** Form content */
  children: ReactNode;
  /** Footer content (save/cancel buttons) */
  footer: ReactNode;
  /** Additional class for content area */
  className?: string;
  /** Optional sidebar content (renders on right side of panel) */
  sidebar?: ReactNode;
  /** Sidebar width in pixels (default: 280) */
  sidebarWidth?: number;
  /** Whether content area should scroll (default: false for forms) */
  scrollable?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AddItemPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'xl',
  resizable = true,
  initialWidth = 700,
  minWidth = 450,
  maxWidth = 1000,
  children,
  footer,
  className,
  sidebar,
  sidebarWidth = 280,
  scrollable = false,
}: AddItemPanelProps) {
  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      size={size}
      resizable={resizable}
      initialWidth={initialWidth}
      minWidth={minWidth}
      maxWidth={maxWidth}
      footer={footer}
      className={className}
      scrollable={scrollable}
      sidebar={sidebar}
      sidebarWidth={sidebarWidth}
    >
      {children}
    </SlidePanel>
  );
}

export default AddItemPanel;