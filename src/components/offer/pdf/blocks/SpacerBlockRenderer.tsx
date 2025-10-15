import React from 'react';
import { View } from '@react-pdf/renderer';
import { ContentBlock } from '@/hooks/useTemplateDesigner';

interface SpacerBlockRendererProps {
  block: ContentBlock;
}

export const SpacerBlockRenderer: React.FC<SpacerBlockRendererProps> = ({ block }) => {
  const { content } = block;

  return (
    <View 
      style={{ 
        width: block.width,
        height: content.height || 20
      }} 
    />
  );
};
