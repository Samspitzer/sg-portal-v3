import {
  Phone,
  Video,
  Users,
  CheckSquare,
  Calendar,
  Clock,
  Mail,
  MessageCircle,
  FileText,
  Flag,
  AlertCircle,
  Star,
  Target,
  Send,
  Repeat,
  Bell,
  Briefcase,
  Clipboard,
  Edit,
  ThumbsUp,
  type LucideIcon,
} from 'lucide-react';
import { type TaskTypeIconName } from '@/contexts/taskTypesStore';

// Map icon names to Lucide components
const ICON_MAP: Record<TaskTypeIconName, LucideIcon> = {
  'phone': Phone,
  'video': Video,
  'users': Users,
  'check-square': CheckSquare,
  'calendar': Calendar,
  'clock': Clock,
  'mail': Mail,
  'message-circle': MessageCircle,
  'file-text': FileText,
  'flag': Flag,
  'alert-circle': AlertCircle,
  'star': Star,
  'target': Target,
  'send': Send,
  'repeat': Repeat,
  'bell': Bell,
  'briefcase': Briefcase,
  'clipboard': Clipboard,
  'edit': Edit,
  'thumbs-up': ThumbsUp,
};

interface TaskTypeIconProps {
  icon: TaskTypeIconName;
  className?: string;
  size?: number;
}

export function TaskTypeIcon({ icon, className = 'w-4 h-4', size }: TaskTypeIconProps) {
  const IconComponent = ICON_MAP[icon] || CheckSquare;
  return <IconComponent className={className} size={size} />;
}

export default TaskTypeIcon;