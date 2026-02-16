import React, { useState } from "react";
import { Task } from "@/services/taskService";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

const priorityColors: Record<string, string> = {
  low: 'bg-muted',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-destructive',
};

interface TaskCalendarProps {
  tasks: Task[];
  isLoading: boolean;
  onEdit: (task: Task) => void;
}

const TaskCalendar = ({ tasks, isLoading, onEdit }: TaskCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const tasksWithDueDate = tasks.filter(t => t.due_date);

  const datesWithTasks = new Set(
    tasksWithDueDate.map(t => format(new Date(t.due_date!), 'yyyy-MM-dd'))
  );

  const selectedDayTasks = selectedDate
    ? tasksWithDueDate.filter(t => isSameDay(new Date(t.due_date!), selectedDate))
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={fr}
          className={cn("p-3 pointer-events-auto border rounded-lg")}
          modifiers={{
            hasTasks: (date) => datesWithTasks.has(format(date, 'yyyy-MM-dd')),
          }}
          modifiersClassNames={{
            hasTasks: 'bg-primary/10 font-bold',
          }}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">
          {selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }) : 'Sélectionner un jour'}
        </h3>

        {selectedDayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune tâche ce jour</p>
        ) : (
          selectedDayTasks.map((task) => {
            const assigneeName = task.assignee
              ? `${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim()
              : null;

            return (
              <div
                key={task.id}
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onEdit(task)}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                  <span className="text-sm font-medium flex-1">{task.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {task.status === 'todo' ? 'À faire' : task.status === 'in_progress' ? 'En cours' : 'Terminée'}
                  </Badge>
                </div>
                {assigneeName && (
                  <p className="text-xs text-muted-foreground mt-1 ml-4">{assigneeName}</p>
                )}
                {task.subtask_count && task.subtask_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                    Sous-tâches: {task.subtask_completed}/{task.subtask_count}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskCalendar;
