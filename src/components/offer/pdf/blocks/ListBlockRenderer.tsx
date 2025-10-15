import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ContentBlock, TemplateDesign } from '@/hooks/useTemplateDesigner';

interface ListBlockRendererProps {
  block: ContentBlock;
  design: TemplateDesign;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bullet: {
    width: 20,
  },
  text: {
    flex: 1,
  },
});

export const ListBlockRenderer: React.FC<ListBlockRendererProps> = ({ block, design }) => {
  const { content, style } = block;

  if (!content.items || content.items.length === 0) return null;

  const getBullet = (index: number) => {
    switch (content.style) {
      case 'numbered':
        return `${index + 1}.`;
      case 'checkmarks':
        return '✓';
      default:
        return '•';
    }
  };

  const textStyle = {
    fontSize: style?.fontSize || design.fonts.body.size,
    color: style?.color || design.colors.text,
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
      {content.items.map((item: string, index: number) => (
        <View key={index} style={styles.item}>
          <Text style={[styles.bullet, textStyle]}>
            {getBullet(index)}
          </Text>
          <Text style={[styles.text, textStyle]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
};
