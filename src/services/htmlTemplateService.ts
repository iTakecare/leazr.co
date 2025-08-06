import Handlebars from 'handlebars';
import { formatCurrency } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';

// Interface pour les données d'offre compatible avec les templates HTML
export interface HtmlTemplateData {
  client_name: string;
  company_name: string;
  client_address: string;
  offer_date: string;
  monthly_price: string;
  insurance: string;
  insurance_amount?: string;
  setup_fee: string;
  contract_duration: string;
  products: Array<{
    category: string;
    description: string;
    quantity: number;
  }>;
  insurance_example?: string;
  // Images base64 (à injecter dynamiquement)
  base64_image_cover?: string;
  base64_image_vision?: string;
  base64_image_logo?: string;
  // Stats d'entreprise
  company_stats_clients?: string;
  company_stats_devices?: string;
  company_stats_co2?: string;
  company_started_year?: string;
  // Logos clients
  client_logos_count?: string;
  client_logos?: string;
  [key: string]: any; // Pour autres champs dynamiques
}

// Configuration des helpers Handlebars
const setupHandlebarsHelpers = () => {
  // Helper pour formater les devises
  Handlebars.registerHelper('currency', (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return formatCurrency(numAmount || 0);
  });

  // Helper pour formater les dates en français
  Handlebars.registerHelper('date', (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  });

  // Helper pour les calculs simples
  Handlebars.registerHelper('multiply', (a: number, b: number) => {
    return (a || 0) * (b || 0);
  });

  // Helper pour rendre du HTML brut (triple braces {{{}}} automatique)
  Handlebars.registerHelper('html', (content: string) => {
    return new Handlebars.SafeString(content || '');
  });

  // Helper pour formater les nombres
  Handlebars.registerHelper('number', (num: number | string) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  });

  // Helper conditionnel
  Handlebars.registerHelper('if_eq', function(a, b, options) {
    if (a === b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });
};

// Convertir les données d'offre Leazr vers le format template HTML
export const convertOfferToTemplateData = (offerData: any): HtmlTemplateData => {
  // Parser les équipements
  let equipment = [];
  try {
    if (offerData.equipment_description) {
      const parsed = typeof offerData.equipment_description === 'string' 
        ? JSON.parse(offerData.equipment_description)
        : offerData.equipment_description;
      
      if (Array.isArray(parsed)) {
        equipment = parsed;
      } else if (Array.isArray(offerData.equipment_data)) {
        equipment = offerData.equipment_data;
      }
    }
  } catch (e) {
    console.error('Erreur lors du parsing des équipements:', e);
  }

  // Convertir les équipements au format template
  const products = equipment.map((item: any) => ({
    category: item.category || 'Informatique',
    description: item.title || item.description || 'Équipement',
    quantity: item.quantity || 1
  }));

  // Calculer l'assurance (exemple : 3.5% du montant total)
  const totalAmount = offerData.amount || offerData.financed_amount || 0;
  const insuranceAmount = Math.round(totalAmount * 0.035);

  // Formater la date
  const offerDate = new Date(offerData.created_at || Date.now()).toLocaleDateString('fr-FR');

  return {
    client_name: offerData.client_name || 'Client',
    company_name: offerData.client_company || offerData.clients?.company || 'Entreprise',
    client_address: formatClientAddress(offerData),
    offer_date: offerDate,
    monthly_price: formatCurrency(offerData.monthly_payment || 0),
    insurance: `${insuranceAmount} €`,
    insurance_amount: `${insuranceAmount} €`,
    setup_fee: '150 €', // Valeur par défaut, à rendre configurable
    contract_duration: '36', // Durée par défaut, à rendre configurable
    products: products,
    insurance_example: `Pour un contrat de ${formatCurrency(totalAmount)}, assurance = ${formatCurrency(insuranceAmount)}/an`,
    // Images base64 - à injecter par la suite
    base64_image_cover: '', // Image de couverture (bureau/ordinateur)
    base64_image_vision: '', // Image de vision (mains avec globe)
    base64_image_logo: '', // Logo iTakecare
    // Stats d'entreprise (valeurs par défaut)
    company_stats_clients: '150',
    company_stats_devices: '2500',
    company_stats_co2: '45.5',
    company_started_year: '2020',
  // Logos clients (grille HTML par défaut)
  client_logos_count: '12',
      client_logos: generateClientLogosHtml([]) // Utilise une fonction pour générer le HTML
  };
};

