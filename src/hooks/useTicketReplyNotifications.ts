import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from "@/hooks/useMultiTenant";

interface UseTicketReplyNotificationsOptions {
  role: "admin" | "client";
  clientId?: string | null;
}

export const useTicketReplyNotifications = ({ role, clientId }: UseTicketReplyNotificationsOptions) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { companyId } = useMultiTenant();

  const fetchUnreadCount = useCallback(async () => {
    if (!companyId) return;

    if (role === "admin") {
      // Admin wants to see unread client replies
      const { count, error } = await supabase
        .from("ticket_replies")
        .select("id, support_tickets!inner(company_id)", { count: "exact", head: true })
        .eq("sender_type", "client")
        .eq("is_read_by_admin", false)
        .eq("support_tickets.company_id", companyId);
      if (!error) setUnreadCount(count || 0);
    } else if (role === "client" && clientId) {
      // Client wants to see unread admin replies
      const { count, error } = await supabase
        .from("ticket_replies")
        .select("id, support_tickets!inner(client_id)", { count: "exact", head: true })
        .eq("sender_type", "admin")
        .eq("is_read_by_client", false)
        .eq("support_tickets.client_id", clientId);
      if (!error) setUnreadCount(count || 0);
    }
  }, [companyId, role, clientId]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("ticket-replies-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_replies" },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ticket_replies" },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount]);

  const markRepliesAsRead = useCallback(async (ticketId: string) => {
    if (role === "admin") {
      await supabase
        .from("ticket_replies")
        .update({ is_read_by_admin: true } as any)
        .eq("ticket_id", ticketId)
        .eq("sender_type", "client")
        .eq("is_read_by_admin", false);
    } else {
      await supabase
        .from("ticket_replies")
        .update({ is_read_by_client: true } as any)
        .eq("ticket_id", ticketId)
        .eq("sender_type", "admin")
        .eq("is_read_by_client", false);
    }
    fetchUnreadCount();
  }, [role, fetchUnreadCount]);

  return { unreadCount, markRepliesAsRead };
};
