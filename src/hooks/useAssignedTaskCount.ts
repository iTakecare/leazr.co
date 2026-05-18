import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Nombre de tâches non terminées (À faire + En cours) assignées à l'utilisateur courant.
export function useAssignedTaskCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      const { count: taskCount, error } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .neq('status', 'done');

      if (!error) setCount(taskCount ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel('assigned-task-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
