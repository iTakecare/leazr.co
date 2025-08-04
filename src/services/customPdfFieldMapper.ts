import { CustomPdfTemplateField } from "@/types/customPdfTemplateField";
import { formatCurrency } from "@/lib/utils";

/**
 * Service pour mapper et résoudre les champs dynamiques des templates PDF personnalisés
 */
export class CustomPdfFieldMapper {
  
  /**
   * Résout la valeur d'un champ à partir des données d'offre
   */
  static resolveFieldValue(field: CustomPdfTemplateField, data: any): string {
    try {
      const value = this.getNestedValue(data, field.mapping_key);
      
      if (value === undefined || value === null) {
        return '';
      }
      
      return this.formatValue(value, field);
    } catch (error) {
      console.error('Erreur lors de la résolution du champ:', field.mapping_key, error);
      return '';
    }
  }
  
  /**
   * Récupère une valeur imbriquée à partir d'un chemin (ex: "client.name")
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    // Gestion des cas spéciaux
    if (path === 'current_date') {
      return new Date();
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * Formate une valeur selon le type et format du champ
   */
  private static formatValue(value: any, field: CustomPdfTemplateField): string {
    switch (field.type) {
      case 'currency':
        return this.formatCurrency(value, field.format?.currency);
        
      case 'date':
        return this.formatDate(value, field.format?.dateFormat);
        
      case 'number':
        return this.formatNumber(value, field.format?.numberDecimals);
        
      case 'text':
      default:
        return String(value);
    }
  }
  
  /**
   * Formate une valeur monétaire
   */
  private static formatCurrency(value: any, currency = 'EUR'): string {
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return '0,00 €';
    
    try {
      return formatCurrency(numValue);
    } catch (error) {
      return `${numValue.toFixed(2)} €`;
    }
  }
  
  /**
   * Formate une date
   */
  private static formatDate(value: any, format = 'dd/MM/yyyy'): string {
    let date: Date;
    
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Format simple dd/MM/yyyy
    if (format === 'dd/MM/yyyy') {
      return date.toLocaleDateString('fr-FR');
    }
    
    // Ajouter d'autres formats si nécessaire
    return date.toLocaleDateString('fr-FR');
  }
  
  /**
   * Formate un nombre
   */
  private static formatNumber(value: any, decimals = 0): string {
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return '0';
    
    return numValue.toFixed(decimals);
  }
  
  /**
   * Vérifie si un champ doit être affiché selon ses conditions
   */
  static shouldShowField(field: CustomPdfTemplateField, data: any): boolean {
    if (!field.conditions) {
      return field.isVisible;
    }
    
    // Vérifier la condition show_if
    if (field.conditions.show_if) {
      const showValue = this.getNestedValue(data, field.conditions.show_if);
      if (!showValue) {
        return false;
      }
    }
    
    // Vérifier la condition hide_if
    if (field.conditions.hide_if) {
      const hideValue = this.getNestedValue(data, field.conditions.hide_if);
      if (hideValue) {
        return false;
      }
    }
    
    return field.isVisible;
  }
  
  /**
   * Génère des données d'exemple pour la prévisualisation
   */
  static generateSampleData(): any {
    return {
      client: {
        name: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        company: 'Entreprise SARL',
        address: '123 Rue de la Paix, 75001 Paris',
        phone: '+33 1 23 45 67 89'
      },
      offer: {
        id: 'OFF-2024-001',
        amount: 15000,
        monthly_payment: 450,
        duration: 36,
        created_at: new Date().toISOString()
      },
      equipment_list: [
        {
          title: 'MacBook Pro 16"',
          quantity: 2,
          monthly_payment: 200,
          attributes: [
            { key: 'RAM', value: '32GB' },
            { key: 'Stockage', value: '1TB SSD' }
          ]
        },
        {
          title: 'iPhone 15 Pro',
          quantity: 3,
          monthly_payment: 150,
          attributes: [
            { key: 'Couleur', value: 'Titane naturel' },
            { key: 'Stockage', value: '256GB' }
          ]
        }
      ],
      current_date: new Date()
    };
  }
}