-- Notification admin (cloche) à chaque ticket support créé par un client.
-- L'email admin est envoyé par l'edge function notify-new-ticket (invoquée côté client).

CREATE OR REPLACE FUNCTION public.notify_admins_new_support_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
BEGIN
  IF NEW.created_by_client IS TRUE THEN
    SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
    INSERT INTO public.admin_notifications (company_id, type, title, message, metadata)
    VALUES (
      NEW.company_id,
      'support_ticket',
      'Nouveau ticket support',
      COALESCE(v_client_name, 'Un client') || ' : ' || NEW.subject,
      jsonb_build_object(
        'ticket_id', NEW.id,
        'client_id', NEW.client_id,
        'category', NEW.category,
        'priority', NEW.priority
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_support_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_new_support_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_support_ticket();
