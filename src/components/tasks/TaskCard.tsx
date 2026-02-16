import React from "react";
import { Task } from "@/services/taskService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TaskRelatedLinks from "./TaskRelatedLinks";

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Basse", className: "bg-muted text-muted-foreground" },
  medium: { label: "Moyenne", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  high: { label: "Haute", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  urgent: { label: "Urgente", className: "bg-destructive/10 text-destructive" },
};

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskCard = ({ task, onEdit, onDelete }: TaskCardProps) => {
  const assigneeName = task.assignee
    ? `${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim() || task.assignee.email
    : null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div
      className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow group"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">{task.title}</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <Badge variant="secondary" className={`text-[10px] ${priorityConfig[task.priority]?.className}`}>
          {priorityConfig[task.priority]?.label}
        </Badge>

        {task.due_date && (
          <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            <Calendar className="h-3 w-3" />
            {format(new Date(task.due_date), 'dd MMM', { locale: fr })}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        {assigneeName && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" />
            {assigneeName}
          </span>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <TaskRelatedLinks task={task} compact />
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
