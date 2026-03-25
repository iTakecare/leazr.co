import React, { useState } from "react";
import { Plus, Bell, CheckCheck, Clock, AlertCircle, Circle, CheckSquare2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { type Task, type TaskStatus, type TaskPriority } from "@/services/taskService";
import { useTasks, useTaskMutations } from "@/hooks/useTasks";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import TaskDialog from "@/components/tasks/TaskDialog";
import MobileLayout from "../MobileLayout";
import MobileFAB from "../MobileFAB";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const priorityConfig: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low:    { label: "Basse",   color: "text-slate-500",    dot: "bg-slate-400" },
  medium: { label: "Moyenne", color: "text-blue-600",     dot: "bg-blue-500" },
  high:   { label: "Haute",   color: "text-orange-600",   dot: "bg-orange-500" },
  urgent: { label: "Urgente", color: "text-destructive",  dot: "bg-destructive" },
};

const statusConfig: Record<TaskStatus, { label: string; icon: React.FC<{ className?: string }> }> = {
  todo:        { label: "À faire",    icon: Circle },
  in_progress: { label: "En cours",   icon: Clock },
  done:        { label: "Terminée",   icon: CheckSquare2 },
};

const MobileTaskCard: React.FC<{
  task: Task;
  onEdit: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}> = ({ task, onEdit, onStatusChange }) => {
  const prio = priorityConfig[task.priority];
  const stat = statusConfig[task.status];
  const StatusIcon = stat.icon;

  const isDue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  const isDueToday = task.due_date && isToday(new Date(task.due_date)) && task.status !== 'done';

  const getNextStatus = (current: TaskStatus): TaskStatus => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'done';
    return 'todo';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border rounded-xl p-3 shadow-sm active:scale-[0.99] transition-transform",
        task.status === 'done' && "opacity-60",
        isDue && "border-destructive/40"
      )}
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-2.5">
        {/* Status toggle */}
        <button
          className={cn(
            "mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
            task.status === 'done'
              ? "bg-emerald-500 border-emerald-500 text-white"
              : task.status === 'in_progress'
              ? "border-blue-500 text-blue-500"
              : "border-slate-300 text-slate-300"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(task.id, getNextStatus(task.status));
          }}
        >
          {task.status === 'done' && <CheckCheck className="h-3 w-3" />}
          {task.status === 'in_progress' && <Clock className="h-2.5 w-2.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium leading-tight",
            task.status === 'done' && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority dot */}
            <span className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full shrink-0", prio.dot)} />
              <span className={cn("text-[11px]", prio.color)}>{prio.label}</span>
            </span>

            {/* Due date */}
            {task.due_date && (
              <span className={cn(
                "text-[11px] flex items-center gap-0.5",
                isDue ? "text-destructive font-medium" : isDueToday ? "text-orange-500 font-medium" : "text-muted-foreground"
              )}>
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: fr })}
              </span>
            )}

            {/* Assignee */}
            {task.assignee && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                {task.assignee.first_name || task.assignee.email?.split('@')[0] || '?'}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <span className={cn(
          "text-[10px] shrink-0 px-1.5 py-0.5 rounded-full font-medium",
          task.status === 'done' ? "bg-emerald-100 text-emerald-700" :
          task.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
          "bg-slate-100 text-slate-600"
        )}>
          {stat.label}
        </span>
      </div>
    </motion.div>
  );
};

const MobileTasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'done'>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useTasks({});
  const { create, update, remove } = useTaskMutations();
  const { notifications, unreadCount, markAllRead } = useTaskNotifications();

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const urgentCount = activeTasks.filter(t => t.priority === 'urgent').length;
  const overdueCount = activeTasks.filter(t => t.due_date && isPast(new Date(t.due_date))).length;

  const displayedTasks = activeTab === 'done' ? doneTasks : activeTasks;

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  return (
    <MobileLayout title="Tâches">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Tâches</h1>
            <p className="text-sm text-muted-foreground">
              {activeTasks.length} en cours
              {overdueCount > 0 && ` · ${overdueCount} en retard`}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2.5 py-1.5 rounded-full font-medium"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadCount} notif.
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activeTasks.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">En cours</p>
          </div>
          <div className={cn("border rounded-xl p-3 text-center", urgentCount > 0 ? "bg-destructive/5 border-destructive/30" : "bg-card")}>
            <p className={cn("text-2xl font-bold", urgentCount > 0 ? "text-destructive" : "text-foreground")}>{urgentCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Urgentes</p>
          </div>
          <div className={cn("border rounded-xl p-3 text-center", overdueCount > 0 ? "bg-orange-50 border-orange-200" : "bg-card")}>
            <p className={cn("text-2xl font-bold", overdueCount > 0 ? "text-orange-600" : "text-foreground")}>{overdueCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">En retard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/60 rounded-full p-0.5 border border-border/40">
          {([
            { id: 'active', label: 'En cours', count: activeTasks.length },
            { id: 'done', label: 'Terminées', count: doneTasks.length },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-7 px-3 text-xs rounded-full transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task list */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {activeTab === 'done' ? "Aucune tâche terminée" : "Aucune tâche en cours"}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {displayedTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <MobileTaskCard
                    task={task}
                    onEdit={handleEdit}
                    onStatusChange={(id, status) => update.mutate({ id, status })}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      <MobileFAB
        primaryAction={{
          id: 'create-task',
          icon: Plus,
          label: 'Nouvelle tâche',
          onClick: handleCreate,
        }}
      />

      {/* Task dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSubmit={(data) => {
          if (editingTask) {
            update.mutate({ id: editingTask.id, ...data });
          } else {
            create.mutate(data);
          }
          setDialogOpen(false);
        }}
      />
    </MobileLayout>
  );
};

export default MobileTasksPage;
