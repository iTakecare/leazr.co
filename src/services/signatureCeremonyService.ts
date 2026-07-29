// Cérémonies de signature du module financeur (Winlease Phase 3) :
// séquence client final → partenaire fournisseur → financeur sur le contrat.
import { supabase } from "@/integrations/supabase/client";

export interface CeremonySigner {
  id: string;
  ceremony_id: string;
  step_order: number;
  role: 'client' | 'partner' | 'financeur';
  name: string;
  email?: string | null;
  phone?: string | null;
  status: 'pending' | 'notified' | 'signed' | 'refused';
  signed_at?: string | null;
}

export interface SignatureCeremony {
  id: string;
  company_id: string;
  offer_id?: string | null;
  contract_id?: string | null;
  document_type: string;
  provider: 'internal' | 'oksign';
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  current_step: number;
  created_at: string;
  signers?: CeremonySigner[];
}

export interface FinancingSignatory {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

export interface AuthorizedSigner {
  id: string;
  company_id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_default: boolean;
  power_of_attorney_url?: string | null;
  notes?: string | null;
  is_active: boolean;
}

export const getCeremonyForOffer = async (offerId: string): Promise<SignatureCeremony | null> => {
  const { data, error } = await supabase
    .from('signature_ceremonies' as any)
    .select('*')
    .eq('offer_id', offerId)
    .eq('document_type', 'contract')
    .in('status', ['in_progress', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const ceremony = data as unknown as SignatureCeremony;
  const { data: signers, error: signersError } = await supabase
    .from('signature_ceremony_signers' as any)
    .select('id, ceremony_id, step_order, role, name, email, phone, status, signed_at')
    .eq('ceremony_id', ceremony.id)
    .order('step_order');
  if (signersError) throw signersError;
  return { ...ceremony, signers: (signers as unknown as CeremonySigner[]) || [] };
};

export const startFinancingSignature = async (
  offerId: string,
  signatory: FinancingSignatory
): Promise<{ success: boolean; ceremony_id?: string; contract_number?: string; sign_url?: string; error?: string }> => {
  const { data, error } = await supabase.functions.invoke('financing-signature', {
    body: { action: 'start', offerId, signatory },
  });
  if (error) {
    // Les erreurs métier arrivent en JSON dans le corps de la réponse
    const ctx = (error as any)?.context;
    try {
      const parsed = ctx ? await ctx.json() : null;
      if (parsed?.error) return { success: false, error: parsed.error };
    } catch { /* ignore */ }
    return { success: false, error: error.message };
  }
  return data;
};

export const resendSignatureLink = async (ceremonyId: string): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.functions.invoke('financing-signature', {
    body: { action: 'resend', ceremonyId },
  });
  if (error) return { success: false, error: error.message };
  return data;
};

export const signCeremonyStep = async (
  ceremonyId: string,
  signatureData: string,
  signerName?: string
): Promise<{ ceremony_status: string; current_step: number }> => {
  const { data, error } = await supabase.rpc('sign_financing_ceremony_step' as any, {
    p_ceremony_id: ceremonyId,
    p_signature_data: signatureData,
    p_signer_name: signerName || null,
  });
  if (error) throw error;
  const result = data as any;
  // Cérémonie terminée → régénérer le PDF final avec les 3 signatures et
  // l'envoyer aux parties (fire-and-forget ; le cron quotidien sert de filet).
  if (result?.ceremony_status === 'completed') {
    supabase.functions
      .invoke('financing-signature', { body: { action: 'finalize', ceremonyId } })
      .catch((e) => console.warn('Finalisation du PDF signé différée :', e));
  }
  return result;
};

// ── Registre des signataires autorisés ──

export const getAuthorizedSigners = async (): Promise<AuthorizedSigner[]> => {
  const { data, error } = await supabase
    .from('authorized_signers' as any)
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data as unknown as AuthorizedSigner[]) || [];
};

export const createAuthorizedSigner = async (
  companyId: string,
  signer: Partial<AuthorizedSigner>
): Promise<void> => {
  const { error } = await supabase
    .from('authorized_signers' as any)
    .insert([{ ...signer, company_id: companyId }]);
  if (error) throw error;
};

export const updateAuthorizedSigner = async (
  id: string,
  updates: Partial<AuthorizedSigner>
): Promise<void> => {
  const { error } = await supabase
    .from('authorized_signers' as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const deleteAuthorizedSigner = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('authorized_signers' as any)
    .delete()
    .eq('id', id);
  if (error) throw error;
};
