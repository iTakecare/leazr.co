import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { ExtendedCustomPdfTemplate, CustomPdfTemplateField } from '@/types/customPdfTemplateField';
import { CustomPdfFieldMapper } from './customPdfFieldMapper';

/**
 * Service de rendu pour les templates PDF personnalisés
 * Combine le PDF de base uploadé avec les champs dynamiques positionnés
 */
export class CustomPdfRenderer {
  /**
   * Génère un PDF à partir d'un template personnalisé et de données d'offre
   */
  static async renderCustomPdf(
    template: ExtendedCustomPdfTemplate,
    offerData: Record<string, any>
  ): Promise<Uint8Array> {
    try {
      console.log('🎬 Début du rendu PDF personnalisé');
      console.log('📋 Template:', template.name);
      console.log('🔗 URL du PDF original:', template.original_pdf_url);
      console.log('📊 Données à injecter:', offerData);
      console.log('🔧 Champs du template:', template.fields);
      console.log('📖 Pages du template:', template.template_metadata?.pages_data || template.pages_data);

      // 1. Charger le PDF original depuis l'URL
      const response = await fetch(template.original_pdf_url);
      if (!response.ok) {
        throw new Error(`Impossible de charger le PDF: ${response.statusText}`);
      }

      const templatePdfBytes = new Uint8Array(await response.arrayBuffer());
      console.log('📄 PDF original chargé, taille:', templatePdfBytes.length, 'bytes');

      const pdfDoc = await PDFDocument.load(templatePdfBytes);
      const pageCount = pdfDoc.getPageCount();
      console.log(`📄 PDF chargé avec ${pageCount} page(s)`);
      
      // Si aucun champ n'est défini, retourner le PDF original
      if (!template.fields || template.fields.length === 0) {
        console.log('⚠️ Aucun champ défini, retour du PDF original');
        return await pdfDoc.save();
      }
      
      // 2. Charger les polices standard
      const fonts = await this.loadFonts(pdfDoc);
      
      // 3. Traiter chaque page avec ses champs
      await this.renderFieldsOnPages(pdfDoc, template.fields, offerData, fonts);
      
      console.log('Rendu PDF personnalisé terminé avec succès');
      return await pdfDoc.save();
      
    } catch (error) {
      console.error('Erreur lors du rendu PDF personnalisé:', error);
      throw new Error(`Erreur de rendu: ${error.message}`);
    }
  }

  /**
   * Charge les polices standard pour le rendu
   */
  private static async loadFonts(pdfDoc: PDFDocument): Promise<Record<string, PDFFont>> {
    return {
      helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
      helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      helveticaOblique: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
      helveticaBoldOblique: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
      timesRoman: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      timesRomanBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      courier: await pdfDoc.embedFont(StandardFonts.Courier),
      courierBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    };
  }

