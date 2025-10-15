import React from 'react';
import { ContentBlock, TemplateDesign } from '@/hooks/useTemplateDesigner';
import { TextBlockRenderer } from './TextBlockRenderer';
import { ImageBlockRenderer } from './ImageBlockRenderer';
import { LogoBlockRenderer } from './LogoBlockRenderer';
import { StatsBlockRenderer } from './StatsBlockRenderer';
import { TestimonialBlockRenderer } from './TestimonialBlockRenderer';
import { ListBlockRenderer } from './ListBlockRenderer';
import { TableBlockRenderer } from './TableBlockRenderer';
import { SpacerBlockRenderer } from './SpacerBlockRenderer';

interface BlockRendererProps {
  block: ContentBlock;
  design: TemplateDesign;
  companyLogo?: string;
  companyName?: string;
  offerData?: any;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ 
  block, 
  design, 
  companyLogo, 
  companyName,
  offerData 
}) => {
  const props = { block, design, companyLogo, companyName, offerData };

  switch (block.type) {
    case 'text':
      return <TextBlockRenderer {...props} />;
    case 'image':
      return <ImageBlockRenderer {...props} />;
    case 'logo':
      return <LogoBlockRenderer {...props} />;
    case 'stats':
      return <StatsBlockRenderer {...props} />;
    case 'testimonial':
      return <TestimonialBlockRenderer {...props} />;
    case 'list':
      return <ListBlockRenderer {...props} />;
    case 'table':
      return <TableBlockRenderer {...props} />;
    case 'spacer':
      return <SpacerBlockRenderer {...props} />;
    default:
      return null;
  }
};
