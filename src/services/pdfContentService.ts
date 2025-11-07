import { supabase } from '@/integrations/supabase/client';

export interface PDFContentBlock {
  id: string;
  company_id: string;
  page_name: 'cover' | 'equipment' | 'conditions';
  block_key: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type PDFContentBlockInput = Omit<PDFContentBlock, 'id' | 'created_at' | 'updated_at'>;

/**
 * Récupère tous les blocs de contenu PDF pour une entreprise
 */
export async function getPDFContentBlocks(companyId: string): Promise<PDFContentBlock[]> {
  const { data, error } = await supabase
    .from('pdf_content_blocks')
    .select('*')
    .eq('company_id', companyId)
    .order('page_name', { ascending: true })
    .order('block_key', { ascending: true });

  if (error) {
    console.error('[PDF-CONTENT] Error fetching blocks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Récupère les blocs de contenu pour une page spécifique
 */
export async function getPDFContentBlocksByPage(
  companyId: string,
  pageName: 'cover' | 'equipment' | 'conditions'
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('pdf_content_blocks')
    .select('block_key, content')
    .eq('company_id', companyId)
    .eq('page_name', pageName);

  if (error) {
    console.error('[PDF-CONTENT] Error fetching blocks by page:', error);
    throw error;
  }

  // Convertir en objet {block_key: content}
  const blocksMap: Record<string, string> = {};
  data?.forEach(block => {
    blocksMap[block.block_key] = block.content;
  });

  return blocksMap;
}

/**
 * Crée ou met à jour un bloc de contenu
 */
export async function upsertPDFContentBlock(
  companyId: string,
  pageName: 'cover' | 'equipment' | 'conditions',
  blockKey: string,
  content: string
): Promise<PDFContentBlock> {
  const { data, error } = await supabase
    .from('pdf_content_blocks')
    .upsert({
      company_id: companyId,
      page_name: pageName,
      block_key: blockKey,
      content,
    }, {
      onConflict: 'company_id,page_name,block_key'
    })
    .select()
    .single();

  if (error) {
    console.error('[PDF-CONTENT] Error upserting block:', error);
    throw error;
  }

  return data;
}

/**
 * Met à jour plusieurs blocs de contenu en une seule transaction
 */
export async function upsertMultiplePDFContentBlocks(
  blocks: Array<{
    company_id: string;
    page_name: 'cover' | 'equipment' | 'conditions';
    block_key: string;
    content: string;
  }>
): Promise<PDFContentBlock[]> {
  const { data, error } = await supabase
    .from('pdf_content_blocks')
    .upsert(blocks, {
      onConflict: 'company_id,page_name,block_key'
    })
    .select();

  if (error) {
    console.error('[PDF-CONTENT] Error upserting multiple blocks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Supprime un bloc de contenu
 */
export async function deletePDFContentBlock(
  companyId: string,
  pageName: 'cover' | 'equipment' | 'conditions',
  blockKey: string
): Promise<void> {
  const { error } = await supabase
    .from('pdf_content_blocks')
    .delete()
    .eq('company_id', companyId)
    .eq('page_name', pageName)
    .eq('block_key', blockKey);

  if (error) {
    console.error('[PDF-CONTENT] Error deleting block:', error);
    throw error;
  }
}

/**
 * Valeurs par défaut pour les blocs de contenu
 */
export const DEFAULT_PDF_CONTENT_BLOCKS = {
  cover: {
    greeting: '<p>Madame, Monsieur,</p>',
    introduction: '<p>Nous avons le plaisir de vous présenter notre proposition commerciale pour les équipements et services détaillés dans les pages suivantes.</p>',
    validity: '<p>Cette offre est valable 30 jours à compter de la date d\'émission.</p>',
  },
  equipment: {
    title: '<h2>Détail des Équipements</h2>',
    footer_note: '<p>Tous les prix sont exprimés en euros hors taxes (€ HT). La TVA en vigueur sera appliquée sur la facture finale.</p>',
  },
  conditions: {
    general_conditions: `<h3>Conditions Générales</h3>
<ul>
<li>Paiement mensuel par prélèvement automatique</li>
<li>Engagement sur la durée du contrat</li>
<li>Maintenance et support inclus</li>
<li>Garantie constructeur incluse</li>
<li>Possibilité de renouvellement à l'échéance du contrat</li>
</ul>`,
    additional_info: '<p>Pour toute information complémentaire, n\'hésitez pas à nous contacter. Notre équipe reste à votre disposition pour répondre à toutes vos questions.</p>',
    contact_info: `<p><strong>Contact</strong></p>
<p>Pour toute question, contactez-nous :<br/>
Email: contact@votreentreprise.com<br/>
Tél: +32 XX XX XX XX</p>`,
  },
};

/**
 * Initialise les blocs de contenu par défaut pour une entreprise
 */
export async function initializeDefaultPDFContent(companyId: string): Promise<void> {
  const blocks: Array<{
    company_id: string;
    page_name: 'cover' | 'equipment' | 'conditions';
    block_key: string;
    content: string;
  }> = [];

  // Page de couverture
  Object.entries(DEFAULT_PDF_CONTENT_BLOCKS.cover).forEach(([key, content]) => {
    blocks.push({
      company_id: companyId,
      page_name: 'cover',
      block_key: key,
      content,
    });
  });

  // Page équipements
  Object.entries(DEFAULT_PDF_CONTENT_BLOCKS.equipment).forEach(([key, content]) => {
    blocks.push({
      company_id: companyId,
      page_name: 'equipment',
      block_key: key,
      content,
    });
  });

  // Page conditions
  Object.entries(DEFAULT_PDF_CONTENT_BLOCKS.conditions).forEach(([key, content]) => {
    blocks.push({
      company_id: companyId,
      page_name: 'conditions',
      block_key: key,
      content,
    });
  });

  await upsertMultiplePDFContentBlocks(blocks);
  console.log('[PDF-CONTENT] Default content blocks initialized for company:', companyId);
}
