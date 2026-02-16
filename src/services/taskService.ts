import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

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
  recurrence_type: RecurrenceType | null;
  recurrence_end_date: string | null;
  parent_task_id: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined data
  creator?: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null };
  assignee?: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null };
  client?: { name: string } | null;
  contract?: { id: string } | null;
  offer?: { id: string; equipment_description: string | null } | null;
  // Virtual fields (loaded separately)
  subtask_count?: number;
  subtask_completed?: number;
  tags?: TaskTag[];
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigned_to?: string | 'all';
  related_client_id?: string;
  search?: string;
  tag_id?: string;
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
  recurrence_type?: RecurrenceType;
  recurrence_end_date?: string;
  template_id?: string;
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
}

export interface TaskTag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskTemplate {
  id: string;
  company_id: string;
  name: string;
  title: string;
  description: string | null;
  priority: string;
  subtasks: { title: string }[];
  tags: string[];
  created_by: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: { first_name: string | null; last_name: string | null; avatar_url: string | null };
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

  let tasks = (data || []) as unknown as Task[];

  // Load subtask counts and tags for all tasks
  if (tasks.length > 0) {
    const taskIds = tasks.map(t => t.id);

    // Subtask counts
    const { data: subtasks } = await supabase
      .from('task_subtasks')
      .select('task_id, is_completed')
      .in('task_id', taskIds);

    const subtaskMap: Record<string, { total: number; completed: number }> = {};
    (subtasks || []).forEach((s: any) => {
      if (!subtaskMap[s.task_id]) subtaskMap[s.task_id] = { total: 0, completed: 0 };
      subtaskMap[s.task_id].total++;
      if (s.is_completed) subtaskMap[s.task_id].completed++;
    });

    // Tag assignments
    const { data: tagAssignments } = await supabase
      .from('task_tag_assignments')
      .select('task_id, tag_id')
      .in('task_id', taskIds);

    const tagIds = [...new Set((tagAssignments || []).map((a: any) => a.tag_id))];
    let tagsMap: Record<string, TaskTag> = {};
    if (tagIds.length > 0) {
      const { data: tags } = await supabase
        .from('task_tags')
        .select('*')
        .in('id', tagIds);
      (tags || []).forEach((t: any) => { tagsMap[t.id] = t; });
    }

    const taskTagsMap: Record<string, TaskTag[]> = {};
    (tagAssignments || []).forEach((a: any) => {
      if (!taskTagsMap[a.task_id]) taskTagsMap[a.task_id] = [];
      if (tagsMap[a.tag_id]) taskTagsMap[a.task_id].push(tagsMap[a.tag_id]);
    });

    tasks = tasks.map(t => ({
      ...t,
      subtask_count: subtaskMap[t.id]?.total || 0,
      subtask_completed: subtaskMap[t.id]?.completed || 0,
      tags: taskTagsMap[t.id] || [],
    }));

    // Filter by tag if needed
    if (filters?.tag_id) {
      tasks = tasks.filter(t => t.tags?.some(tag => tag.id === filters.tag_id));
    }
  }

  return tasks;
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
    .select('id, first_name, last_name, email, avatar_url, role')
    .eq('company_id', companyId)
    .in('role', ['admin', 'super_admin']);
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

// === SUBTASKS ===

export async function fetchSubtasks(taskId: string): Promise<TaskSubtask[]> {
  const { data, error } = await supabase
    .from('task_subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as TaskSubtask[];
}

export async function addSubtask(taskId: string, title: string, position: number): Promise<TaskSubtask> {
  const { data, error } = await supabase
    .from('task_subtasks')
    .insert({ task_id: taskId, title, position })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as TaskSubtask;
}

export async function toggleSubtask(id: string, isCompleted: boolean): Promise<void> {
  const { error } = await supabase
    .from('task_subtasks')
    .update({ is_completed: isCompleted })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_subtasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// === TAGS ===

export async function fetchCompanyTags(companyId: string): Promise<TaskTag[]> {
  const { data, error } = await supabase
    .from('task_tags')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data || []) as unknown as TaskTag[];
}

export async function createTag(companyId: string, name: string, color: string): Promise<TaskTag> {
  const { data, error } = await supabase
    .from('task_tags')
    .insert({ company_id: companyId, name, color })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as TaskTag;
}

export async function assignTagToTask(taskId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('task_tag_assignments')
    .insert({ task_id: taskId, tag_id: tagId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function removeTagFromTask(taskId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('task_tag_assignments')
    .delete()
    .eq('task_id', taskId)
    .eq('tag_id', tagId);
  if (error) throw error;
}

export async function fetchTaskTagIds(taskId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('task_tag_assignments')
    .select('tag_id')
    .eq('task_id', taskId);
  if (error) throw error;
  return (data || []).map((d: any) => d.tag_id);
}

// === COMMENTS ===

export async function fetchComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, user:profiles!task_comments_user_id_fkey(first_name, last_name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as TaskComment[];
}

export async function addComment(taskId: string, userId: string, content: string): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, user_id: userId, content })
    .select('*, user:profiles!task_comments_user_id_fkey(first_name, last_name, avatar_url)')
    .single();
  if (error) throw error;
  return data as unknown as TaskComment;
}

// === TEMPLATES ===

export async function fetchTemplates(companyId: string): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data || []) as unknown as TaskTemplate[];
}

export async function createTemplate(input: Omit<TaskTemplate, 'id' | 'created_at'>): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('task_templates')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as TaskTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// === CLIENT DOSSIERS ===

export async function fetchClientContracts(clientId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select('id, client_name, leaser_name, monthly_payment, status')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function fetchClientOffers(clientId: string) {
  const { data, error } = await supabase
    .from('offers')
    .select('id, equipment_description, amount, status, monthly_payment, created_at, workflow_status, client_name')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}
