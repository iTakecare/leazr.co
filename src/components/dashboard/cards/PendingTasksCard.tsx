import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, FileWarning, Bell, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PendingTask } from '@/services/commercialDashboardService';
import { Link, useLocation } from 'react-router-dom';

interface PendingTasksCardProps {
  tasks: PendingTask[];
  isLoading: boolean;
}

const getTaskIcon = (type: string) => {
  switch (type) {
    case 'docs_pending':
      return FileWarning;
    case 'follow_up':
      return Bell;
    case 'blocked':
      return AlertTriangle;
    default:
      return ClipboardList;
  }
};

const getTaskStyle = (type: string, priority: string) => {
  if (priority === 'high') {
    return {
      bg: 'bg-rose-50',
      icon: 'bg-rose-100 text-rose-600',
      border: 'border-l-rose-500'
    };
  }
  
  switch (type) {
    case 'docs_pending':
      return {
        bg: 'bg-amber-50/50',
        icon: 'bg-amber-100 text-amber-600',
        border: 'border-l-amber-500'
      };
    case 'follow_up':
      return {
        bg: 'bg-blue-50/50',
        icon: 'bg-blue-100 text-blue-600',
        border: 'border-l-blue-500'
      };
    case 'blocked':
      return {
        bg: 'bg-rose-50/50',
        icon: 'bg-rose-100 text-rose-600',
        border: 'border-l-rose-500'
      };
    default:
      return {
        bg: 'bg-slate-50',
        icon: 'bg-slate-100 text-slate-600',
        border: 'border-l-slate-500'
      };
  }
};

const getTaskTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'docs_pending': 'Documents',
    'follow_up': 'Relance',
    'blocked': 'Bloqué'
  };
  return labels[type] || type;
};

export const PendingTasksCard = ({ tasks, isLoading }: PendingTasksCardProps) => {
  const location = useLocation();
  const companySlug = location.pathname.split('/')[1];

  // Grouper les tâches par type
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.type]) {
      acc[task.type] = [];
    }
    acc[task.type].push(task);
    return acc;
  }, {} as Record<string, PendingTask[]>);

  const taskCounts = {
    docs_pending: groupedTasks.docs_pending?.length || 0,
    follow_up: groupedTasks.follow_up?.length || 0,
    blocked: groupedTasks.blocked?.length || 0
  };

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-500" />
            Tâches en Attente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTasks = tasks.length;

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          Tâches en Attente
          {totalTasks > 0 && (
            <span className="ml-auto text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {totalTasks}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalTasks === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              ✓ Aucune tâche en attente
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Résumé par type */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(taskCounts).map(([type, count]) => {
                if (count === 0) return null;
                const style = getTaskStyle(type, 'medium');
                const Icon = getTaskIcon(type);
                return (
                  <div 
                    key={type}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg",
                      style.bg
                    )}
                  >
                    <div className={cn("p-1 rounded", style.icon)}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{count}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {getTaskTypeLabel(type)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Liste détaillée des tâches prioritaires */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {tasks.slice(0, 5).map((task) => {
                const style = getTaskStyle(task.type, task.priority);
                const Icon = getTaskIcon(task.type);
                
                return (
                  <Link
                    key={task.id}
                    to={`/${companySlug}${task.link}`}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg border-l-2 transition-colors group",
                      style.bg,
                      style.border,
                      "hover:bg-slate-100"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg shrink-0", style.icon)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.client_name}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingTasksCard;
