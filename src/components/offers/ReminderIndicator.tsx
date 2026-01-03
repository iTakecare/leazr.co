import React from "react";
import { Badge } from "@/components/ui/badge";
import { Bell, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReminderStatus, AllReminders } from "@/hooks/useOfferReminders";

interface ReminderIndicatorProps {
  reminder?: ReminderStatus | null;
  allReminders?: AllReminders | null;
  onClick?: () => void;
  compact?: boolean;
}

const ReminderIndicator: React.FC<ReminderIndicatorProps> = ({
  reminder,
  allReminders,
  onClick,
  compact = false,
}) => {
  // If allReminders is provided, show multiple badges
  if (allReminders) {
    const badges: ReminderStatus[] = [];
    
    if (allReminders.documentReminder) {
      badges.push(allReminders.documentReminder);
    }
    if (allReminders.offerReminder) {
      badges.push(allReminders.offerReminder);
    }

    if (badges.length === 0) return null;

    return (
      <div className="flex gap-1 flex-wrap">
        {badges.map((r, index) => (
          <SingleBadge
            key={`${r.type}-${r.level}-${index}`}
            reminder={r}
            onClick={onClick}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  // Fallback to single reminder for backward compatibility
  if (!reminder) return null;

  return (
    <SingleBadge reminder={reminder} onClick={onClick} compact={compact} />
  );
};

interface SingleBadgeProps {
  reminder: ReminderStatus;
  onClick?: () => void;
  compact?: boolean;
}

const SingleBadge: React.FC<SingleBadgeProps> = ({ reminder, onClick, compact = false }) => {
  const getColorClasses = () => {
    switch (reminder.color) {
      // Documents - palette violette/mauve
      case 'doc-l1':
        return "bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200";
      case 'doc-l2':
        return "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200";
      case 'doc-l3':
        return "bg-purple-200 text-purple-900 border-purple-400 hover:bg-purple-300 animate-pulse";
      
      // Offres - palette bleue/teal
      case 'offer-l1':
        return "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200";
      case 'offer-l2':
        return "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200";
      case 'offer-l3':
        return "bg-sky-200 text-sky-900 border-sky-400 hover:bg-sky-300 animate-pulse";
      
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const Icon = reminder.type === 'document_reminder' ? FileText : Bell;

  if (compact) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "cursor-pointer gap-1 px-1.5 py-0.5 text-xs font-medium",
          getColorClasses()
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        <Icon className="h-3 w-3" />
        {reminder.label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer gap-1.5 px-2 py-1",
        getColorClasses()
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{reminder.label}</span>
      {reminder.isActive && (
        <span className="text-[10px] opacity-70">
          ({reminder.daysElapsed}j)
        </span>
      )}
    </Badge>
  );
};

export default ReminderIndicator;
