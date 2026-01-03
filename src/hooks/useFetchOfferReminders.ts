import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OfferReminderRecord {
  id: string;
  offer_id: string;
  reminder_type: string;
  reminder_level: number;
  sent_at: string | null;
  created_at: string;
  sent_by: string | null;
  custom_message: string | null;
  email_subject: string | null;
  recipient_email: string | null;
}

export const useFetchOfferReminders = (offerIds?: string[]) => {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['offer-reminders', offerIds?.join(',')],
    queryFn: async () => {
      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return [];

      // Fetch reminders for offers belonging to user's company
      let query = supabase
        .from('offer_reminders')
        .select(`
          id,
          offer_id,
          reminder_type,
          reminder_level,
          sent_at,
          created_at,
          sent_by,
          custom_message,
          email_subject,
          recipient_email
        `)
        .order('created_at', { ascending: false });

      // If specific offer IDs provided, filter by them
      if (offerIds && offerIds.length > 0) {
        query = query.in('offer_id', offerIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching offer reminders:", error);
        throw error;
      }

      return (data || []) as OfferReminderRecord[];
    },
    enabled: true,
    staleTime: 30000, // 30 seconds
  });

  const invalidateReminders = () => {
    queryClient.invalidateQueries({ queryKey: ['offer-reminders'] });
  };

  return {
    reminders,
    isLoading,
    error,
    refetch,
    invalidateReminders,
  };
};