  /**
   * Rend tous les champs sur leurs pages respectives
   */
  private static async renderFieldsOnPages(
    pdfDoc: PDFDocument,
    fields: CustomPdfTemplateField[],
    offerData: Record<string, any>,
    fonts: Record<string, PDFFont>
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    
    // Grouper les champs par page
    const fieldsByPage = new Map<number, CustomPdfTemplateField[]>();
    fields.forEach(field => {
      const pageNum = field.position.page || 1;
      if (!fieldsByPage.has(pageNum)) {
        fieldsByPage.set(pageNum, []);
      }
      fieldsByPage.get(pageNum)!.push(field);
    });

    // Rendre les champs pour chaque page
    for (const [pageNum, pageFields] of fieldsByPage) {
      const pageIndex = pageNum - 1; // Les pages sont indexées à partir de 0
      
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        await this.renderFieldsOnPage(page, pageFields, offerData, fonts);
      } else {
        console.warn(`Page ${pageNum} non trouvée dans le PDF, ignorée`);
      }
    }
  }

  /**
   * Rend les champs sur une page spécifique
   */
  private static async renderFieldsOnPage(
    page: any,
    fields: CustomPdfTemplateField[],
    offerData: Record<string, any>,
    fonts: Record<string, PDFFont>
  ): Promise<void> {
    const pageSize = page.getSize();
    
    for (const field of fields) {
      try {
        // Résoudre la valeur du champ
        const value = CustomPdfFieldMapper.resolveFieldValue(field.mapping_key, offerData);
        
        if (value === null || value === undefined) {
          console.warn(`Valeur non trouvée pour le champ: ${field.mapping_key}`);
          continue;
        }

        // Formater la valeur selon le type
        const formattedValue = CustomPdfFieldMapper.formatValue(value, field.type, field.format);
        
        // Rendre le champ selon son type
        await this.renderField(page, field, formattedValue, fonts, pageSize);
        
      } catch (error) {
        console.error(`Erreur lors du rendu du champ ${field.id}:`, error);
        // Continuer avec les autres champs même en cas d'erreur
      }
    }
  }

  /**
   * Rend un champ individuel sur la page
   */
  private static async renderField(
    page: any,
    field: CustomPdfTemplateField,
    value: string,
    fonts: Record<string, PDFFont>,
    pageSize: { width: number; height: number }
  ): Promise<void> {
    const { position, style } = field;
    
    // Convertir les coordonnées mm vers points PDF (1 mm = 2.834645669 points)
    const x = position.x * 2.834645669;
    // Corriger l'inversion Y: soustraire la position Y convertie de la hauteur de page
    const y = pageSize.height - (position.y * 2.834645669);
    
    // Sélectionner la police
    const fontKey = this.getFontKey(style.fontFamily, style.fontWeight);
    const font = fonts[fontKey] || fonts.helvetica;
    
    // Convertir la couleur
    const color = this.parseColor(style.color);
    
    switch (field.type) {
      case 'text':
      case 'currency':
      case 'date':
      case 'number':
        // Rendre le texte avec gestion du débordement
        await this.renderTextWithWrapping(
          page,
          value,
          x,
          y,
          font,
          (style.fontSize || 12) * 0.75,
          color,
          style.textAlign,
          style.width
        );
        break;
        
      case 'table':
        // Pour les tables, render une version simplifiée
        await this.renderSimpleTable(page, value, x, y, font, (style.fontSize || 12) * 0.75, color);
        break;
        
      default:
        console.warn(`Type de champ non supporté: ${field.type}`);
    }
  }

  /**
   * Détermine la clé de police à utiliser
   */
  private static getFontKey(fontFamily: string, fontWeight: string): string {
    const family = fontFamily.toLowerCase();
    const weight = fontWeight.toLowerCase();
    
    if (family.includes('helvetica')) {
      if (weight === 'bold') return 'helveticaBold';
      return 'helvetica';
    }
    
    if (family.includes('times')) {
      if (weight === 'bold') return 'timesRomanBold';
      return 'timesRoman';
    }
    
    if (family.includes('courier')) {
      if (weight === 'bold') return 'courierBold';
      return 'courier';
    }
    
    // Par défaut
    return weight === 'bold' ? 'helveticaBold' : 'helvetica';
  }

  /**
   * Parse une couleur en format rgb pour pdf-lib
   */
  private static parseColor(colorString: string): { r: number; g: number; b: number } {
    // Gestion des couleurs hex (#RRGGBB)
    if (colorString.startsWith('#')) {
      const hex = colorString.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return { r, g, b };
    }
    
    // Gestion RGB/RGBA
    const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]) / 255,
        g: parseInt(rgbMatch[2]) / 255,
        b: parseInt(rgbMatch[3]) / 255
      };
    }
    
    // Couleurs par défaut
    return { r: 0, g: 0, b: 0 }; // Noir
  }

  /**
   * Rend du texte avec gestion du retour à la ligne
   */
  private static async renderTextWithWrapping(
    page: any,
    text: string,
    x: number,
    y: number,
    font: PDFFont,
    fontSize: number,
    color: { r: number; g: number; b: number },
    align: string = 'left',
    maxWidth?: number
  ): Promise<void> {
    const words = text.split(' ');
    const lineHeight = fontSize * 1.2;
    let currentLine = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (maxWidth && textWidth > maxWidth && currentLine) {
        // Rendre la ligne actuelle
        const lineX = this.getAlignedX(x, currentLine, font, fontSize, align, maxWidth);
        page.drawText(currentLine, {
          x: lineX,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(color.r, color.g, color.b),
        });
        
        currentLine = word;
        currentY -= lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    
    // Rendre la dernière ligne
    if (currentLine) {
      const lineX = this.getAlignedX(x, currentLine, font, fontSize, align, maxWidth);
      page.drawText(currentLine, {
        x: lineX,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(color.r, color.g, color.b),
      });
    }
  }

  /**
   * Calcule la position X selon l'alignement
   */
  private static getAlignedX(
    baseX: number,
    text: string,
    font: PDFFont,
    fontSize: number,
    align: string,
    maxWidth?: number
  ): number {
    if (!maxWidth || align === 'left') return baseX;
    
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    switch (align) {
      case 'center':
        return baseX + (maxWidth - textWidth) / 2;
      case 'right':
        return baseX + maxWidth - textWidth;
      default:
        return baseX;
    }
  }

  /**
   * Rend une table simple (version basique)
   */
  private static async renderSimpleTable(
    page: any,
    data: string,
    x: number,
    y: number,
    font: PDFFont,
    fontSize: number,
    color: { r: number; g: number; b: number }
  ): Promise<void> {
    try {
      // Tenter de parser comme JSON pour les données tabulaires
      const tableData = JSON.parse(data);
      
      if (Array.isArray(tableData)) {
        let currentY = y;
        const lineHeight = fontSize * 1.4;
        
        tableData.forEach((row, index) => {
          const rowText = typeof row === 'object' ? 
            Object.values(row).join(' | ') : 
            String(row);
          
          page.drawText(`${index + 1}. ${rowText}`, {
            x,
            y: currentY,
            size: fontSize,
            font: font,
            color: rgb(color.r, color.g, color.b),
          });
          
          currentY -= lineHeight;
        });
      }
    } catch (error) {
      // Si ce n'est pas du JSON, afficher comme texte simple
      page.drawText(data, {
        x,
        y,
        size: fontSize,
        font: font,
        color: rgb(color.r, color.g, color.b),
      });
    }
  }
}