import React from 'react';
import { View, Image, StyleSheet } from '@react-pdf/renderer';
import { ContentBlock } from '@/hooks/useTemplateDesigner';

interface LogoBlockRendererProps {
  block: ContentBlock;
  companyLogo?: string;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  logo: {
    objectFit: 'contain',
  },
});

export const LogoBlockRenderer: React.FC<LogoBlockRendererProps> = ({ block, companyLogo }) => {
  const { content, style } = block;

  const logoUrl = content.useCompanyLogo ? companyLogo : content.customLogoUrl;
  if (!logoUrl) return null;

  const logoStyle = {
    width: content.size || 120,
    height: content.size || 120,
    alignSelf: (content.position === 'center' ? 'center' : content.position === 'right' ? 'flex-end' : 'flex-start') as 'center' | 'flex-end' | 'flex-start',
  };

  return (
    <View 
      style={[
        styles.container,
        { 
          width: block.width,
          padding: style?.padding || 0,
          margin: style?.margin || 0
        }
      ]}
    >
      <Image 
        src={logoUrl} 
        style={[styles.logo, logoStyle]}
      />
    </View>
  );
};
