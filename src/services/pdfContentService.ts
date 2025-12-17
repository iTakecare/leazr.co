import { supabase } from '@/integrations/supabase/client';

export type PDFPageName = 'cover' | 'equipment' | 'conditions' | 'offers' | 'contract';

export interface PDFContentBlock {
  id: string;
  company_id: string;
  page_name: PDFPageName;
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
  pageName: PDFPageName
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
  pageName: PDFPageName,
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
    page_name: PDFPageName;
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
  pageName: PDFPageName,
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
    general_conditions: `<h3>Conditions Générales de Leasing</h3>
<ul>
<li>Paiement mensuel par prélèvement automatique</li>
<li>Engagement sur la durée du contrat</li>
<li>Maintenance et support inclus</li>
<li>Garantie constructeur incluse</li>
<li>Possibilité de renouvellement à l'échéance du contrat</li>
</ul>`,
    sale_general_conditions: `<h3>Conditions Générales de Vente</h3>
<ul>
<li>Paiement à réception de facture sous 30 jours</li>
<li>Garantie constructeur incluse</li>
<li>Livraison sous 10-15 jours ouvrés</li>
<li>Service après-vente inclus</li>
<li>Assistance technique disponible</li>
</ul>`,
    additional_info: '<p>Pour toute information complémentaire, n\'hésitez pas à nous contacter. Notre équipe reste à votre disposition pour répondre à toutes vos questions.</p>',
    contact_info: `<p><strong>Contact</strong></p>
<p>Pour toute question, contactez-nous :<br/>
Email: contact@votreentreprise.com<br/>
Tél: +32 XX XX XX XX</p>`,
  },
  offers: {
    leasing_introduction: '<p>Nous avons le plaisir de vous présenter notre offre de leasing pour les équipements informatiques détaillés ci-dessous.</p>',
    purchase_introduction: '<p>Nous avons le plaisir de vous présenter notre offre d\'achat pour les équipements informatiques détaillés ci-dessous.</p>',
    footer: '<p>Nous restons à votre disposition pour toute information complémentaire.</p>',
  },
  contract: {
    title: '<h1>CONTRAT DE LOCATION DE MATÉRIEL INFORMATIQUE AVEC OPTION D\'ACHAT</h1>',
    parties: `<p><strong>Entre :</strong></p>
<p>{{company_name}}, société {{company_legal_form}}, dont le siège social est sis {{company_address}}, immatriculée à la BCE sous le n° {{company_bce}}, représentée par {{company_representative}}, ci-après <strong>le Bailleur</strong> ;</p>
<p><strong>Et :</strong></p>
<p>{{client_company}}, N° BCE : {{client_bce}}, demeurant / ayant son siège social {{client_address}}, représenté(e) par {{client_representative}}, ci-après <strong>le Locataire</strong> ;</p>
<p>Ensemble <strong>les Parties</strong>.</p>`,
    article_1: `<h3>1. Objet</h3>
<p>1.1. Le présent contrat (le <strong>Contrat</strong>) a pour objet la location de matériel informatique et/ou de téléphonie mobile (le <strong>Matériel</strong>) décrit en Annexe 1 (références, numéros de série, valeur à neuf et valeur de référence).</p>
<p>1.2. La location comprend : (i) la mise à disposition et la jouissance du Matériel ; [OPTION - (ii) une assurance dommages & vol telle que décrite à l'Annexe 2] ; et, le cas échéant, (iii) un service de maintenance selon Annexe 4.</p>
<p>1.3. Le Bailleur demeure propriétaire du Matériel pendant toute la durée du Contrat. Aucun transfert de propriété n'intervient avant l'exercice effectif de l'Option d'achat (article 10).</p>`,
    article_2: `<h3>2. Durée</h3>
<p>2.1. Le Contrat est conclu pour une durée ferme de {{duration}} mois, à compter de la date de Livraison du Matériel constatée par un procès‑verbal signé par les Parties (la <strong>Date de Départ</strong>).</p>
<p>2.2. Le Contrat est non résiliable avant son terme par le Locataire, sauf : (i) faute grave prouvée du Bailleur empêchant définitivement l'exécution ; (ii) perte totale du Matériel non couverte par l'assurance (voir art. 9) ; (iii) application impérative d'un droit de rétractation légal lorsqu'il est ouvert au Locataire consommateur en cas de contrat conclu à distance (cf. Annexe 5 le cas échéant).</p>
<p>2.3. La restitution anticipée du Matériel à l'initiative du Locataire n'emporte pas décharge de l'obligation de payer les loyers échus et à échoir jusqu'au terme contractuel (sous réserve de l'article 13 – défaut d'exécution et pénalités, qui prévoit un mécanisme d'indemnisation plafonné).</p>`,
    article_3: `<h3>3. Livraison – Mise à disposition</h3>
<p>3.1. Le Bailleur livre le Matériel au siège social du Locataire à la Date de Livraison, contre signature du procès‑verbal de réception décrivant l'état apparent et les accessoires.</p>
<p>3.2. En cas de non‑conformité apparente, le Locataire formule ses réserves sur le procès‑verbal. À défaut, le Matériel est présumé livré conforme et en bon état de fonctionnement.</p>`,
    article_4: `<h3>4. Loyers – Facturation</h3>
<p>4.1. Le Locataire paie au Bailleur un loyer mensuel hors TVA de {{monthly_payment}} EUR (TVA au taux légal en vigueur), payable d'avance le {{payment_day}} de chaque mois sur le compte IBAN {{company_iban}} (BIC {{company_bic}}). Le premier loyer est exigible à la Date de Livraison, prorata temporis le cas échéant.</p>
<p>4.2. Le loyer comprend : (i) la mise à disposition du Matériel ; (ii) la prime d'assurance (Annexe 2) ; (iii) le cas échéant, la maintenance standard (Annexe 4). Toute prestation non incluse fera l'objet d'une facturation séparée selon le tarif en vigueur.</p>
<p>4.3. Le Bailleur émet des factures électroniques. Sauf contestation motivée adressée par écrit dans les huit (8) jours de leur réception, les factures sont réputées acceptées.</p>
<p>4.4. En sus du 1er loyer, des frais de dossier d'un montant {{file_fee}} EUR seront facturés au Locataire. En cas de transfert ou de toute modification du présent Contrat, des frais administratifs d'un montant de {{admin_fee}} EUR seront applicables et facturés avec le prochain loyer dû par le Locataire.</p>`,
    article_5: `<h3>5. Assurance – Risques – Sinistres [OPTION]</h3>
<p>5.1. Le Locataire : (i) conserve le Matériel en bon père de famille ; (ii) met en œuvre des mesures de sécurité raisonnables (verrouillage, chiffrement des terminaux si disponibles) ; (iii) déclare sans délai tout sinistre au Bailleur et coopère à la gestion du dossier auprès de l'assureur.</p>
<p>5.2. Lorsque le dommage n'est pas couvert par l'assurance (ex. négligence grave, violation intentionnelle, perte non garantie), le Locataire supporte le coût de réparation ou de remplacement (valeur de remplacement au jour du sinistre, déduction faite des montants perçus d'assurance le cas échéant).</p>
<p>5.3. Le Bailleur demeure preneur d'assurance et propriétaire du Matériel ; le Locataire est co‑assuré ou bénéficiaire selon l'Annexe 2. La cession des droits à indemnité au profit du Bailleur est convenue pour les dommages au Matériel.</p>`,
    article_6: `<h3>6. Utilisation – Interdictions – Logiciels</h3>
<p>6.1. Le Locataire utilise le Matériel conformément à sa destination et aux manuels fabricant. Il s'interdit : (i) sous‑location, prêt, mise à disposition à un tiers sans consentement écrit du Bailleur ; (ii) démontage, modification matérielle ou logicielle non autorisée ; (iii) atteinte aux marques et numéros de série.</p>
<p>6.2. Les licences logicielles (OS, applications, MDM) restent soumises aux conditions des éditeurs ; aucune licence n'est transférée au Locataire au‑delà des droits d'usage concédés.</p>`,
    article_7: `<h3>7. Maintenance – Remplacement – Temps d'intervention</h3>
<p>7.1. Si la maintenance est incluse (Annexe 4) : (i) helpdesk jours ouvrables [09:00–17:00] ; (ii) diagnostic sous [1] jour ouvrable ; (iii) réparation ou remplacement équivalent sous [5] jours ouvrables en Belgique.</p>
<p>7.2. Les réparations, intervention, chutes, casses et pannes imputables au Locataire, ainsi que toutes interventions, sont facturés selon tarif.</p>`,
    article_8: `<h3>8. Perte, vol, dommage total</h3>
<p>8.1. En cas de perte/vol/dommage total, et après traitement du sinistre : (i) le Contrat se poursuit avec un matériel de remplacement de spécifications au moins équivalentes, sans novation ; (ii) les conditions financières demeurent inchangées.</p>
<p>8.2. Si le remplacement s'avère impossible, les Parties conviennent d'un arrêt anticipé pour la portion restante du Contrat, moyennant règlement d'un solde égal au préjudice réellement subi par le Bailleur (déduction faite des indemnités d'assurance).</p>`,
    article_9: `<h3>9. Option d'achat en fin de contrat</h3>
<p>9.1. À l'issue de la Durée ({{duration}} mois), le Locataire dispose d'une option d'achat au prix résiduel équivalant à {{residual_value}}% de la valeur initiale (hors TVA), soit {{residual_amount}} EUR par équipement, conformément au barème Annexe 3.</p>
<p>9.2. L'option s'exerce par notification écrite au plus tard trente (30) jours avant l'échéance, sous réserve du paiement intégral des loyers et sommes dus.</p>
<p>9.3. Le transfert de propriété intervient au jour du paiement intégral du prix résiduel. Les risques sont transférés concomitamment.</p>
<p>9.4. À défaut d'exercice de l'option, le Locataire restitue le Matériel (art. 11). Tout retard de restitution autorise la facturation d'une indemnité d'occupation égale au loyer mensuel prorata temporis, sans préjudice des frais de remise en état.</p>`,
    article_10: `<h3>10. Protection des données – Sécurité – Effacement</h3>
<p>10.1. Lorsque le Matériel traite des données à caractère personnel, chaque Partie applique des mesures techniques et organisationnelles appropriées (ex. chiffrement, effacement sécurisé, MDM).</p>
<p>10.2. En cas de maintenance/retour impliquant un accès potentiel à des données du Locataire, le Bailleur agit comme sous‑traitant sur instruction du Locataire. Un avenant de sous‑traitance (DPA) peut être joint en Annexe 6.</p>
<p>10.3. À la restitution ou lors de l'exercice de l'option, le Locataire procède à l'effacement sécurisé des données et, si demandé, remet un certificat d'effacement. À défaut, le Bailleur est autorisé à effectuer un effacement industriel aux frais du Locataire.</p>`,
    article_11: `<h3>11. Restitution – État de retour</h3>
<p>11.1. À l'échéance (ou en cas de fin anticipée), le Locataire retourne à ses frais le Matériel au centre logistique désigné, en bon état de fonctionnement, usure normale exceptée, avec accessoires et mots de passe désactivés (verrouillage iCloud/MDM levé, Activation Lock désactivé).</p>
<p>11.2. Le Bailleur établit un rapport contradictoire de retour. Les frais de remise en état (pièces, main‑d'œuvre, effacement) sont facturés au Locataire, après communication de devis si > {{repair_threshold}} EUR HTVA.</p>`,
    article_12: `<h3>12. Défaut d'exécution – Intérêts – Indemnités</h3>
<p>12.1. Tout montant impayé à son échéance porte, de plein droit et sans mise en demeure, intérêts de retard au taux légal applicable et une indemnité forfaitaire minimale (le cas échéant en relations B2B), sans préjudice d'un complément d'indemnisation raisonnable pour les frais de recouvrement prouvés.</p>
<p>12.2. Après mise en demeure restée sans effet pendant quinze (15) jours, le Bailleur peut : (i) suspendre ses prestations ; (ii) exiger la restitution immédiate du Matériel ; (iii) résilier le Contrat.</p>
<p>12.3. En cas de résiliation pour faute du Locataire, l'indemnité due au Bailleur est limitée au préjudice effectivement subi, plafonné à {{penalty_percentage}}% des loyers restant à courir (actualisés au taux légal). Toute clause pénale manifestement excessive pourra être réduite judiciairement.</p>`,
    article_13: `<h3>13. Transfert – Cession</h3>
<p>13.1. Le Bailleur peut céder ou nantir tout ou partie de ses droits au titre du Contrat (notamment à un organisme de financement), sans diminuer les droits du Locataire.</p>
<p>13.2. Toute cession du Contrat par le Locataire requiert l'accord écrit et préalable du Bailleur.</p>`,
    article_14: `<h3>14. Force majeure</h3>
<p>14.1. Aucune Partie n'est responsable d'un manquement dû à un événement de force majeure au sens du droit belge (événement imprévisible, irrésistible et extérieur), la Partie affectée notifiant sans délai l'autre Partie. Les obligations affectées sont suspendues pendant la durée de l'événement.</p>`,
    article_15: `<h3>15. Notifications – Preuve – Signature électronique</h3>
<p>15.1. Les notifications contractuelles sont valablement faites par courriel avec accusé de réception, recommandé ou signature électronique qualifiée via une plateforme conforme.</p>
<p>15.2. Les Parties reconnaissent la valeur probante des documents électroniques et de la signature électronique, y compris qualifiée, et acceptent l'admissibilité des journaux électroniques comme éléments de preuve.</p>`,
    article_16: `<h3>16. Droit applicable – Juridiction – Médiation</h3>
<p>16.1. Le Contrat est régi par le droit belge.</p>
<p>16.2. Tout litige relatif à la validité, l'interprétation ou l'exécution est soumis à la juridiction exclusive des tribunaux francophones de Bruxelles, sans préjudice des règles impératives (consommateurs).</p>`,
    article_17: `<h3>17. Dispositions diverses</h3>
<p>17.1. <strong>Intégralité :</strong> le Contrat, ses Annexes et bons de livraison constituent l'intégralité de l'accord et remplacent tout accord antérieur.</p>
<p>17.2. <strong>Nullité partielle :</strong> la nullité d'une clause n'affecte pas la validité du reste ; une clause valable et d'effet économique équivalent remplacera la clause nulle.</p>
<p>17.3. <strong>Ordre de priorité :</strong> Contrat > Conditions particulières > Annexes > Offre/Bon de commande > Documentation technique.</p>`,
    annexes: `<h3>Annexes</h3>
<ul>
<li><strong>Annexe 1</strong> – Fiche du Matériel (références, numéros de série, valeur à neuf, indice santé de base)</li>
<li><strong>Annexe 2</strong> – Assurance (assureur, biens assurés, garanties, exclusions, franchise, sinistres, statut du Locataire : co‑assuré/bénéficiaire)</li>
<li><strong>Annexe 3</strong> – Barème de prix résiduel / valeur résiduelle par catégorie d'équipement (après {{duration}} mois)</li>
<li><strong>Annexe 4</strong> – Maintenance & SLA (si applicable)</li>
<li><strong>Annexe 5</strong> – Information précontractuelle et formulaire type de rétractation (uniquement si contrat à distance conclu avec un consommateur)</li>
</ul>`,
    signature: `<p>Fait à {{contract_location}}, le {{contract_date}}, en deux exemplaires originaux.</p>
<table style="width:100%; margin-top: 20px;">
<tr>
<td style="width:50%; vertical-align:top;">
<p><strong>Le Bailleur</strong></p>
<p>Nom, qualité, signature</p>
<p>_______________________</p>
</td>
<td style="width:50%; vertical-align:top;">
<p><strong>Le Locataire</strong></p>
<p>Nom, qualité, signature</p>
<p>_______________________</p>
</td>
</tr>
</table>`,
  },
};

