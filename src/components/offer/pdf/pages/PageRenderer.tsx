import React from 'react';
import { Page, View, Image, Text, StyleSheet } from '@react-pdf/renderer';
import { CustomPage, TemplateDesign } from '@/hooks/useTemplateDesigner';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { DynamicOverlayRenderer } from '../overlays/DynamicOverlayRenderer';

interface PageRendererProps {
  page: CustomPage;
  design: TemplateDesign;
  companyLogo?: string;
  companyName?: string;
  offerData?: any;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  fullWidth: {
    flexDirection: 'column',
  },
  twoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  threeColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export const PageRenderer: React.FC<PageRendererProps> = ({ 
  page, 
  design, 
  companyLogo, 
  companyName,
  offerData 
}) => {
  // Valeur par défaut pour sourceType
  const sourceType = page.sourceType || 'blocks';
  
  console.log('[PageRenderer] Rendering page:', page.title, 'sourceType:', sourceType);
  
  try {
    // CAS 1: Page avec image de fond
    if (sourceType === 'image' && page.backgroundImage?.url) {
      console.log('[PageRenderer] Rendering image page with URL:', page.backgroundImage.url);
      return (
        <Page size="A4" style={styles.page}>
          {/* Image de fond */}
          <Image 
            src={page.backgroundImage.url} 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: page.backgroundImage.fit || 'cover',
              opacity: (page.backgroundImage.opacity || 100) / 100
            }}
          />
          
          {/* Overlays dynamiques */}
          {page.dynamicOverlays?.map(overlay => (
            <DynamicOverlayRenderer 
              key={overlay.id}
              overlay={overlay}
              offerData={offerData}
              companyName={companyName}
            />
          ))}
        </Page>
      );
    }
    
    // CAS 2: Page convertie depuis PDF
    if (sourceType === 'pdf' && page.pdfSource?.convertedImageUrl) {
      console.log('[PageRenderer] Rendering PDF page with converted image:', page.pdfSource.convertedImageUrl);
      return (
        <Page size="A4" style={styles.page}>
          <Image 
            src={page.pdfSource.convertedImageUrl} 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
          
          {/* Overlays dynamiques */}
          {page.dynamicOverlays?.map(overlay => (
            <DynamicOverlayRenderer 
              key={overlay.id}
              overlay={overlay}
              offerData={offerData}
              companyName={companyName}
            />
          ))}
        </Page>
      );
    }
    
    // CAS 3: Page avec blocs (existant)
    console.log('[PageRenderer] Rendering blocks page with', page.blocks?.length || 0, 'blocks');
    
    const getLayoutStyle = () => {
      switch (page.layout) {
        case 'two-columns':
          return styles.twoColumns;
        case 'three-columns':
          return styles.threeColumns;
        default:
          return styles.fullWidth;
      }
    };

    return (
      <Page 
        size="A4" 
        style={[
          styles.page,
          { backgroundColor: page.backgroundColor || design?.colors?.background || '#ffffff' }
        ]}
      >
        <View style={getLayoutStyle()}>
          {(page.blocks || [])
            .sort((a, b) => a.order - b.order)
            .map(block => (
              <BlockRenderer 
                key={block.id} 
                block={block} 
                design={design}
                companyLogo={companyLogo}
                companyName={companyName}
                offerData={offerData}
              />
            ))
          }
        </View>
      </Page>
    );
  } catch (error) {
    console.error('[PageRenderer] Error rendering page:', page.title, error);
    // Retourner une page d'erreur au lieu de crasher
    return (
      <Page size="A4" style={styles.page}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 12 }}>
            Erreur lors du rendu de la page: {page.title}
          </Text>
          <Text style={{ fontSize: 10, marginTop: 10 }}>
            {error instanceof Error ? error.message : 'Erreur inconnue'}
          </Text>
        </View>
      </Page>
    );
  }
};
