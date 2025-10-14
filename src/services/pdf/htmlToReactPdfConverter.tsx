import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// Styles de base pour React-PDF
const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: '#ffffff',
  },
  view: {
    margin: 0,
    padding: 0,
  },
  text: {
    fontSize: 12,
    color: '#333333',
    fontFamily: 'Helvetica',
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heading3: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  image: {
    maxWidth: '100%',
    objectFit: 'contain',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
});

interface ConversionResult {
  document: JSX.Element;
  errors: string[];
}

/**
 * Convertit un HTML compilé en composants React-PDF
 */
export class HtmlToReactPdfConverter {
  private errors: string[] = [];

  /**
   * Convertit le HTML en Document React-PDF
   */
  public convert(htmlString: string): ConversionResult {
    this.errors = [];

    try {
      // Parser le HTML avec DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');

      // Extraire toutes les pages avec la classe "page"
      const pageElements = doc.querySelectorAll('.page');
      
      if (pageElements.length === 0) {
        // Si pas de pages explicites, traiter tout le body comme une page
        const pages = [this.convertPage(doc.body)];
        return {
          document: (
            <Document>
              {pages}
            </Document>
          ),
          errors: this.errors,
        };
      }

      // Convertir chaque page HTML en Page React-PDF
      const pages = Array.from(pageElements).map((pageEl, index) => 
        this.convertPage(pageEl as HTMLElement, index)
      );

      return {
        document: (
          <Document>
            {pages}
          </Document>
        ),
        errors: this.errors,
      };
    } catch (error) {
      this.errors.push(`Erreur de conversion: ${error.message}`);
      return {
        document: (
          <Document>
            <Page size="A4" style={styles.page}>
              <Text>Erreur lors de la conversion du PDF</Text>
            </Page>
          </Document>
        ),
        errors: this.errors,
      };
    }
  }

  /**
   * Convertit un élément HTML de page en composant Page React-PDF
   */
  private convertPage(pageElement: HTMLElement, pageIndex: number = 0): JSX.Element {
    const children = this.convertChildren(pageElement);

    return (
      <Page key={pageIndex} size="A4" style={styles.page}>
        {children}
      </Page>
    );
  }

