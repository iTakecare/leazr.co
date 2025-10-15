import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ContentBlock, TemplateDesign } from '@/hooks/useTemplateDesigner';

interface TextBlockRendererProps {
  block: ContentBlock;
  design: TemplateDesign;
  companyName?: string;
  offerData?: any;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  text: {
    fontFamily: 'Helvetica',
  },
});

export const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({ 
  block, 
  design, 
  companyName,
  offerData 
}) => {
  const { content, style } = block;
  
  // Replace variables
  let text = content.text || '';
  if (companyName) {
    text = text.replace(/{company_name}/g, companyName);
  }
  if (offerData?.client_name) {
    text = text.replace(/{client_name}/g, offerData.client_name);
  }
  if (offerData?.total_amount) {
    text = text.replace(/{total_amount}/g, offerData.total_amount.toString());
  }
  
  const textStyle = {
    fontSize: style?.fontSize || design.fonts.body.size,
    color: style?.color || design.colors.text,
    fontWeight: style?.fontWeight || 'normal',
    textAlign: style?.align || 'left',
    padding: style?.padding || 0,
    margin: style?.margin || 0,
  };

  if (content.isTitle) {
    textStyle.fontSize = style?.fontSize || design.fonts.title.size;
    textStyle.fontWeight = 'bold';
  }

  return (
    <View 
      style={[
        styles.container,
        { 
          width: block.width,
          paddingHorizontal: style?.padding || 0,
          marginVertical: style?.margin || 0
        }
      ]}
    >
      <Text style={[styles.text, textStyle]}>
        {text}
      </Text>
    </View>
  );
};
