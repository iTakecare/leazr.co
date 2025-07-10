-- Migration d'optimisation RLS complète pour éliminer tous les warnings de performance
-- Remplace tous les appels directs aux fonctions auth par des sous-requêtes optimisées

-- OFFERS - Principales politiques problématiques
DROP POLICY IF EXISTS "Company members can manage their offers" ON public.offers;
CREATE POLICY "Company members can manage their offers" 
ON public.offers 
FOR ALL 
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  )
) 
WITH CHECK (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
CREATE POLICY "Users can manage their own offers" 
ON public.offers 
FOR ALL 
USING (user_id = (SELECT auth.uid())) 
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;
CREATE POLICY "Admin full access to offers" 
ON public.offers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;
CREATE POLICY "Public can view signed offers" 
ON public.offers 
FOR SELECT 
USING (
  workflow_status = ANY (ARRAY['sent'::text, 'approved'::text])
);

-- OFFER EQUIPMENT
DROP POLICY IF EXISTS "offer_equipment_company_access" ON public.offer_equipment;
CREATE POLICY "offer_equipment_company_access" 
ON public.offer_equipment 
FOR ALL 
USING (
  offer_id IN (
    SELECT offers.id
    FROM offers
    WHERE offers.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- OFFER EQUIPMENT ATTRIBUTES
DROP POLICY IF EXISTS "offer_equipment_attributes_company_access" ON public.offer_equipment_attributes;
CREATE POLICY "offer_equipment_attributes_company_access" 
ON public.offer_equipment_attributes 
FOR ALL 
USING (
  equipment_id IN (
    SELECT oe.id
    FROM offer_equipment oe
    JOIN offers o ON oe.offer_id = o.id
    WHERE o.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- OFFER EQUIPMENT SPECIFICATIONS
DROP POLICY IF EXISTS "offer_equipment_specifications_company_access" ON public.offer_equipment_specifications;
CREATE POLICY "offer_equipment_specifications_company_access" 
ON public.offer_equipment_specifications 
FOR ALL 
USING (
  equipment_id IN (
    SELECT oe.id
    FROM offer_equipment oe
    JOIN offers o ON oe.offer_id = o.id
    WHERE o.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- OFFER DOCUMENTS
DROP POLICY IF EXISTS "Admins can view all documents" ON public.offer_documents;
CREATE POLICY "Admins can view all documents" 
ON public.offer_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

DROP POLICY IF EXISTS "Admins can update document status" ON public.offer_documents;
CREATE POLICY "Admins can update document status" 
ON public.offer_documents 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- OFFER INFO REQUESTS
DROP POLICY IF EXISTS "offer_info_requests_company_access" ON public.offer_info_requests;
CREATE POLICY "offer_info_requests_company_access" 
ON public.offer_info_requests 
FOR ALL 
USING (
  offer_id IN (
    SELECT offers.id
    FROM offers
    WHERE offers.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- OFFER NOTES
DROP POLICY IF EXISTS "offer_notes_company_access" ON public.offer_notes;
CREATE POLICY "offer_notes_company_access" 
ON public.offer_notes 
FOR ALL 
USING (
  offer_id IN (
    SELECT offers.id
    FROM offers
    WHERE offers.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- OFFER UPLOAD LINKS
DROP POLICY IF EXISTS "offer_upload_links_company_access" ON public.offer_upload_links;
CREATE POLICY "offer_upload_links_company_access" 
ON public.offer_upload_links 
FOR ALL 
USING (
  offer_id IN (
    SELECT offers.id
    FROM offers
    WHERE offers.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- OFFER WORKFLOW LOGS
DROP POLICY IF EXISTS "offer_workflow_logs_access" ON public.offer_workflow_logs;
CREATE POLICY "offer_workflow_logs_access" 
ON public.offer_workflow_logs 
FOR ALL 
USING (
  offer_id IN (
    SELECT offers.id
    FROM offers
    WHERE offers.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- PRODUCTS - Optimiser les politiques existantes
DROP POLICY IF EXISTS "Admin full access to products" ON public.products;
CREATE POLICY "Admin full access to products" 
ON public.products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

DROP POLICY IF EXISTS "Company members can manage their products" ON public.products;
CREATE POLICY "Company members can manage their products" 
ON public.products 
FOR ALL 
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  )
) 
WITH CHECK (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  )
);

-- PRODUCT ATTRIBUTES
DROP POLICY IF EXISTS "product_attributes_company_access" ON public.product_attributes;
CREATE POLICY "product_attributes_company_access" 
ON public.product_attributes 
FOR ALL 
USING (
  product_id IN (
    SELECT products.id
    FROM products
    WHERE products.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- PRODUCT ATTRIBUTE VALUES
DROP POLICY IF EXISTS "product_attribute_values_company_access" ON public.product_attribute_values;
CREATE POLICY "product_attribute_values_company_access" 
ON public.product_attribute_values 
FOR ALL 
USING (
  attribute_id IN (
    SELECT pa.id
    FROM product_attributes pa
    JOIN products p ON pa.product_id = p.id
    WHERE p.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- PRODUCT VARIANT PRICES
DROP POLICY IF EXISTS "product_variant_prices_company_access" ON public.product_variant_prices;
CREATE POLICY "product_variant_prices_company_access" 
ON public.product_variant_prices 
FOR ALL 
USING (
  product_id IN (
    SELECT products.id
    FROM products
    WHERE products.company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- PARTNERS
DROP POLICY IF EXISTS "partners_company_access" ON public.partners;
CREATE POLICY "partners_company_access" 
ON public.partners 
FOR ALL 
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  ) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
);

-- PDF MODELS - Optimiser les politiques admin
DROP POLICY IF EXISTS "pdf_models_authenticated_manage" ON public.pdf_models;
CREATE POLICY "pdf_models_authenticated_manage" 
ON public.pdf_models 
FOR ALL 
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- PDF MODEL IMAGES
DROP POLICY IF EXISTS "Admin manage pdf_model_images" ON public.pdf_model_images;
CREATE POLICY "Admin manage pdf_model_images" 
ON public.pdf_model_images 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- SMTP SETTINGS
DROP POLICY IF EXISTS "smtp_settings_strict_company_isolation" ON public.smtp_settings;
CREATE POLICY "smtp_settings_strict_company_isolation" 
ON public.smtp_settings 
FOR ALL 
USING (
  (
    SELECT get_user_company_id() IS NOT NULL
  ) AND (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    ) OR (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (SELECT auth.uid()) 
        AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
      )
    )
  )
) 
WITH CHECK (
  (
    SELECT get_user_company_id() IS NOT NULL
  ) AND (
    company_id IN (
      SELECT profiles.company_id
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    ) OR (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (SELECT auth.uid()) 
        AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
      )
    )
  )
);

-- PROSPECTS
DROP POLICY IF EXISTS "Prospects admin access" ON public.prospects;
CREATE POLICY "Prospects admin access" 
ON public.prospects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- CONTENT CMS
DROP POLICY IF EXISTS "content_cms_admin" ON public.content_cms;
CREATE POLICY "content_cms_admin" 
ON public.content_cms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- HERO CMS
DROP POLICY IF EXISTS "hero_cms_admin" ON public.hero_cms;
CREATE POLICY "hero_cms_admin" 
ON public.hero_cms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- MENUS CMS
DROP POLICY IF EXISTS "menus_cms_admin" ON public.menus_cms;
CREATE POLICY "menus_cms_admin" 
ON public.menus_cms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- META CMS
DROP POLICY IF EXISTS "meta_cms_admin" ON public.meta_cms;
CREATE POLICY "meta_cms_admin" 
ON public.meta_cms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- PAGES CMS
DROP POLICY IF EXISTS "pages_cms_admin" ON public.pages_cms;
CREATE POLICY "pages_cms_admin" 
ON public.pages_cms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- STEPS CMS
DROP POLICY IF EXISTS "steps_cms_admin" ON public.steps_cms;
CREATE POLICY "steps_cms_admin" 
ON public.steps_cms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- SITE SETTINGS
DROP POLICY IF EXISTS "site_settings_admin" ON public.site_settings;
CREATE POLICY "site_settings_admin" 
ON public.site_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- PERMISSIONS
DROP POLICY IF EXISTS "permissions_admin" ON public.permissions;
CREATE POLICY "permissions_admin" 
ON public.permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- PERMISSION PROFILES
DROP POLICY IF EXISTS "permission_profiles_admin" ON public.permission_profiles;
CREATE POLICY "permission_profiles_admin" 
ON public.permission_profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- USER PERMISSIONS
DROP POLICY IF EXISTS "user_permissions_admin" ON public.user_permissions;
CREATE POLICY "user_permissions_admin" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- WOOCOMMERCE CONFIGS
DROP POLICY IF EXISTS "woocommerce_configs_admin" ON public.woocommerce_configs;
CREATE POLICY "woocommerce_configs_admin" 
ON public.woocommerce_configs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_admin" 
ON public.subscriptions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);