/**
 * Initialise les blocs de contenu par défaut pour une entreprise
 */
export async function initializeDefaultPDFContent(companyId: string): Promise<void> {
  const blocks: Array<{
    company_id: string;
    page_name: PDFPageName;
    block_key: string;
    content: string;
  }> = [];

  // Parcourir toutes les pages et leurs blocs
  (Object.keys(DEFAULT_PDF_CONTENT_BLOCKS) as PDFPageName[]).forEach(pageName => {
    const pageBlocks = DEFAULT_PDF_CONTENT_BLOCKS[pageName];
    Object.entries(pageBlocks).forEach(([key, content]) => {
      blocks.push({
        company_id: companyId,
        page_name: pageName,
        block_key: key,
        content,
      });
    });
  });

  await upsertMultiplePDFContentBlocks(blocks);
  console.log('[PDF-CONTENT] Default content blocks initialized for company:', companyId);
}

/**
 * Réinitialise les blocs de contrat avec les valeurs par défaut
 * (supprime les blocs existants puis les recrée)
 */
export async function resetContractContentToDefaults(companyId: string): Promise<void> {
  // Supprimer tous les blocs de contrat existants
  const { error: deleteError } = await supabase
    .from('pdf_content_blocks')
    .delete()
    .eq('company_id', companyId)
    .eq('page_name', 'contract');

  if (deleteError) {
    console.error('[PDF-CONTENT] Error deleting contract blocks:', deleteError);
    throw deleteError;
  }

  // Recréer les blocs avec les valeurs par défaut
  const contractBlocks = DEFAULT_PDF_CONTENT_BLOCKS.contract;
  const blocks: Array<{
    company_id: string;
    page_name: PDFPageName;
    block_key: string;
    content: string;
  }> = [];

  Object.entries(contractBlocks).forEach(([key, content]) => {
    blocks.push({
      company_id: companyId,
      page_name: 'contract',
      block_key: key,
      content,
    });
  });

  await upsertMultiplePDFContentBlocks(blocks);
  console.log('[PDF-CONTENT] Contract content blocks reset to defaults for company:', companyId);
}
