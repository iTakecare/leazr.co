import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFTemplateService, TemplateForOffer } from './pdfTemplateService';

export interface PDFGenerationOptions {
  offerId: string;
  companyId: string;
  templateType?: string;
  templateId?: string;
  customData?: Record<string, any>;
}

export interface PDFFieldMapping {
  fieldId: string;
  fieldType: 'text' | 'image' | 'signature' | 'table';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: {
    fontSize?: number;
    fontColor?: string;
    fontWeight?: 'normal' | 'bold';
    alignment?: 'left' | 'center' | 'right';
  };
  dataPath: string; // Chemin vers la donnée dans les données d'offre (ex: "client_name", "offer.amount")
}

export class PDFGenerationEngine {
  /**
   * Génère un PDF d'offre avec le système de templates
   */
  static async generateOfferPDF(options: PDFGenerationOptions): Promise<Uint8Array> {
    try {
      // 1. Récupérer le template approprié
      const template = await this.getTemplateForGeneration(
        options.companyId, 
        options.templateType || 'standard',
        options.templateId
      );

      if (!template) {
        throw new Error('Aucun template trouvé pour cette configuration');
      }

      // 2. Récupérer les données de l'offre
      const offerData = await PDFTemplateService.generateOfferData(options.offerId);
      
      // 3. Fusionner avec les données personnalisées
      const finalData = { ...offerData, ...options.customData };

      // 4. Générer le PDF selon le type de template
      if (template.template_file_url) {
        // Template personnalisé - utiliser le fichier PDF uploadé
        return await this.generateFromCustomTemplate(template, finalData);
      } else {
        // Template généré - utiliser le système de génération interne
        return await this.generateFromInternalTemplate(template, finalData);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  }

  /**
   * Récupère le template à utiliser pour la génération
   */
  private static async getTemplateForGeneration(
    companyId: string, 
    templateType: string,
    templateId?: string
  ): Promise<TemplateForOffer | null> {
    if (templateId) {
      // Template spécifique demandé
      const templates = await PDFTemplateService.getCompanyTemplates(companyId);
      const specificTemplate = templates.find(t => t.id === templateId);
      
      if (specificTemplate) {
        return {
          template_id: specificTemplate.id,
          template_name: specificTemplate.name,
          template_file_url: specificTemplate.template_file_url,
          field_mappings: specificTemplate.field_mappings,
          company_data: {
            companyName: specificTemplate.companyName,
            companyAddress: specificTemplate.companyAddress,
            companyContact: specificTemplate.companyContact,
            companySiret: specificTemplate.companySiret,
            logoURL: specificTemplate.logoURL,
            primaryColor: specificTemplate.primaryColor,
            secondaryColor: specificTemplate.secondaryColor,
            headerText: specificTemplate.headerText,
            footerText: specificTemplate.footerText
          }
        };
      }
    }

    // Template automatique selon le type
    return await PDFTemplateService.getTemplateForOffer(companyId, templateType);
  }

  /**
   * Génère un PDF à partir d'un template personnalisé (fichier PDF uploadé)
   */
  private static async generateFromCustomTemplate(
    template: TemplateForOffer, 
    data: Record<string, any>
  ): Promise<Uint8Array> {
    try {
      // 1. Charger le template PDF
      const templatePdfBytes = await fetch(template.template_file_url!).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(templatePdfBytes);
      
      // 2. Obtenir la première page (ou créer un système multi-pages si nécessaire)
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      // 3. Charger les polices
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // 4. Appliquer les mappings de champs
      const fieldMappings = template.field_mappings as Record<string, PDFFieldMapping>;
      
      for (const [fieldId, mapping] of Object.entries(fieldMappings)) {
        const value = this.getValueFromPath(data, mapping.dataPath);
        
        if (value !== undefined && value !== null) {
          await this.renderFieldOnPage(
            firstPage, 
            mapping, 
            value, 
            helveticaFont, 
            helveticaBoldFont
          );
        }
      }
      
      // 5. Ajouter les données de l'entreprise si configurées
      await this.addCompanyData(firstPage, template.company_data, data, helveticaFont, helveticaBoldFont);
      
      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating from custom template:', error);
      throw new Error(`Erreur avec le template personnalisé: ${error.message}`);
    }
  }

  /**
   * Génère un PDF à partir du système de template interne
   */
  private static async generateFromInternalTemplate(
    template: TemplateForOffer, 
    data: Record<string, any>
  ): Promise<Uint8Array> {
    try {
      // Créer un nouveau document PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      
      // Charger les polices
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Générer le contenu selon le type de template
      const templateType = template.template_name.toLowerCase();
      
      if (templateType.includes('ambassador')) {
        await this.generateAmbassadorTemplate(page, data, template.company_data, helveticaFont, helveticaBoldFont);
      } else {
        await this.generateStandardTemplate(page, data, template.company_data, helveticaFont, helveticaBoldFont);
      }
      
      return await pdfDoc.save();
    } catch (error) {
      console.error('Error generating from internal template:', error);
      throw new Error(`Erreur avec le template interne: ${error.message}`);
    }
  }

  /**
   * Génère un template standard
   */
  private static async generateStandardTemplate(
    page: any, 
    data: Record<string, any>, 
    companyData: Record<string, any>,
    regularFont: any, 
    boldFont: any
  ): Promise<void> {
    const { width, height } = page.getSize();
    
    // En-tête avec logo et titre
    page.drawText(companyData.headerText || 'OFFRE COMMERCIALE', {
      x: 50,
      y: height - 100,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Informations de l'offre
    page.drawText(`Référence: ${data.offer_number || data.offer_id}`, {
      x: 50,
      y: height - 150,
      size: 12,
      font: regularFont,
    });
    
    page.drawText(`Date: ${data.created_at}`, {
      x: 50,
      y: height - 170,
      size: 12,
      font: regularFont,
    });
    
    // Informations client
    page.drawText('INFORMATIONS CLIENT', {
      x: 50,
      y: height - 220,
      size: 14,
      font: boldFont,
    });
    
    let yOffset = height - 250;
    const clientFields = [
      { label: 'Nom:', value: data.client_name },
      { label: 'Email:', value: data.client_email },
      { label: 'Entreprise:', value: data.client_company },
      { label: 'Téléphone:', value: data.client_phone }
    ];
    
    clientFields.forEach(field => {
      if (field.value) {
        page.drawText(`${field.label} ${field.value}`, {
          x: 50,
          y: yOffset,
          size: 10,
          font: regularFont,
        });
        yOffset -= 20;
      }
    });
    
    // Montant de l'offre
    page.drawText('DÉTAILS DE L\'OFFRE', {
      x: 50,
      y: yOffset - 20,
      size: 14,
      font: boldFont,
    });
    
    yOffset -= 50;
    page.drawText(`Montant mensuel: ${this.formatCurrency(data.monthly_payment)}`, {
      x: 50,
      y: yOffset,
      size: 12,
      font: regularFont,
    });
    
    // Équipements si disponibles
    if (data.equipment_list && data.equipment_list.length > 0) {
      yOffset -= 40;
      page.drawText('ÉQUIPEMENTS', {
        x: 50,
        y: yOffset,
        size: 14,
        font: boldFont,
      });
      
      yOffset -= 30;
      data.equipment_list.forEach((equipment: any, index: number) => {
        page.drawText(`${index + 1}. ${equipment.title} - ${this.formatCurrency(equipment.monthly_payment)}`, {
          x: 50,
          y: yOffset,
          size: 10,
          font: regularFont,
        });
        yOffset -= 20;
      });
    }
    
    // Pied de page
    if (companyData.footerText) {
      page.drawText(companyData.footerText, {
        x: 50,
        y: 50,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  /**
   * Génère un template ambassadeur (avec coordonnées ambassadeur)
   */
  private static async generateAmbassadorTemplate(
    page: any, 
    data: Record<string, any>, 
    companyData: Record<string, any>,
    regularFont: any, 
    boldFont: any
  ): Promise<void> {
    // Commencer par le template standard
    await this.generateStandardTemplate(page, data, companyData, regularFont, boldFont);
    
    const { width, height } = page.getSize();
    
    // Ajouter les informations ambassadeur
    if (data.ambassador_name) {
      page.drawText('VOTRE CONTACT', {
        x: width - 250,
        y: height - 220,
        size: 14,
        font: boldFont,
      });
      
      let yOffset = height - 250;
      const ambassadorFields = [
        { label: 'Ambassadeur:', value: data.ambassador_name },
        { label: 'Email:', value: data.ambassador_email },
        { label: 'Téléphone:', value: data.ambassador_phone },
        { label: 'Entreprise:', value: data.ambassador_company }
      ];
      
      ambassadorFields.forEach(field => {
        if (field.value) {
          page.drawText(`${field.label} ${field.value}`, {
            x: width - 250,
            y: yOffset,
            size: 10,
            font: regularFont,
          });
          yOffset -= 20;
        }
      });
    }
  }

  /**
   * Rend un champ sur une page PDF
   */
  private static async renderFieldOnPage(
    page: any, 
    mapping: PDFFieldMapping, 
    value: any,
    regularFont: any, 
    boldFont: any
  ): Promise<void> {
    const font = mapping.style?.fontWeight === 'bold' ? boldFont : regularFont;
    const fontSize = mapping.style?.fontSize || 12;
    
    switch (mapping.fieldType) {
      case 'text':
        const textValue = String(value);
        page.drawText(textValue, {
          x: mapping.position.x,
          y: mapping.position.y,
          size: fontSize,
          font: font,
        });
        break;
        
      case 'signature':
        if (value && typeof value === 'string' && value.startsWith('data:image')) {
          // Traiter l'image de signature
          // Note: Nécessiterait une implémentation plus complexe pour les images
          console.log('Signature field would be rendered here');
        }
        break;
        
      default:
        console.log(`Field type ${mapping.fieldType} not implemented yet`);
    }
  }

  /**
   * Ajoute les données de l'entreprise au PDF
   */
  private static async addCompanyData(
    page: any, 
    companyData: Record<string, any>, 
    offerData: Record<string, any>,
    regularFont: any, 
    boldFont: any
  ): Promise<void> {
    // Implémentation basique - à enrichir selon les besoins
    if (companyData.companyName) {
      const { width } = page.getSize();
      page.drawText(companyData.companyName, {
        x: width - 200,
        y: 100,
        size: 10,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  /**
   * Récupère une valeur à partir d'un chemin dans un objet
   */
  private static getValueFromPath(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Formate un montant en devise
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  }
}