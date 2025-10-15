import React from 'react';
import { View, Image, StyleSheet } from '@react-pdf/renderer';
import { ContentBlock } from '@/hooks/useTemplateDesigner';

interface ImageBlockRendererProps {
  block: ContentBlock;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  image: {
    objectFit: 'contain',
  },
});

export const ImageBlockRenderer: React.FC<ImageBlockRendererProps> = ({ block }) => {
  const { content, style } = block;

  if (!content.url) return null;

  const imageStyle = {
    width: content.width || 200,
    height: content.height || 150,
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
        src={content.url} 
        style={[styles.image, imageStyle]}
      />
    </View>
  );
};
