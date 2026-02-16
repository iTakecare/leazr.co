import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  related_client_id: string | null;
  related_contract_id: string | null;
  related_offer_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined data
  creator?: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null };
  assignee?: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null };
  client?: { name: string } | null;
  contract?: { id: string } | null;
  offer?: { id: string; equipment_description: string | null } | null;
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigned_to?: string | 'all';
  related_client_id?: string;
  search?: string;
}

export interface CreateTaskInput {
  company_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  created_by: string;
  assigned_to?: string;
  due_date?: string;
  related_client_id?: string;
  related_contract_id?: string;
  related_offer_id?: string;
}

const TASK_SELECT = `
  *,
  creator:profiles!tasks_created_by_fkey(first_name, last_name, email, avatar_url),
  assignee:profiles!tasks_assigned_to_fkey(first_name, last_name, email, avatar_url),
  client:clients!tasks_related_client_id_fkey(name),
  contract:contracts!tasks_related_contract_id_fkey(id),
  offer:offers!tasks_related_offer_id_fkey(id, equipment_description)
`;

export async function fetchTasks(companyId: string, filters?: TaskFilters): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority && filters.priority !== 'all') {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.assigned_to && filters.assigned_to !== 'all') {
    query = query.eq('assigned_to', filters.assigned_to);
  }
  if (filters?.related_client_id) {
    query = query.eq('related_client_id', filters.related_client_id);
  }
  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Task[];
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(input)
    .select(TASK_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Task;
}

export async function updateTask(id: string, updates: Partial<CreateTaskInput> & { status?: TaskStatus }): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select(TASK_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Task;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function createTaskNotification(
  taskId: string,
  userId: string,
  type: string,
  message: string
): Promise<void> {
  const { error } = await supabase
    .from('task_notifications')
    .insert({ task_id: taskId, user_id: userId, type, message });
  if (error) throw error;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('task_notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function fetchCompanyProfiles(companyId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .eq('company_id', companyId);
  if (error) throw error;
  return data || [];
}

export async function sendTaskAssignmentEmail(
  assigneeEmail: string,
  taskTitle: string,
  taskDescription: string | undefined,
  assignerName: string,
  taskUrl: string
) {
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: assigneeEmail,
      subject: `Nouvelle tâche assignée : ${taskTitle}`,
      html: `
        <h2>Une nouvelle tâche vous a été assignée</h2>
        <p><strong>${assignerName}</strong> vous a assigné la tâche suivante :</p>
        <h3>${taskTitle}</h3>
        ${taskDescription ? `<p>${taskDescription}</p>` : ''}
        <p><a href="${taskUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">Voir la tâche</a></p>
      `
    }
  });
  if (error) console.error('Failed to send task email:', error);
}
