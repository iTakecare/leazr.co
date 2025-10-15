import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ContentBlock, TemplateDesign } from '@/hooks/useTemplateDesigner';

interface StatsBlockRendererProps {
  block: ContentBlock;
  design: TemplateDesign;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    padding: 15,
    minWidth: 150,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
  },
});

export const StatsBlockRenderer: React.FC<StatsBlockRendererProps> = ({ block, design }) => {
  const { content, style } = block;

  if (!content.stats || content.stats.length === 0) return null;

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
      <View style={styles.grid}>
        {content.stats.map((stat: any, index: number) => (
          <View key={index} style={styles.stat}>
            <Text style={[styles.value, { color: design.colors.primary }]}>
              {stat.value}
            </Text>
            <Text style={[styles.label, { color: design.colors.text }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