// Générer le HTML pour les logos clients
const generateClientLogosHtml = (logos: Array<{ url: string; name: string }> = []): string => {
  if (logos.length === 0) {
    // Logos d'exemple par défaut
    return `
      <div class="client-logos-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 20px; margin: 20px 0;">
        <div style="text-align: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <img src="https://via.placeholder.com/120x60/f0f0f0/666?text=Logo+1" alt="Logo Client 1" style="max-width: 100%; height: auto; max-height: 60px;"/>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Client 1</p>
        </div>
        <div style="text-align: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <img src="https://via.placeholder.com/120x60/f0f0f0/666?text=Logo+2" alt="Logo Client 2" style="max-width: 100%; height: auto; max-height: 60px;"/>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Client 2</p>
        </div>
        <div style="text-align: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <img src="https://via.placeholder.com/120x60/f0f0f0/666?text=Logo+3" alt="Logo Client 3" style="max-width: 100%; height: auto; max-height: 60px;"/>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Client 3</p>
        </div>
      </div>
    `;
  }

  const logosHtml = logos.map(logo => `
    <div style="text-align: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <img src="${logo.url}" alt="${logo.name}" style="max-width: 100%; height: auto; max-height: 60px;"/>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">${logo.name.replace(/\.[^/.]+$/, '')}</p>
    </div>
  `).join('\n');

  return `
    <div class="client-logos-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 20px; margin: 20px 0;">
      ${logosHtml}
    </div>
  `;
};

