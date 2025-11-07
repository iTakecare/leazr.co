import React from 'react';
import { Text, View } from '@react-pdf/renderer';

/**
 * Convertit du HTML simple en composants PDF compatibles avec @react-pdf/renderer
 * Supporte: <p>, <strong>, <em>, <ul>, <li>, <br>, <h1>, <h2>, <h3>
 */

interface PDFTextElement {
  type: 'text' | 'paragraph' | 'heading' | 'list' | 'listItem' | 'break';
  content?: string;
  children?: PDFTextElement[];
  level?: number; // Pour les headings (1, 2, 3)
  style?: 'bold' | 'italic' | 'normal';
}

/**
 * Parse simple HTML en structure d'éléments
 */
function parseHTML(html: string): PDFTextElement[] {
  if (!html) return [];

  const elements: PDFTextElement[] = [];
  
  // Nettoyer le HTML
  let cleanHtml = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // Parser les paragraphes
  const pRegex = /<p>(.*?)<\/p>/gis;
  let match;
  
  while ((match = pRegex.exec(cleanHtml)) !== null) {
    const content = match[1].trim();
    if (content) {
      elements.push({
        type: 'paragraph',
        content: stripHTML(content),
        children: parseInlineHTML(content),
      });
    }
  }

  // Parser les headings
  for (let level = 1; level <= 3; level++) {
    const hRegex = new RegExp(`<h${level}>(.*?)<\/h${level}>`, 'gis');
    cleanHtml.replace(hRegex, (_, content) => {
      elements.push({
        type: 'heading',
        level,
        content: stripHTML(content.trim()),
      });
      return '';
    });
  }

  // Parser les listes
  const ulRegex = /<ul>(.*?)<\/ul>/gis;
  while ((match = ulRegex.exec(cleanHtml)) !== null) {
    const listContent = match[1];
    const items: PDFTextElement[] = [];
    
    const liRegex = /<li>(.*?)<\/li>/gis;
    let liMatch;
    while ((liMatch = liRegex.exec(listContent)) !== null) {
      items.push({
        type: 'listItem',
        content: stripHTML(liMatch[1].trim()),
      });
    }
    
    if (items.length > 0) {
      elements.push({
        type: 'list',
        children: items,
      });
    }
  }

  // Si aucun élément structuré n'a été trouvé, traiter comme texte simple
  if (elements.length === 0 && cleanHtml.trim()) {
    const plainText = stripHTML(cleanHtml);
    if (plainText.trim()) {
      elements.push({
        type: 'paragraph',
        content: plainText,
      });
    }
  }

  return elements;
}

/**
 * Parse les éléments inline (bold, italic)
 */
function parseInlineHTML(html: string): PDFTextElement[] {
  const elements: PDFTextElement[] = [];
  
  // Traiter le texte avec bold et italic
  const parts = html.split(/(<\/?(?:strong|b|em|i)>)/gi);
  let currentStyle: 'bold' | 'italic' | 'normal' = 'normal';
  
  parts.forEach(part => {
    if (part.match(/<(?:strong|b)>/i)) {
      currentStyle = 'bold';
    } else if (part.match(/<\/(?:strong|b)>/i)) {
      currentStyle = 'normal';
    } else if (part.match(/<(?:em|i)>/i)) {
      currentStyle = 'italic';
    } else if (part.match(/<\/(?:em|i)>/i)) {
      currentStyle = 'normal';
    } else if (part.trim()) {
      elements.push({
        type: 'text',
        content: stripHTML(part),
        style: currentStyle,
      });
    }
  });

  return elements.length > 0 ? elements : [{ type: 'text', content: stripHTML(html), style: 'normal' }];
}

/**
 * Supprime tous les tags HTML
 */
function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Rend les éléments parsés en composants PDF
 */
export function renderHTMLAsPDF(html: string, baseStyles: any): React.ReactNode {
  const elements = parseHTML(html);
  
  return elements.map((element, index) => {
    switch (element.type) {
      case 'heading':
        const headingSize = element.level === 1 ? 18 : element.level === 2 ? 16 : 14;
        return (
          <Text
            key={index}
            style={{
              ...baseStyles.text,
              fontSize: headingSize,
              fontFamily: 'Helvetica-Bold',
              marginBottom: 10,
              marginTop: 15,
            }}
          >
            {element.content}
          </Text>
        );

      case 'paragraph':
        if (element.children && element.children.length > 0) {
          return (
            <Text key={index} style={{ ...baseStyles.text, marginBottom: 8 }}>
              {element.children.map((child, childIndex) => {
                const fontFamily =
                  child.style === 'bold'
                    ? 'Helvetica-Bold'
                    : child.style === 'italic'
                    ? 'Helvetica-Oblique'
                    : 'Helvetica';
                
                return (
                  <Text key={childIndex} style={{ fontFamily }}>
                    {child.content}
                  </Text>
                );
              })}
            </Text>
          );
        }
        return (
          <Text key={index} style={{ ...baseStyles.text, marginBottom: 8 }}>
            {element.content}
          </Text>
        );

      case 'list':
        return (
          <View key={index} style={{ marginBottom: 10, marginLeft: 10 }}>
            {element.children?.map((item, itemIndex) => (
              <View key={itemIndex} style={baseStyles.listItem || { flexDirection: 'row', marginBottom: 4 }}>
                <Text style={baseStyles.bullet || { marginRight: 8 }}>•</Text>
                <Text style={baseStyles.listContent || baseStyles.text}>{item.content}</Text>
              </View>
            ))}
          </View>
        );

      case 'break':
        return <View key={index} style={{ height: 10 }} />;

      default:
        return null;
    }
  });
}
