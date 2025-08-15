-- Fix security warnings: Add RLS policies for modules table
CREATE POLICY "modules_public_read" ON public.modules
  FOR SELECT USING (true);

CREATE POLICY "modules_admin_manage" ON public.modules
  FOR ALL USING (is_saas_admin())
  WITH CHECK (is_saas_admin());