import { supabase } from '@/integrations/supabase/client';

/**
 * Les tables CRM (pipeline_stages, contacts, opportunities, crm_activities)
 * n'existent pas encore dans `src/integrations/supabase/types.ts`, qui est
 * régénéré à la main. Même pattern que promotionService : on passe par un
 * client non typé, et les types métier sont portés par `./types.ts`.
 *
 * À supprimer le jour où les types générés sont rafraîchis.
 */
export const db = supabase as any;
export { supabase };
