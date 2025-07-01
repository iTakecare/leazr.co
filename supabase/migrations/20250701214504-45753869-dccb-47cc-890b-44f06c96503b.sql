-- S'assurer que le modèle PDF par défaut existe
INSERT INTO public.pdf_templates (
  id,
  name,
  "companyName",
  "companyAddress", 
  "companyContact",
  "companySiret",
  "logoURL",
  "primaryColor",
  "secondaryColor",
  "headerText",
  "footerText",
  "templateImages",
  fields
) VALUES (
  'default',
  'Modèle par défaut',
  'iTakeCare',
  'Avenue du Général Michel 1E, 6000 Charleroi, Belgique',
  'Tel: +32 471 511 121 - Email: hello@itakecare.be',
  'TVA: BE 0795.642.894',
  '',
  '#2C3E50',
  '#3498DB',
  'OFFRE N° {offer_id}',
  'Cette offre est valable 30 jours à compter de sa date d''émission.',
  '[]'::jsonb,
  '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "companyName" = EXCLUDED."companyName",
  "companyAddress" = EXCLUDED."companyAddress",
  "companyContact" = EXCLUDED."companyContact",
  "companySiret" = EXCLUDED."companySiret",
  "primaryColor" = EXCLUDED."primaryColor",
  "secondaryColor" = EXCLUDED."secondaryColor",
  "headerText" = EXCLUDED."headerText",
  "footerText" = EXCLUDED."footerText",
  "templateImages" = EXCLUDED."templateImages",
  fields = EXCLUDED.fields;

-- Améliorer les politiques RLS pour permettre la lecture à tous et l'écriture aux admins uniquement
DROP POLICY IF EXISTS "Admin manage pdf_templates" ON public.pdf_templates;
DROP POLICY IF EXISTS "Public read pdf_templates" ON public.pdf_templates;

-- Politique de lecture publique
CREATE POLICY "Public read pdf_templates" 
ON public.pdf_templates 
FOR SELECT 
USING (true);

-- Politique d'écriture pour les admins
CREATE POLICY "Admin manage pdf_templates" 
ON public.pdf_templates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);