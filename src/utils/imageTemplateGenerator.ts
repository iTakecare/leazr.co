import jsPDF from 'jspdf';
import { ImageTemplate } from '@/types/imageTemplate';
import { CustomPdfTemplateField } from '@/types/customPdfTemplateField';

interface GenerateImageTemplatePdfOptions {
  template: ImageTemplate;
  data: Record<string, any>;
  filename?: string;
}

export class ImageTemplateGenerator {
  static async generatePdf({ template, data, filename }: GenerateImageTemplatePdfOptions): Promise<string> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Supprimer la première page automatique
    pdf.deletePage(1);

    for (const page of template.pages) {
      // Ajouter une nouvelle page
      pdf.addPage();

      try {
        // Charger et ajouter l'image de fond
        const img = await this.loadImage(page.image_url);
        const imgAspectRatio = page.dimensions.width / page.dimensions.height;
        
        // Calculer les dimensions pour s'adapter à A4 (210 x 297 mm)
        let imgWidth = 210;
        let imgHeight = 210 / imgAspectRatio;
        
        if (imgHeight > 297) {
          imgHeight = 297;
          imgWidth = 297 * imgAspectRatio;
        }

        // Centrer l'image sur la page
        const x = (210 - imgWidth) / 2;
        const y = (297 - imgHeight) / 2;

        pdf.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);

        // Ajouter les champs texte pour cette page
        const pageFields = template.fields.filter(field => field.position.page === page.page_number);
        
        for (const field of pageFields) {
          if (!field.isVisible) continue;

          const fieldValue = this.getFieldValue(data, field);
          if (!fieldValue) continue;

          // Convertir les coordonnées px vers mm (approximation)
          const fieldX = (field.position.x / page.dimensions.width) * imgWidth + x;
          const fieldY = (field.position.y / page.dimensions.height) * imgHeight + y;

          // Appliquer le style du champ
          pdf.setFontSize(field.style.fontSize || 12);
          pdf.setTextColor(field.style.color || '#000000');
          
          // Déterminer l'alignement
          const align = field.style.textAlign === 'center' ? 'center' : 
                       field.style.textAlign === 'right' ? 'right' : 'left';

          pdf.text(fieldValue, fieldX, fieldY, { align });
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la page ${page.page_number}:`, error);
        // Continuer avec la page suivante
      }
    }

    // Sauvegarder le PDF
    const finalFilename = filename || `template-${template.name}-${Date.now()}.pdf`;
    pdf.save(finalFilename);

    return finalFilename;
  }

  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private static getFieldValue(data: Record<string, any>, field: CustomPdfTemplateField): string {
    const keys = field.mapping_key.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return '';
      }
    }

    if (value === null || value === undefined) {
      return '';
    }

    // Formater selon le type de champ
    switch (field.type) {
      case 'currency':
        return this.formatCurrency(value, field.format?.currency || 'EUR');
      case 'date':
        return this.formatDate(value, field.format?.dateFormat || 'dd/MM/yyyy');
      case 'number':
        return this.formatNumber(value, field.format?.numberDecimals || 2);
      default:
        return String(value);
    }
  }

  private static formatCurrency(value: any, currency: string): string {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(num);
  }

  private static formatDate(value: any, format: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    
    // Format simple dd/MM/yyyy
    if (format === 'dd/MM/yyyy') {
      return date.toLocaleDateString('fr-FR');
    }
    
    return date.toLocaleDateString('fr-FR');
  }

  private static formatNumber(value: any, decimals: number): string {
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    
    return num.toFixed(decimals);
  }
}