import Handlebars from 'handlebars';
import { formatCurrency } from '@/utils/formatters';

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
  base64_image_solution?: string;
  base64_image_logo?: string;
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
    base64_image_logo: '', // Sera rempli par le service d'images
    base64_image_solution: '' // Sera rempli par le service d'images
  };
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
      
      // Compiler le template Handlebars
      const template = Handlebars.compile(htmlTemplate);
      
      // Générer le HTML final
      const compiledHtml = template(data);
      
      return compiledHtml;
    } catch (error) {
      console.error('Erreur lors de la compilation du template HTML:', error);
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
   * Prévisualiser un template avec des données d'exemple
   */
  public previewTemplate(htmlTemplate: string): string {
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
      insurance_example: 'Pour un contrat de 10.000 €, assurance = 350 €/an'
    };

    return this.compileTemplate(htmlTemplate, sampleData);
  }
}

export default HtmlTemplateService;