// Formater l'adresse complète du client
const formatClientAddress = (offerData: any): string => {
  const parts = [];
  
  if (offerData.clients?.address || offerData.client_address) {
    parts.push(offerData.clients?.address || offerData.client_address);
  }
  
  if (offerData.clients?.postal_code || offerData.client_postal_code) {
    const postal = offerData.clients?.postal_code || offerData.client_postal_code;
    const city = offerData.clients?.city || offerData.client_city || '';
    parts.push(`${postal} ${city}`.trim());
  }
  
  if (offerData.clients?.country || offerData.client_country) {
    parts.push(offerData.clients?.country || offerData.client_country);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Adresse non renseignée';
};

export class HtmlTemplateService {
  private static instance: HtmlTemplateService;
  private helpersRegistered = false;

  static getInstance(): HtmlTemplateService {
    if (!HtmlTemplateService.instance) {
      HtmlTemplateService.instance = new HtmlTemplateService();
    }
    return HtmlTemplateService.instance;
  }

  /**
   * Sauvegarder un template HTML en base de données
   */
  public async saveTemplate(templateData: {
    name: string;
    description?: string;
    html_content: string;
    company_id: string;
    is_default?: boolean;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('html_templates')
        .insert({
          name: templateData.name,
          description: templateData.description || '',
          html_content: templateData.html_content,
          company_id: templateData.company_id,
          is_default: templateData.is_default || false
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
      throw new Error(`Erreur de sauvegarde: ${error.message}`);
    }
  }

  /**
   * Charger les templates d'une entreprise
   */
  public async loadCompanyTemplates(companyId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('html_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      throw new Error(`Erreur de chargement: ${error.message}`);
    }
  }

  /**
   * Mettre à jour un template existant
   */
  public async updateTemplate(templateId: string, updates: {
    name?: string;
    description?: string;
    html_content?: string;
    is_default?: boolean;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('html_templates')
        .update(updates)
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du template:', error);
      throw new Error(`Erreur de mise à jour: ${error.message}`);
    }
  }

  private ensureHelpersRegistered() {
    if (!this.helpersRegistered) {
      setupHandlebarsHelpers();
      this.helpersRegistered = true;
    }
  }

  /**
   * Compile un template HTML avec les données fournies
   */
  public compileTemplate(htmlTemplate: string, data: HtmlTemplateData): string {
    try {
      this.ensureHelpersRegistered();
      
      console.log('🔧 Compilation du template Handlebars...');
      console.log('Template length:', htmlTemplate.length);
      console.log('Data keys:', Object.keys(data));
      
      // Préprocesser le template pour s'assurer que les champs HTML utilisent des triple braces
      let processedTemplate = htmlTemplate;
      
      // Remplacer {{client_logos}} par {{{client_logos}}} pour éviter l'échappement HTML
      processedTemplate = processedTemplate.replace(/\{\{client_logos\}\}/g, '{{{client_logos}}}');
      
      // S'assurer que les autres champs HTML utilisent aussi des triple braces
      const htmlFields = ['client_logos', 'base64_image_cover', 'base64_image_vision', 'base64_image_logo'];
      htmlFields.forEach(field => {
        const singleBraceRegex = new RegExp(`\\{\\{${field}\\}\\}`, 'g');
        const tripleBraceReplacement = `{{{${field}}}}`;
        processedTemplate = processedTemplate.replace(singleBraceRegex, tripleBraceReplacement);
      });
      
      console.log('✅ Template préprocessé pour échappement HTML');
      
      // Compiler le template Handlebars avec le template préprocessé
      const template = Handlebars.compile(processedTemplate, {
        noEscape: false, // On garde l'échappement par défaut, sauf pour les triple braces
        strict: false
      });
      
      // Générer le HTML final
      const compiledHtml = template(data);
      console.log('✅ Template compilé avec succès, taille finale:', compiledHtml.length);
      
      // Vérifier si le HTML contient encore du code brut (debugging)
      if (compiledHtml.includes('<div class="client-logos-grid"')) {
        console.log('✅ HTML des logos clients correctement injecté');
      } else {
        console.warn('⚠️ Attention: HTML des logos clients pourrait ne pas être correctement injecté');
      }
      
      return compiledHtml;
    } catch (error) {
      console.error('❌ Erreur lors de la compilation du template HTML:', error);
      throw new Error(`Erreur de compilation du template: ${error.message}`);
    }
  }

  /**
   * Valider la syntaxe d'un template Handlebars
   */
  public validateTemplate(htmlTemplate: string): { valid: boolean; error?: string } {
    try {
      this.ensureHelpersRegistered();
      Handlebars.compile(htmlTemplate);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }

  /**
   * Extraire les variables utilisées dans un template
   */
  public extractTemplateVariables(htmlTemplate: string): string[] {
    const variables = new Set<string>();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(htmlTemplate)) !== null) {
      const variable = match[1].trim();
      // Exclure les helpers et structures de contrôle
      if (!variable.startsWith('#') && !variable.startsWith('/') && !variable.includes(' ')) {
        variables.add(variable);
      }
    }

    return Array.from(variables);
  }

  /**
   * Prévisualiser un template avec des données réelles ou d'exemple
   */
  public async previewTemplate(htmlTemplate: string, companyId?: string): Promise<string> {
    try {
      const sampleData = await this.generatePreviewData(companyId);
      return this.compileTemplate(htmlTemplate, sampleData);
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      // Fallback vers des données d'exemple
      return this.previewTemplateWithSampleData(htmlTemplate);
    }
  }

  /**
   * Prévisualiser avec des données d'exemple (fallback)
   */
  public previewTemplateWithSampleData(htmlTemplate: string): string {
    const sampleData: HtmlTemplateData = {
      client_name: 'Jean Dupont',
      company_name: 'ACME SA',
      client_address: '123 Rue de la Paix, 1000 Bruxelles, Belgique',
      offer_date: new Date().toLocaleDateString('fr-FR'),
      monthly_price: '250,00 €',
      insurance: '450 €',
      setup_fee: '150 €',
      contract_duration: '36',
      products: [
        {
          category: 'Ordinateur portable',
          description: 'Dell Latitude 5520 - Intel i5, 16GB RAM, 512GB SSD',
          quantity: 2
        },
        {
          category: 'Écran',
          description: 'Dell UltraSharp 24" Full HD',
          quantity: 2
        }
      ],
      insurance_example: 'Pour un contrat de 10.000 €, assurance = 350 €/an',
      // Stats d'entreprise (exemples)
      company_stats_clients: '150',
      company_stats_devices: '2500', 
      company_stats_co2: '45.5 tonnes',
      company_started_year: '2020',
      // Logos clients (exemple)
      client_logos_count: '3',
      client_logos: generateClientLogosHtml([])
    };

    return this.compileTemplate(htmlTemplate, sampleData);
  }

  /**
   * Générer des données de prévisualisation avec les vraies données de l'entreprise
   */
  private async generatePreviewData(companyId?: string): Promise<HtmlTemplateData> {
    let companyStats = {
      clients_count: 150,
      devices_count: 2500,
      co2_saved: 45.5,
      started_year: 2020
    };
    let clientLogos: Array<{ url: string; name: string }> = [];

    if (companyId) {
      try {
        // Charger les stats de l'entreprise
        const { data: company } = await supabase
          .from('companies')
          .select('clients_count, devices_count, co2_saved, started_year')
          .eq('id', companyId)
          .single();

        if (company) {
          companyStats = {
            clients_count: company.clients_count || 150,
            devices_count: company.devices_count || 2500,
            co2_saved: company.co2_saved || 45.5,
            started_year: company.started_year || 2020
          };
        }

        // Charger les logos clients avec la structure multi-tenant
        const { data: files } = await supabase.storage
          .from('client-logos')
          .list(`company-${companyId}/`, { limit: 10 });

        if (files && files.length > 0) {
          clientLogos = files.map(file => ({
            url: `${supabase.supabaseUrl}/storage/v1/object/public/client-logos/company-${companyId}/${file.name}`,
            name: file.name.replace(/client-.*?-logo\..*$/, '').replace(/^.*-/, '') || file.name
          }));
        }
      } catch (error) {
        console.warn('Impossible de charger les données réelles, utilisation des données d\'exemple');
      }
    }

    return {
      client_name: 'Jean Dupont',
      company_name: 'ACME SA',
      client_address: '123 Rue de la Paix, 1000 Bruxelles, Belgique',
      offer_date: new Date().toLocaleDateString('fr-FR'),
      monthly_price: '250,00 €',
      insurance: '450 €',
      setup_fee: '150 €',
      contract_duration: '36',
      products: [
        {
          category: 'Ordinateur portable',
          description: 'Dell Latitude 5520 - Intel i5, 16GB RAM, 512GB SSD',
          quantity: 2
        },
        {
          category: 'Écran',
          description: 'Dell UltraSharp 24" Full HD',
          quantity: 2
        }
      ],
      insurance_example: 'Pour un contrat de 10.000 €, assurance = 350 €/an',
      // Stats d'entreprise (vraies données)
      company_stats_clients: companyStats.clients_count.toString(),
      company_stats_devices: companyStats.devices_count.toString(),
      company_stats_co2: `${companyStats.co2_saved} tonnes`,
      company_started_year: companyStats.started_year.toString(),
      // Logos clients (vraies données ou exemples)
      client_logos_count: clientLogos.length.toString(),
      client_logos: generateClientLogosHtml(clientLogos)
    };
  }
}

export default HtmlTemplateService;