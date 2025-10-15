import React from 'react';
import { Page, View, StyleSheet } from '@react-pdf/renderer';
import { CustomPage, TemplateDesign } from '@/hooks/useTemplateDesigner';
import { BlockRenderer } from '../blocks/BlockRenderer';

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
