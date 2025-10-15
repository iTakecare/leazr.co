import React from 'react';
import { Page, View, Image, StyleSheet } from '@react-pdf/renderer';
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
  // CAS 1: Page avec image de fond
  if (page.sourceType === 'image' && page.backgroundImage?.url) {
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
  if (page.sourceType === 'pdf' && page.pdfSource?.convertedImageUrl) {
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
        { backgroundColor: page.backgroundColor || design.colors.background }
      ]}
    >
      <View style={getLayoutStyle()}>
        {page.blocks
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
};
