-- Optimisation des politiques RLS pour améliorer les performances
-- Remplacement des appels directs aux fonctions auth par des sous-requêtes

-- Contract Equipment Attributes
DROP POLICY IF EXISTS "contract_equipment_attributes_company_access" ON public.contract_equipment_attributes;
CREATE POLICY "contract_equipment_attributes_company_access" 
ON public.contract_equipment_attributes 
FOR ALL 
USING (
  equipment_id IN (
    SELECT ce.id
    FROM contract_equipment ce
    JOIN contracts c ON ce.contract_id = c.id
    WHERE c.company_id IN (
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

-- Contract Equipment Specifications
DROP POLICY IF EXISTS "contract_equipment_specifications_company_access" ON public.contract_equipment_specifications;
CREATE POLICY "contract_equipment_specifications_company_access" 
ON public.contract_equipment_specifications 
FOR ALL 
USING (
  equipment_id IN (
    SELECT ce.id
    FROM contract_equipment ce
    JOIN contracts c ON ce.contract_id = c.id
    WHERE c.company_id IN (
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

-- Contract Documents
DROP POLICY IF EXISTS "contract_documents_company_access" ON public.contract_documents;
CREATE POLICY "contract_documents_company_access" 
ON public.contract_documents 
FOR ALL 
USING (
  contract_id IN (
    SELECT contracts.id
    FROM contracts
    WHERE contracts.company_id IN (
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

-- Contract Equipment
DROP POLICY IF EXISTS "clients_can_view_own_contract_equipment" ON public.contract_equipment;
DROP POLICY IF EXISTS "contract_equipment_company_access" ON public.contract_equipment;

CREATE POLICY "clients_can_view_own_contract_equipment" 
ON public.contract_equipment 
FOR SELECT 
USING (
  contract_id IN (
    SELECT c.id
    FROM contracts c
    JOIN clients cl ON c.client_id = cl.id
    WHERE cl.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "contract_equipment_company_access" 
ON public.contract_equipment 
FOR ALL 
USING (
  contract_id IN (
    SELECT contracts.id
    FROM contracts
    WHERE contracts.company_id IN (
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

-- Ambassador Clients
DROP POLICY IF EXISTS "ambassador_clients_access" ON public.ambassador_clients;
DROP POLICY IF EXISTS "ambassador_clients_basic_access" ON public.ambassador_clients;

CREATE POLICY "ambassador_clients_access" 
ON public.ambassador_clients 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM ambassadors a
    WHERE a.id = ambassador_clients.ambassador_id 
    AND (
      a.company_id = (
        SELECT profiles.company_id
        FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
      ) OR (
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE users.id = (SELECT auth.uid()) 
          AND (users.raw_user_meta_data ->> 'role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])
        )
      )
    )
  )
);

CREATE POLICY "ambassador_clients_basic_access" 
ON public.ambassador_clients 
FOR ALL 
USING ((SELECT auth.uid()) IS NOT NULL);

-- Contract Workflow Logs
DROP POLICY IF EXISTS "Admins can delete contract workflow logs" ON public.contract_workflow_logs;
DROP POLICY IF EXISTS "contract_workflow_logs_access" ON public.contract_workflow_logs;

CREATE POLICY "Admins can delete contract workflow logs" 
ON public.contract_workflow_logs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid()) 
    AND profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
  )
);

CREATE POLICY "contract_workflow_logs_access" 
ON public.contract_workflow_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM contracts
    WHERE contracts.id = contract_workflow_logs.contract_id 
    AND (
      contracts.company_id = (
        SELECT profiles.company_id
        FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
      ) OR (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE users.id = (SELECT auth.uid()) 
          AND (users.raw_user_meta_data ->> 'role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])
        )
      )
    )
  )
);

-- Collaborators
DROP POLICY IF EXISTS "collaborators_secure_access" ON public.collaborators;
CREATE POLICY "collaborators_secure_access" 
ON public.collaborators 
FOR ALL 
USING (
  client_id IN (
    SELECT clients.id
    FROM clients
    WHERE clients.company_id = get_user_company_id() 
    OR clients.user_id = (SELECT auth.uid())
  ) OR is_admin_optimized()
) 
WITH CHECK (
  client_id IN (
    SELECT clients.id
    FROM clients
    WHERE clients.company_id = get_user_company_id() 
    OR clients.user_id = (SELECT auth.uid())
  ) OR is_admin_optimized()
);

-- Contracts
DROP POLICY IF EXISTS "Contracts strict company isolation" ON public.contracts;
DROP POLICY IF EXISTS "contracts_company_access" ON public.contracts;

CREATE POLICY "Contracts strict company isolation" 
ON public.contracts 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized() 
    OR (
      client_id IN (
        SELECT clients.id
        FROM clients
        WHERE clients.user_id = (SELECT auth.uid())
      )
    )
  )
) 
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized()
  )
);

CREATE POLICY "contracts_company_access" 
ON public.contracts 
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

-- Clients
DROP POLICY IF EXISTS "Clients strict company isolation" ON public.clients;
CREATE POLICY "Clients strict company isolation" 
ON public.clients 
FOR ALL 
USING (
  (get_user_company_id() IS NOT NULL) AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized() 
    OR user_id = (SELECT auth.uid())
  )
) 
WITH CHECK (
  (get_user_company_id() IS NOT NULL) AND (
    company_id = get_user_company_id() 
    OR is_admin_optimized()
  )
);

-- Profiles
DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;

CREATE POLICY "profiles_access" 
ON public.profiles 
FOR ALL 
USING (
  company_id = get_user_company_id() 
  OR is_admin_optimized() 
  OR id = (SELECT auth.uid())
);

CREATE POLICY "profiles_own_access" 
ON public.profiles 
FOR ALL 
USING (id = (SELECT auth.uid()));

-- Equipment Assignments History
DROP POLICY IF EXISTS "clients_can_view_own_equipment_history" ON public.equipment_assignments_history;
CREATE POLICY "clients_can_view_own_equipment_history" 
ON public.equipment_assignments_history 
FOR SELECT 
USING (
  collaborator_id IN (
    SELECT col.id
    FROM collaborators col
    JOIN clients cl ON col.client_id = cl.id
    WHERE cl.user_id = (SELECT auth.uid())
  )
);