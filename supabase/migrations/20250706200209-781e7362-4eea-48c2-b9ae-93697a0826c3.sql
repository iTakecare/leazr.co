-- Create chat availability hours table
CREATE TABLE IF NOT EXISTS public.chat_availability_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policy for chat availability hours
ALTER TABLE public.chat_availability_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_availability_hours_company_access" 
ON public.chat_availability_hours 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Create function to check if company is currently available
CREATE OR REPLACE FUNCTION public.is_company_chat_available(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_day INTEGER;
  time_now TIME;
  agent_online BOOLEAN;
  hours_available BOOLEAN;
BEGIN
  -- Get current day of week (0 = Sunday)
  current_day := EXTRACT(DOW FROM NOW());
  -- Get current time
  time_now := NOW()::TIME;
  
  -- Check if any agent is online and available
  SELECT EXISTS (
    SELECT 1 FROM public.chat_agent_status 
    WHERE company_id = p_company_id 
    AND is_online = true 
    AND is_available = true
  ) INTO agent_online;
  
  -- Check if current time is within availability hours
  SELECT EXISTS (
    SELECT 1 FROM public.chat_availability_hours
    WHERE company_id = p_company_id
    AND day_of_week = current_day
    AND start_time <= time_now
    AND end_time >= time_now
    AND is_active = true
  ) INTO hours_available;
  
  -- Return true only if both conditions are met
  RETURN agent_online AND (hours_available OR NOT EXISTS (
    SELECT 1 FROM public.chat_availability_hours 
    WHERE company_id = p_company_id AND is_active = true
  ));
END;
$$;