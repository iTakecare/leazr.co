-- Migration d'optimisation RLS complète (version corrigée)
-- Optimise seulement les politiques existantes avec des sous-requêtes

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

-- OPTIMISER LES POLITIQUES BLOG
DROP POLICY IF EXISTS "Admin manage blog_posts" ON public.blog_posts;
CREATE POLICY "Admin manage blog_posts" 
ON public.blog_posts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

DROP POLICY IF EXISTS "Blog posts unified" ON public.blog_posts;
CREATE POLICY "Blog posts unified" 
ON public.blog_posts 
FOR ALL 
USING (
  (is_published = true) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

DROP POLICY IF EXISTS "blog_posts_admin" ON public.blog_posts;
CREATE POLICY "blog_posts_admin" 
ON public.blog_posts 
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

-- OPTIMISER LES POLITIQUES MODULES
DROP POLICY IF EXISTS "Admin manage modules" ON public.modules;
CREATE POLICY "Admin manage modules" 
ON public.modules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

DROP POLICY IF EXISTS "modules_admin" ON public.modules;
CREATE POLICY "modules_admin" 
ON public.modules 
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

-- COMPANY CUSTOMIZATIONS
DROP POLICY IF EXISTS "Users can update their company customizations" ON public.company_customizations;
CREATE POLICY "Users can update their company customizations" 
ON public.company_customizations 
FOR ALL 
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view their company customizations" ON public.company_customizations;
CREATE POLICY "Users can view their company customizations" 
ON public.company_customizations 
FOR SELECT 
USING (
  company_id IN (
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
  )
);

-- COMPANY INTEGRATIONS
DROP POLICY IF EXISTS "company_integrations_company_access" ON public.company_integrations;
CREATE POLICY "company_integrations_company_access" 
ON public.company_integrations 
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

-- COMPANY MODULES
DROP POLICY IF EXISTS "company_modules_unified" ON public.company_modules;
CREATE POLICY "company_modules_unified" 
ON public.company_modules 
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

-- CHAT AGENT STATUS
DROP POLICY IF EXISTS "chat_agent_status_company_access" ON public.chat_agent_status;
CREATE POLICY "chat_agent_status_company_access" 
ON public.chat_agent_status 
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

-- CHAT AVAILABILITY HOURS
DROP POLICY IF EXISTS "chat_availability_hours_company_access" ON public.chat_availability_hours;
CREATE POLICY "chat_availability_hours_company_access" 
ON public.chat_availability_hours 
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

-- CHAT CONVERSATIONS
DROP POLICY IF EXISTS "chat_conversations_access" ON public.chat_conversations;
CREATE POLICY "chat_conversations_access" 
ON public.chat_conversations 
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

DROP POLICY IF EXISTS "chat_conversations_company_access" ON public.chat_conversations;
CREATE POLICY "chat_conversations_company_access" 
ON public.chat_conversations 
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

DROP POLICY IF EXISTS "chat_conversations_public_read" ON public.chat_conversations;
CREATE POLICY "chat_conversations_public_read" 
ON public.chat_conversations 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'anon'::text) OR (
    company_id IN (
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

-- CHAT MESSAGES
DROP POLICY IF EXISTS "chat_messages_access" ON public.chat_messages;
CREATE POLICY "chat_messages_access" 
ON public.chat_messages 
FOR ALL 
USING (
  conversation_id IN (
    SELECT chat_conversations.id
    FROM chat_conversations
    WHERE chat_conversations.company_id IN (
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

DROP POLICY IF EXISTS "chat_messages_public_read" ON public.chat_messages;
CREATE POLICY "chat_messages_public_read" 
ON public.chat_messages 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'anon'::text) OR (
    conversation_id IN (
      SELECT chat_conversations.id
      FROM chat_conversations
      WHERE chat_conversations.company_id IN (
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
);