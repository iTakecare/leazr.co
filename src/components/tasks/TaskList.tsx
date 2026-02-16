import React from "react";
import { Task, TaskStatus } from "@/services/taskService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TaskRelatedLinks from "./TaskRelatedLinks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Basse", className: "bg-muted text-muted-foreground" },
  medium: { label: "Moyenne", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  high: { label: "Haute", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  urgent: { label: "Urgente", className: "bg-destructive/10 text-destructive" },
};

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

const getAssigneeName = (task: Task) => {
  if (!task.assignee) return "—";
  const { first_name, last_name, email } = task.assignee;
  if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim();
  return email || "—";
};

const TaskList = ({ tasks, isLoading, onEdit, onDelete, onStatusChange }: TaskListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Aucune tâche trouvée</p>
        <p className="text-sm mt-1">Créez votre première tâche pour commencer</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Assigné à</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Échéance</TableHead>
            <TableHead>Lien</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="cursor-pointer" onClick={() => onEdit(task)}>
              <TableCell className="font-medium max-w-[250px]">
                <div className="flex items-center gap-2">
                  <span className="truncate">{task.title}</span>
                  {task.subtask_count != null && task.subtask_count > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                      <CheckSquare className="h-3 w-3" />
                      {task.subtask_completed}/{task.subtask_count}
                    </span>
                  )}
                </div>
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[9px] px-1.5 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm">{getAssigneeName(task)}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={priorityConfig[task.priority]?.className}>
                  {priorityConfig[task.priority]?.label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr }) : '—'}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <TaskRelatedLinks task={task} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Select
                  value={task.status}
                  onValueChange={(val) => onStatusChange(task.id, val as TaskStatus)}
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">À faire</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="done">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Pencil className="h-4 w-4 mr-2" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskList;
