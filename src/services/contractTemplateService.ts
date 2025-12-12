/**
 * Contract Template Service
 * Handles contract template CRUD operations, text analysis, and placeholder replacement
 */

import { supabase } from "@/integrations/supabase/client";

export interface ContractTemplate {
  id: string;
  company_id: string;
  name: string;
  raw_content: string;
  parsed_content: string;
  placeholders: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Available placeholders with their descriptions
export const AVAILABLE_PLACEHOLDERS: Record<string, string> = {
  // Client information
  '{{client_name}}': 'Nom du client',
  '{{client_company}}': 'Société du client',
  '{{client_address}}': 'Adresse du client',
  '{{client_city}}': 'Ville du client',
  '{{client_postal_code}}': 'Code postal du client',
  '{{client_country}}': 'Pays du client',
  '{{client_vat_number}}': 'Numéro de TVA du client',
  '{{client_email}}': 'Email du client',
  '{{client_phone}}': 'Téléphone du client',
  '{{client_iban}}': 'IBAN du client',
  '{{client_bic}}': 'BIC du client',
  
  // Company (leaser = own company)
  '{{company_name}}': 'Nom de votre société',
  '{{company_address}}': 'Adresse de votre société',
  '{{company_city}}': 'Ville de votre société',
  '{{company_postal_code}}': 'Code postal de votre société',
  '{{company_vat_number}}': 'Numéro de TVA de votre société',
  '{{company_email}}': 'Email de votre société',
  '{{company_phone}}': 'Téléphone de votre société',
  '{{company_iban}}': 'IBAN de votre société',
  
  // Offer/Contract
  '{{offer_number}}': 'Numéro de l\'offre',
  '{{contract_number}}': 'Numéro du contrat',
  '{{contract_date}}': 'Date du contrat',
  '{{equipment_list}}': 'Liste des équipements',
  '{{equipment_table}}': 'Tableau des équipements',
  '{{monthly_payment}}': 'Mensualité totale HT',
  '{{monthly_payment_ttc}}': 'Mensualité totale TTC',
  '{{duration_months}}': 'Durée en mois',
  '{{file_fee}}': 'Frais de dossier',
  '{{insurance_cost}}': 'Assurance annuelle',
  '{{total_contract_value}}': 'Valeur totale du contrat',
  '{{total_purchase_price}}': 'Prix d\'achat total',
  '{{first_payment_date}}': 'Date première échéance',
  
  // Signature
  '{{signature_date}}': 'Date de signature',
  '{{signature_place}}': 'Lieu de signature',
  '{{signature_block}}': 'Zone de signature',
  '{{signer_name}}': 'Nom du signataire',
  '{{signer_ip}}': 'Adresse IP du signataire',
};

/**
 * Get active contract template for a company
 */
export async function getActiveContractTemplate(companyId: string): Promise<ContractTemplate | null> {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching contract template:', error);
    return null;
  }
  
  return data as ContractTemplate | null;
}

/**
 * Get all contract templates for a company
 */
export async function getContractTemplates(companyId: string): Promise<ContractTemplate[]> {
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching contract templates:', error);
    return [];
  }
  
  return (data as ContractTemplate[]) || [];
}

/**
 * Create a new contract template
 */
export async function createContractTemplate(
  companyId: string,
  name: string,
  rawContent: string
): Promise<ContractTemplate | null> {
  const { parsedContent, detectedPlaceholders } = analyzeContractText(rawContent);
  
  const { data, error } = await supabase
    .from('contract_templates')
    .insert({
      company_id: companyId,
      name,
      raw_content: rawContent,
      parsed_content: parsedContent,
      placeholders: detectedPlaceholders,
      is_active: true
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating contract template:', error);
    return null;
  }
  
  return data as ContractTemplate;
}

/**
 * Update an existing contract template
 */
export async function updateContractTemplate(
  templateId: string,
  updates: Partial<Pick<ContractTemplate, 'name' | 'raw_content' | 'parsed_content' | 'is_active'>>
): Promise<ContractTemplate | null> {
  let dataToUpdate: any = { ...updates, updated_at: new Date().toISOString() };
  
  // If raw_content is updated, re-analyze the text
  if (updates.raw_content) {
    const { parsedContent, detectedPlaceholders } = analyzeContractText(updates.raw_content);
    dataToUpdate.parsed_content = parsedContent;
    dataToUpdate.placeholders = detectedPlaceholders;
  }
  
  const { data, error } = await supabase
    .from('contract_templates')
    .update(dataToUpdate)
    .eq('id', templateId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating contract template:', error);
    return null;
  }
  
  return data as ContractTemplate;
}

/**
 * Delete a contract template
 */
export async function deleteContractTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('contract_templates')
    .delete()
    .eq('id', templateId);
  
  if (error) {
    console.error('Error deleting contract template:', error);
    return false;
  }
  
  return true;
}

/**
 * Analyze contract text to detect and suggest placeholders
 * Returns the text with placeholders inserted and a list of detected placeholders
 */
