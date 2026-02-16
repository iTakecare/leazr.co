import React from "react";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";

const TaskNotificationBadge = () => {
  const { unreadCount } = useTaskNotifications();

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-0.5 text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
};

export default TaskNotificationBadge;