  /**
   * Convertit récursivement les enfants d'un élément HTML
   */
  private convertChildren(element: HTMLElement): JSX.Element[] {
    const children: JSX.Element[] = [];
    
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];
      const converted = this.convertNode(node, i);
      if (converted) {
        children.push(converted);
      }
    }

    return children;
  }

  /**
   * Convertit un nœud HTML en composant React-PDF
   */
  private convertNode(node: Node, index: number): JSX.Element | null {
    // Nœud texte
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (!text) return null;
      return <Text key={index} style={styles.text}>{text}</Text>;
    }

    // Nœud élément
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      return this.convertElement(element, index);
    }

    return null;
  }

  /**
   * Convertit un élément HTML en composant React-PDF
   */
  private convertElement(element: HTMLElement, index: number): JSX.Element | null {
    const tagName = element.tagName.toLowerCase();
    const children = this.convertChildren(element);

    // Extraire les styles inline
    const inlineStyles = this.extractStyles(element);

    switch (tagName) {
      case 'div':
      case 'section':
      case 'article':
      case 'header':
      case 'footer':
        return (
          <View key={index} style={{ ...styles.view, ...inlineStyles }}>
            {children}
          </View>
        );

      case 'p':
        return (
          <Text key={index} style={{ ...styles.paragraph, ...inlineStyles }}>
            {children}
          </Text>
        );

      case 'h1':
        return (
          <Text key={index} style={{ ...styles.heading1, ...inlineStyles }}>
            {children}
          </Text>
        );

      case 'h2':
        return (
          <Text key={index} style={{ ...styles.heading2, ...inlineStyles }}>
            {children}
          </Text>
        );

      case 'h3':
        return (
          <Text key={index} style={{ ...styles.heading3, ...inlineStyles }}>
            {children}
          </Text>
        );

      case 'span':
        return (
          <Text key={index} style={{ ...styles.text, ...inlineStyles }}>
            {children}
          </Text>
        );

      case 'strong':
      case 'b':
        return (
          <Text key={index} style={{ ...styles.bold, ...inlineStyles }}>
            {children}
          </Text>
        );

      case 'em':
      case 'i':
        return (
          <Text key={index} style={{ ...styles.italic, ...inlineStyles }}>
            {children}
          </Text>
        );

      case 'img':
        const src = element.getAttribute('src');
        if (src) {
          return (
            <Image
              key={index}
              src={src}
              style={{ ...styles.image, ...inlineStyles }}
            />
          );
        }
        return null;

      case 'br':
        return <Text key={index}>{'\n'}</Text>;

      case 'ul':
      case 'ol':
        return (
          <View key={index} style={{ marginLeft: 20, ...inlineStyles }}>
            {children}
          </View>
        );

      case 'li':
        return (
          <View key={index} style={{ flexDirection: 'row', marginBottom: 5 }}>
            <Text style={styles.text}>• </Text>
            <View style={{ flex: 1 }}>
              {children}
            </View>
          </View>
        );

      case 'table':
        return (
          <View key={index} style={{ marginVertical: 10, ...inlineStyles }}>
            {children}
          </View>
        );

      case 'tr':
        return (
          <View key={index} style={{ flexDirection: 'row', borderBottom: '1px solid #e0e0e0' }}>
            {children}
          </View>
        );

      case 'td':
      case 'th':
        return (
          <View key={index} style={{ flex: 1, padding: 5, ...inlineStyles }}>
            {children}
          </View>
        );

      default:
        // Pour les balises non supportées, on retourne les enfants directement
        if (children.length > 0) {
          return (
            <View key={index} style={inlineStyles}>
              {children}
            </View>
          );
        }
        return null;
    }
  }

  /**
   * Extrait les styles CSS inline et les convertit en styles React-PDF
   */
  private extractStyles(element: HTMLElement): Record<string, any> {
    const styles: Record<string, any> = {};
    const style = element.getAttribute('style');
    
    if (!style) return styles;

    // Parser les styles inline
    const styleRules = style.split(';').map(s => s.trim()).filter(s => s);
    
    for (const rule of styleRules) {
      const [property, value] = rule.split(':').map(s => s.trim());
      
      // Conversion des propriétés CSS courantes
      switch (property) {
        case 'color':
          styles.color = value;
          break;
        case 'background-color':
        case 'backgroundColor':
          styles.backgroundColor = value;
          break;
        case 'font-size':
        case 'fontSize':
          styles.fontSize = this.parseFontSize(value);
          break;
        case 'font-weight':
        case 'fontWeight':
          styles.fontWeight = value;
          break;
        case 'text-align':
        case 'textAlign':
          styles.textAlign = value;
          break;
        case 'margin':
          styles.margin = this.parseSpacing(value);
          break;
        case 'padding':
          styles.padding = this.parseSpacing(value);
          break;
        case 'margin-top':
        case 'marginTop':
          styles.marginTop = this.parseSpacing(value);
          break;
        case 'margin-bottom':
        case 'marginBottom':
          styles.marginBottom = this.parseSpacing(value);
          break;
        case 'padding-top':
        case 'paddingTop':
          styles.paddingTop = this.parseSpacing(value);
          break;
        case 'padding-bottom':
        case 'paddingBottom':
          styles.paddingBottom = this.parseSpacing(value);
          break;
        case 'width':
          styles.width = value;
          break;
        case 'height':
          styles.height = value;
          break;
      }
    }

    return styles;
  }

  /**
   * Parse une valeur de font-size (px, pt, em → pt pour PDF)
   */
  private parseFontSize(value: string): number {
    const match = value.match(/^(\d+(?:\.\d+)?)(px|pt|em)?$/);
    if (!match) return 12;
    
    const num = parseFloat(match[1]);
    const unit = match[2] || 'pt';
    
    switch (unit) {
      case 'px': return num * 0.75; // 1px ≈ 0.75pt
      case 'em': return num * 12; // 1em ≈ 12pt
      case 'pt': return num;
      default: return 12;
    }
  }

  /**
   * Parse une valeur d'espacement (px, mm → pt pour PDF)
   */
  private parseSpacing(value: string): number | string {
    const match = value.match(/^(\d+(?:\.\d+)?)(px|mm|pt)?$/);
    if (!match) return value;
    
    const num = parseFloat(match[1]);
    const unit = match[2] || 'pt';
    
    switch (unit) {
      case 'px': return num * 0.75;
      case 'mm': return num * 2.83465; // 1mm ≈ 2.83pt
      case 'pt': return num;
      default: return num;
    }
  }
}

export const htmlToReactPdfConverter = new HtmlToReactPdfConverter();