export function analyzeContractText(text: string): {
  parsedContent: string;
  detectedPlaceholders: string[];
  suggestions: Array<{ original: string; placeholder: string; description: string }>;
} {
  let parsedContent = text;
  const detectedPlaceholders: string[] = [];
  const suggestions: Array<{ original: string; placeholder: string; description: string }> = [];
  
  // Pattern detection rules
  const patterns = [
    // Client patterns
    { regex: /\b(le client|le locataire|la société cliente)\b/gi, placeholder: '{{client_name}}' },
    { regex: /\b(domicilié|domiciliée|sis|sise)\s+(à|au)\s+([^,\n]+)/gi, placeholder: '{{client_address}}' },
    { regex: /\b(TVA|numéro de TVA|N° TVA)\s*:?\s*([A-Z]{2}\d+)/gi, placeholder: '{{client_vat_number}}' },
    { regex: /\b([A-Z]{2}\d{2}\s?\d{4}\s?\d{4}\s?\d{4})/g, placeholder: '{{client_iban}}' },
    
    // Amount patterns
    { regex: /(\d+[.,]\d{2})\s*€\s*(par mois|mensuel|\/mois)/gi, placeholder: '{{monthly_payment}}' },
    { regex: /durée\s*(de)?\s*(\d+)\s*mois/gi, placeholder: '{{duration_months}}' },
    { regex: /frais\s*(de)?\s*dossier\s*:?\s*(\d+[.,]?\d*)\s*€/gi, placeholder: '{{file_fee}}' },
    
    // Date patterns
    { regex: /fait\s+(à|le)\s+([^,\n]+),?\s*(le)?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, placeholder: '{{signature_date}}' },
    
    // Company patterns
    { regex: /\b(le bailleur|le loueur|la société)\s+([^,\n]+)/gi, placeholder: '{{company_name}}' },
  ];
  
  // Extract existing placeholders from text
  const existingPlaceholders = text.match(/\{\{[a-z_]+\}\}/g) || [];
  detectedPlaceholders.push(...existingPlaceholders);
  
  // Generate suggestions based on patterns
  patterns.forEach(({ regex, placeholder }) => {
    const matches = text.match(regex);
    if (matches) {
      matches.forEach(match => {
        if (!detectedPlaceholders.includes(placeholder)) {
          suggestions.push({
            original: match,
            placeholder,
            description: AVAILABLE_PLACEHOLDERS[placeholder] || placeholder
          });
        }
      });
    }
  });
  
  return { parsedContent, detectedPlaceholders, suggestions };
}

/**
 * Replace placeholders in contract text with actual values
 */
export function replacePlaceholders(
  template: string,
  data: Record<string, string | number | undefined>
): string {
  let result = template;
  
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = key.startsWith('{{') ? key : `{{${key}}}`;
    const replacement = value?.toString() || '';
    result = result.replace(new RegExp(escapeRegExp(placeholder), 'g'), replacement);
  });
  
  return result;
}

/**
 * Build placeholder data from offer and contract information
 */
export function buildPlaceholderData(
  offer: any,
  contract: any,
  client: any,
  company: any,
  equipment: any[]
): Record<string, string> {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  
  const formatDate = (date: string | Date) => 
    new Date(date).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  // Build equipment list as text
  const equipmentList = equipment
    .map(eq => `- ${eq.title} (x${eq.quantity})`)
    .join('\n');
  
  // Build equipment table as HTML
  const equipmentTableRows = equipment
    .map(eq => `
      <tr>
        <td>${eq.title}</td>
        <td>${eq.quantity}</td>
        <td>${formatCurrency(eq.monthly_payment / eq.quantity)}</td>
        <td>${formatCurrency(eq.monthly_payment)}</td>
      </tr>
    `)
    .join('');
  
  const equipmentTable = `
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px;">Équipement</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Qté</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Mensualité unitaire</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Total mensuel</th>
        </tr>
      </thead>
      <tbody>
        ${equipmentTableRows}
      </tbody>
    </table>
  `;
  
  const totalMonthly = equipment.reduce((sum, eq) => sum + (eq.monthly_payment || 0), 0);
  const totalPurchase = equipment.reduce((sum, eq) => sum + ((eq.purchase_price || 0) * (eq.quantity || 1)), 0);
  
  return {
    // Client
    client_name: client?.name || client?.contact_name || '',
    client_company: client?.company || client?.name || '',
    client_address: client?.address || '',
    client_city: client?.city || '',
    client_postal_code: client?.postal_code || '',
    client_country: client?.country || 'Belgique',
    client_vat_number: client?.vat_number || '',
    client_email: client?.email || '',
    client_phone: client?.phone || '',
    client_iban: contract?.client_iban || '',
    client_bic: contract?.client_bic || '',
    
    // Company
    company_name: company?.name || '',
    company_address: company?.address || '',
    company_city: company?.city || '',
    company_postal_code: company?.postal_code || '',
    company_vat_number: company?.vat_number || '',
    company_email: company?.email || '',
    company_phone: company?.phone || '',
    company_iban: company?.iban || '',
    
    // Contract/Offer
    offer_number: offer?.offer_number || '',
    contract_number: contract?.tracking_number || '',
    contract_date: formatDate(contract?.created_at || new Date()),
    equipment_list: equipmentList,
    equipment_table: equipmentTable,
    monthly_payment: formatCurrency(totalMonthly),
    monthly_payment_ttc: formatCurrency(totalMonthly * 1.21),
    duration_months: (offer?.duration || contract?.contract_duration || 36).toString(),
    file_fee: formatCurrency(offer?.file_fee || 0),
    insurance_cost: formatCurrency(offer?.insurance_cost || 0),
    total_contract_value: formatCurrency(totalMonthly * (offer?.duration || 36)),
    total_purchase_price: formatCurrency(totalPurchase),
    first_payment_date: formatDate(contract?.contract_start_date || new Date()),
    
    // Signature
    signature_date: formatDate(contract?.contract_signed_at || new Date()),
    signature_place: client?.city || '',
    signer_name: contract?.contract_signer_name || '',
    signer_ip: contract?.contract_signer_ip || '',
    signature_block: '<div id="signature-block" style="border: 1px dashed #ccc; padding: 20px; min-height: 100px; text-align: center;">Zone de signature</div>',
  };
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
