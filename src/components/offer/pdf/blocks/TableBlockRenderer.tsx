import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { ContentBlock, TemplateDesign } from '@/hooks/useTemplateDesigner';

interface TableBlockRendererProps {
  block: ContentBlock;
  design: TemplateDesign;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    width: '100%',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  headerRow: {
    backgroundColor: '#f8f9fa',
  },
  cell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
  },
  headerCell: {
    fontWeight: 'bold',
  },
});

export const TableBlockRenderer: React.FC<TableBlockRendererProps> = ({ block, design }) => {
  const { content, style } = block;

  if (!content.headers || !content.rows || content.rows.length === 0) return null;

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
      <View style={[styles.table, { borderColor: design.colors.secondary }]}>
        {/* Header */}
        <View style={[styles.row, styles.headerRow, { borderBottomColor: design.colors.secondary }]}>
          {content.headers.map((header: string, index: number) => (
            <Text key={index} style={[styles.cell, styles.headerCell, { color: design.colors.text }]}>
              {header}
            </Text>
          ))}
        </View>
        
        {/* Rows */}
        {content.rows.map((row: string[], rowIndex: number) => (
          <View key={rowIndex} style={[styles.row, { borderBottomColor: design.colors.secondary }]}>
            {row.map((cell: string, cellIndex: number) => (
              <Text key={cellIndex} style={[styles.cell, { color: design.colors.text }]}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};
