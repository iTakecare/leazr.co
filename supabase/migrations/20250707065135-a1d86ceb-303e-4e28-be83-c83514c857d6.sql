-- Mise à jour de la fonction is_company_chat_available pour gérer le fuseau horaire européen
CREATE OR REPLACE FUNCTION public.is_company_chat_available(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_day INTEGER;
  time_now TIME;
  agent_online BOOLEAN;
  hours_available BOOLEAN;
BEGIN
  -- Obtenir le jour de la semaine et l'heure en fuseau horaire Europe/Paris
  SELECT 
    EXTRACT(DOW FROM NOW() AT TIME ZONE 'Europe/Paris'),
    (NOW() AT TIME ZONE 'Europe/Paris')::TIME
  INTO current_day, time_now;
  
  -- Vérifier si un agent est en ligne et disponible
  SELECT EXISTS (
    SELECT 1 FROM public.chat_agent_status 
    WHERE company_id = p_company_id 
    AND is_online = true 
    AND is_available = true
  ) INTO agent_online;
  
  -- Vérifier si l'heure actuelle est dans les créneaux de disponibilité
  SELECT EXISTS (
    SELECT 1 FROM public.chat_availability_hours
    WHERE company_id = p_company_id
    AND day_of_week = current_day
    AND start_time <= time_now
    AND end_time >= time_now
    AND is_active = true
  ) INTO hours_available;
  
  -- Retourner true seulement si les deux conditions sont remplies
  -- OU si aucun créneau horaire n'est configuré (disponible 24/7)
  RETURN agent_online AND (hours_available OR NOT EXISTS (
    SELECT 1 FROM public.chat_availability_hours 
    WHERE company_id = p_company_id AND is_active = true
  ));
END;
$function$;