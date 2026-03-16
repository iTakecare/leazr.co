
-- RLS policy for clients to view their own support tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Clients can view own tickets' AND tablename = 'support_tickets'
  ) THEN
    CREATE POLICY "Clients can view own tickets" ON public.support_tickets
    FOR SELECT TO authenticated
    USING (
      client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- RLS policy for clients to create their own tickets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Clients can create own tickets' AND tablename = 'support_tickets'
  ) THEN
    CREATE POLICY "Clients can create own tickets" ON public.support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (
      client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
      AND created_by_client = true
    );
  END IF;
END $$;

-- RLS for clients to read knowledge base articles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read active KB articles' AND tablename = 'support_knowledge_base'
  ) THEN
    CREATE POLICY "Anyone can read active KB articles" ON public.support_knowledge_base
    FOR SELECT TO authenticated
    USING (is_active = true);
  END IF;
END $$;

-- RLS for clients to read equipment_locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Clients can view own locations' AND tablename = 'equipment_locations'
  ) THEN
    CREATE POLICY "Clients can view own locations" ON public.equipment_locations
    FOR SELECT TO authenticated
    USING (
      client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- RLS for clients to manage equipment_locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Clients can manage own locations' AND tablename = 'equipment_locations'
  ) THEN
    CREATE POLICY "Clients can manage own locations" ON public.equipment_locations
    FOR ALL TO authenticated
    USING (
      client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;
