import { supabase } from "@/integrations/supabase/client";

export interface CreditNote {
  id: string;
  company_id: string;
  invoice_id: string;
  credit_note_number: string | null;
  amount: number;
  reason: string | null;
  status: string;
  billing_data: any;
  issued_at: string;
  created_at: string;
  updated_at: string;
  invoice?: {
    invoice_number: string | null;
    leaser_name: string;
    amount: number;
  };
}

export const getCreditNotes = async (companyId: string): Promise<CreditNote[]> => {
  const { data, error } = await supabase
    .from('credit_notes')
    .select(`
      *,
      invoice:invoices(invoice_number, leaser_name, amount)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur lors de la récupération des notes de crédit:', error);
    throw error;
  }

  return data || [];
};

export const getCreditNoteById = async (id: string): Promise<CreditNote | null> => {
  const { data, error } = await supabase
    .from('credit_notes')
    .select(`
      *,
      invoice:invoices(invoice_number, leaser_name, amount, billing_data)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erreur lors de la récupération de la note de crédit:', error);
    return null;
  }

  return data;
};

export const createCreditNote = async (
  companyId: string,
  invoiceId: string,
  amount: number,
  reason: string
): Promise<CreditNote | null> => {
  // Générer le numéro de note de crédit
  const { data: creditNoteNumber, error: numberError } = await supabase
    .rpc('generate_credit_note_number', { p_company_id: companyId });

  if (numberError) {
    console.error('Erreur lors de la génération du numéro:', numberError);
    throw numberError;
  }

  // Récupérer les données de facturation de la facture originale
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('billing_data, amount')
    .eq('id', invoiceId)
    .single();

  if (invoiceError) {
    console.error('Erreur lors de la récupération de la facture:', invoiceError);
    throw invoiceError;
  }

  // Créer la note de crédit
  const { data: creditNote, error: createError } = await supabase
    .from('credit_notes')
    .insert({
      company_id: companyId,
      invoice_id: invoiceId,
      credit_note_number: creditNoteNumber,
      amount,
      reason,
      status: 'applied',
      billing_data: invoice.billing_data || {},
      issued_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createError) {
    console.error('Erreur lors de la création de la note de crédit:', createError);
    throw createError;
  }

  // Mettre à jour la facture avec le montant crédité
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      credited_amount: amount,
      credit_note_id: creditNote.id,
      status: amount >= invoice.amount ? 'credited' : 'partial_credit',
      updated_at: new Date().toISOString()
    })
    .eq('id', invoiceId);

  if (updateError) {
    console.error('Erreur lors de la mise à jour de la facture:', updateError);
    throw updateError;
  }

  return creditNote;
};

export const deleteCreditNote = async (id: string): Promise<boolean> => {
  // Récupérer la note de crédit pour obtenir l'invoice_id
  const { data: creditNote, error: fetchError } = await supabase
    .from('credit_notes')
    .select('invoice_id, amount')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Erreur lors de la récupération de la note de crédit:', fetchError);
    return false;
  }

  // Supprimer la note de crédit
  const { error: deleteError } = await supabase
    .from('credit_notes')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Erreur lors de la suppression:', deleteError);
    return false;
  }

  // Remettre la facture à son état original
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      credited_amount: 0,
      credit_note_id: null,
      status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', creditNote.invoice_id);

  if (updateError) {
    console.error('Erreur lors de la restauration de la facture:', updateError);
  }

  return true;
};
