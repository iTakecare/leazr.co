-- Corriger les dernières erreurs RLS restantes

-- Tables manquantes identifiées dans le Security Advisor

-- 1. admin_pending_requests - Vue avec SECURITY DEFINER
-- Cette table est en fait une vue avec SECURITY DEFINER, donc pas besoin de RLS

-- 2. pdf_templates - Table pour les modèles PDF
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_templates_read_all" ON public.pdf_templates
FOR SELECT USING (true);
CREATE POLICY "pdf_templates_admin_write" ON public.pdf_templates
FOR ALL USING (public.is_admin());

-- 3. email_templates - Table pour les modèles d'emails
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates_admin_only" ON public.email_templates
FOR ALL USING (public.is_admin());