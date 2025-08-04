import React from 'react';
import { cn } from '@/lib/utils';

interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  color?: 'primary' | 'secondary';
}

interface FieldAlignmentGuidesProps {
  guides: AlignmentGuide[];
  containerRef: React.RefObject<HTMLDivElement>;
  zoomLevel: number;
  className?: string;
}

export const FieldAlignmentGuides: React.FC<FieldAlignmentGuidesProps> = ({
  guides,
  containerRef,
  zoomLevel,
  className
}) => {
  const containerRect = containerRef.current?.getBoundingClientRect();
  
  if (!containerRect || guides.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn("absolute inset-0 pointer-events-none z-20", className)}
      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
    >
      {guides.map((guide, index) => (
        <div
          key={index}
          className={cn(
            "absolute transition-opacity duration-200",
            guide.type === 'horizontal' 
              ? "w-full h-0.5 left-0" 
              : "h-full w-0.5 top-0",
            guide.color === 'primary' 
              ? "bg-primary shadow-lg" 
              : "bg-accent"
          )}
          style={{
            [guide.type === 'horizontal' ? 'top' : 'left']: `${guide.position}px`,
            boxShadow: guide.color === 'primary' 
              ? '0 0 8px hsl(var(--primary) / 0.6)' 
              : '0 0 4px hsl(var(--accent) / 0.4)'
          }}
        />
      ))}
    </div>
  );
};