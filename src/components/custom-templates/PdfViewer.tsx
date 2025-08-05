import React from 'react';

interface PdfViewerProps {
  url: string;
  currentPage?: number;
  zoom?: number;
  onPageChange?: (page: number) => void;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  className?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  currentPage = 1,
  zoom = 1.0,
  onPageChange,
  onLoadSuccess,
  onLoadError,
  className = ''
}) => {
  // Simple iframe fallback - uniquement pour les dialogues de prévisualisation
  return (
    <div className={`bg-background rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={url}
        className="w-full h-full border border-border rounded"
        title="PDF Viewer"
        style={{ 
          minHeight: '400px',
          transform: `scale(${zoom})`,
          transformOrigin: 'top left'
        }}
        onLoad={() => onLoadSuccess?.(1)}
        onError={(e) => {
          console.error('Error loading PDF iframe:', e);
          onLoadError?.(new Error('Failed to load PDF'));
        }}
      />
    </div>
  );
};