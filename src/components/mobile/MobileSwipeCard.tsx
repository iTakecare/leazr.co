import React, { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Phone, Mail, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  id: string;
  icon: React.ElementType;
  label: string;
  color: 'primary' | 'destructive' | 'muted';
  onClick: () => void;
}

interface MobileSwipeCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeComplete?: (actionId: string) => void;
  className?: string;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 80;

const MobileSwipeCard: React.FC<MobileSwipeCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeComplete,
  className,
  disabled = false,
}) => {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const constraintRef = useRef<HTMLDivElement>(null);

  const leftActionsWidth = leftActions.length * ACTION_WIDTH;
  const rightActionsWidth = rightActions.length * ACTION_WIDTH;

  // Opacity transforms for background actions
  const leftOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1]);
  const rightOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.5]);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (disabled) return;

    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Quick swipe detection
    if (Math.abs(velocity) > 500) {
      if (velocity > 0 && leftActions.length > 0) {
        setIsOpen('left');
        x.set(leftActionsWidth);
      } else if (velocity < 0 && rightActions.length > 0) {
        setIsOpen('right');
        x.set(-rightActionsWidth);
      }
      return;
    }

    // Threshold-based detection
    if (offset > SWIPE_THRESHOLD && leftActions.length > 0) {
      setIsOpen('left');
      x.set(leftActionsWidth);
    } else if (offset < -SWIPE_THRESHOLD && rightActions.length > 0) {
      setIsOpen('right');
      x.set(-rightActionsWidth);
    } else {
      // Reset position
      setIsOpen(null);
      x.set(0);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    onSwipeComplete?.(action.id);
    // Reset card position
    setIsOpen(null);
    x.set(0);
  };

  const closeActions = () => {
    setIsOpen(null);
    x.set(0);
  };

  const getActionColorClasses = (color: SwipeAction['color']) => {
    switch (color) {
      case 'primary':
        return 'bg-primary text-primary-foreground';
      case 'destructive':
        return 'bg-destructive text-destructive-foreground';
      case 'muted':
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div 
      ref={constraintRef}
      className={cn("relative overflow-hidden rounded-xl", className)}
    >
      {/* Left Actions (shown when swiping right) */}
      {leftActions.length > 0 && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className="absolute inset-y-0 left-0 flex"
        >
          {leftActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "flex flex-col items-center justify-center touch-target",
                  getActionColorClasses(action.color)
                )}
                style={{ width: ACTION_WIDTH }}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium">{action.label}</span>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Right Actions (shown when swiping left) */}
      {rightActions.length > 0 && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className="absolute inset-y-0 right-0 flex"
        >
          {rightActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={cn(
                  "flex flex-col items-center justify-center touch-target",
                  getActionColorClasses(action.color)
                )}
                style={{ width: ACTION_WIDTH }}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-medium">{action.label}</span>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Main Card Content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{
          left: rightActions.length > 0 ? -rightActionsWidth : 0,
          right: leftActions.length > 0 ? leftActionsWidth : 0,
        }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onTap={isOpen ? closeActions : undefined}
        className={cn(
          "relative bg-card border border-border rounded-xl shadow-sm",
          "cursor-grab active:cursor-grabbing",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
};

// Pre-configured action helpers
export const createCallAction = (phoneNumber: string, label = "Appeler"): SwipeAction => ({
  id: 'call',
  icon: Phone,
  label,
  color: 'primary',
  onClick: () => {
    window.location.href = `tel:${phoneNumber}`;
  },
});

export const createEmailAction = (email: string, label = "Email"): SwipeAction => ({
  id: 'email',
  icon: Mail,
  label,
  color: 'primary',
  onClick: () => {
    window.location.href = `mailto:${email}`;
  },
});

export const createDeleteAction = (onDelete: () => void, label = "Supprimer"): SwipeAction => ({
  id: 'delete',
  icon: Trash2,
  label,
  color: 'destructive',
  onClick: onDelete,
});

export const createMarkDoneAction = (onMarkDone: () => void, label = "Traité"): SwipeAction => ({
  id: 'markDone',
  icon: Check,
  label,
  color: 'muted',
  onClick: onMarkDone,
});

export default MobileSwipeCard;
