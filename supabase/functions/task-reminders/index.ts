import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due in next 24h or overdue, not done, not recently reminded
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, due_date, assigned_to, company_id, last_reminder_sent, assignee:profiles!tasks_assigned_to_fkey(email, first_name, last_name)')
      .not('status', 'eq', 'done')
      .not('assigned_to', 'is', null)
      .not('due_date', 'is', null)
      .lte('due_date', in24h.toISOString());

    if (error) throw error;

    let sent = 0;

    for (const task of (tasks || [])) {
      // Skip if reminder sent in last 20 hours
      if (task.last_reminder_sent) {
        const lastSent = new Date(task.last_reminder_sent);
        if (now.getTime() - lastSent.getTime() < 20 * 60 * 60 * 1000) continue;
      }

      const isOverdue = new Date(task.due_date) < now;
      const assignee = task.assignee as any;
      if (!assignee?.email) continue;

      const assigneeName = `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || 'Collaborateur';

      // Create in-app notification
      await supabase.from('task_notifications').insert({
        task_id: task.id,
        user_id: task.assigned_to,
        type: isOverdue ? 'overdue' : 'due_soon',
        message: isOverdue
          ? `La tâche "${task.title}" est en retard !`
          : `La tâche "${task.title}" arrive à échéance dans les prochaines heures`,
      });

      // Send email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: assignee.email,
            subject: isOverdue ? `⚠️ Tâche en retard : ${task.title}` : `📋 Rappel : ${task.title}`,
            html: `
              <h2>${isOverdue ? '⚠️ Tâche en retard' : '📋 Rappel de tâche'}</h2>
              <p>Bonjour ${assigneeName},</p>
              <p>La tâche <strong>"${task.title}"</strong> ${isOverdue ? 'est en retard' : 'arrive bientôt à échéance'}.</p>
              <p>Date d'échéance : ${new Date(task.due_date).toLocaleDateString('fr-FR')}</p>
            `,
          },
        });
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
      }

      // Update last_reminder_sent
      await supabase
        .from('tasks')
        .update({ last_reminder_sent: now.toISOString() })
        .eq('id', task.id);

      sent++;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Task reminders error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
