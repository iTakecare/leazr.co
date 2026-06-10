import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Nombre de conversations WhatsApp/SMS en attente de réponse (status =
// 'waiting' — un message entrant repasse toujours la conversation en
// waiting). Tenu à jour en realtime pour le badge de l'onglet Messagerie.
export function useMessagingUnread(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      const companyId = profile?.company_id;
      if (!companyId || cancelled) return;

      const refresh = async () => {
        const { count: c } = await supabase
          .from("chat_conversations")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "waiting")
          .in("channel", ["whatsapp", "sms"]);
        if (!cancelled) setCount(c ?? 0);
      };
      void refresh();

      channel = supabase
        .channel(`messaging_unread_${companyId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_conversations", filter: `company_id=eq.${companyId}` },
          () => void refresh(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return count;
}
