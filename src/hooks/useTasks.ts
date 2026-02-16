import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { useAuth } from "@/context/AuthContext";
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  createTaskNotification,
  sendTaskAssignmentEmail,
  fetchCompanyProfiles,
  type TaskFilters,
  type CreateTaskInput,
  type TaskStatus,
} from "@/services/taskService";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

export function useTasks(filters?: TaskFilters) {
  const { companyId } = useMultiTenant();

  return useQuery({
    queryKey: ['tasks', companyId, filters],
    queryFn: () => fetchTasks(companyId!, filters),
    enabled: !!companyId,
  });
}

export function useCompanyProfiles() {
  const { companyId } = useMultiTenant();
  return useQuery({
    queryKey: ['company-profiles', companyId],
    queryFn: () => fetchCompanyProfiles(companyId!),
    enabled: !!companyId,
  });
}

export function useTaskMutations() {
  const queryClient = useQueryClient();
  const { companyId } = useMultiTenant();
  const { user } = useAuth();
  const location = useLocation();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const getCompanySlug = () => {
    const match = location.pathname.match(/^\/([^\/]+)\/admin/);
    return match?.[1] || '';
  };

  const create = useMutation({
    mutationFn: async (input: Omit<CreateTaskInput, 'company_id' | 'created_by'>) => {
      if (!companyId || !user) throw new Error('Missing context');
      const task = await createTask({
        ...input,
        company_id: companyId,
        created_by: user.id,
      });

      // Notification + email if assigned to someone else
      if (input.assigned_to && input.assigned_to !== user.id) {
        const userName = user.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : user.email || 'Un collaborateur';

        await createTaskNotification(
          task.id,
          input.assigned_to,
          'assigned',
          `${userName} vous a assigné la tâche "${input.title}"`
        );

        // Send email
        if (task.assignee?.email) {
          const slug = getCompanySlug();
          const taskUrl = `${window.location.origin}/${slug}/admin/tasks`;
          await sendTaskAssignmentEmail(
            task.assignee.email,
            input.title,
            input.description,
            userName,
            taskUrl
          );
        }
      }

      return task;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tâche créée avec succès");
    },
    onError: (err: Error) => {
      toast.error("Erreur lors de la création: " + err.message);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateTaskInput> & { status?: TaskStatus }) => {
      return updateTask(id, updates);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tâche mise à jour");
    },
    onError: (err: Error) => {
      toast.error("Erreur: " + err.message);
    },
  });

  const remove = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      invalidate();
      toast.success("Tâche supprimée");
    },
    onError: (err: Error) => {
      toast.error("Erreur: " + err.message);
    },
  });

  return { create, update, remove };
}
