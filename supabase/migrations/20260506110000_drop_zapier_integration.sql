-- =====================================================
-- Drop Zapier integration
-- =====================================================
--
-- The Zapier integration was scaffolded but never actively used outside of a
-- single SEPA payment flow that's been replaced. AdiOS now covers Meta Ads
-- conversion attribution, and there is no other consumer.
--
-- The CASCADE drop also removes the policies and the updated_at trigger.

DROP TABLE IF EXISTS public.zapier_integrations CASCADE;
