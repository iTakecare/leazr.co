import React, { useState } from "react";
import { useTasks, useTaskMutations } from "@/hooks/useTasks";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import TaskList from "@/components/tasks/TaskList";
import TaskKanban from "@/components/tasks/TaskKanban";
import TaskDialog from "@/components/tasks/TaskDialog";
import TaskFilters from "@/components/tasks/TaskFilters";
import { Button } from "@/components/ui/button";
import { Plus, List, Columns3, Bell, CheckCheck } from "lucide-react";
import { type TaskFilters as TaskFiltersType, type Task } from "@/services/taskService";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const Tasks = () => {
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useTasks(filters);
  const { create, update, remove } = useTaskMutations();
  const { notifications, unreadCount, markRead, markAllRead } = useTaskNotifications();

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tâches</h1>
          <p className="text-sm text-muted-foreground">Gérez et assignez des tâches à votre équipe</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs">
                    <CheckCheck className="h-3 w-3 mr-1" /> Tout marquer lu
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-64">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">Aucune notification</p>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={`w-full text-left p-2 rounded text-sm hover:bg-muted transition-colors ${
                        !n.is_read ? 'bg-primary/5 font-medium' : ''
                      }`}
                    >
                      <p className="line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </button>
                  ))
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* View toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4 mr-1" /> Liste
            </Button>
            <Button
              variant={view === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
              className="rounded-l-none"
            >
              <Columns3 className="h-4 w-4 mr-1" /> Kanban
            </Button>
          </div>

          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
          </Button>
        </div>
      </div>

      {/* Filters */}
      <TaskFilters filters={filters} onFiltersChange={setFilters} />

      {/* Content */}
      {view === 'list' ? (
        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={(id) => remove.mutate(id)}
          onStatusChange={(id, status) => update.mutate({ id, status })}
        />
      ) : (
        <TaskKanban
          tasks={tasks}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={(id) => remove.mutate(id)}
          onStatusChange={(id, status) => update.mutate({ id, status })}
        />
      )}

      {/* Dialog */}
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
    </div>
  );
};

export default Tasks;
