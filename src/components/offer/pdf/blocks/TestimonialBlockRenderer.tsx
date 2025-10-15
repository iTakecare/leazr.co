import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ContentBlock, TemplateDesign } from '@/hooks/useTemplateDesigner';

interface TestimonialBlockRendererProps {
  block: ContentBlock;
  design: TemplateDesign;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    padding: 15,
    borderLeft: '3px solid',
  },
  quote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  author: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  company: {
    fontSize: 9,
  },
});

export const TestimonialBlockRenderer: React.FC<TestimonialBlockRendererProps> = ({ block, design }) => {
  const { content, style } = block;

  if (!content.quote) return null;

  return (
    <View 
      style={[
        styles.container,
        { 
          width: block.width,
          borderLeftColor: design.colors.primary,
          padding: style?.padding || 15,
          margin: style?.margin || 0
        }
      ]}
    >
      <Text style={[styles.quote, { color: design.colors.text }]}>
        "{content.quote}"
      </Text>
      {content.author && (
        <Text style={[styles.author, { color: design.colors.text }]}>
          — {content.author}
        </Text>
      )}
      {content.company && (
        <Text style={[styles.company, { color: design.colors.secondary }]}>
          {content.company}
        </Text>
      )}
    </View>
  );
};
