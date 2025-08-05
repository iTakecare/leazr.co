import React, { useRef, useEffect, useState } from 'react';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        // Dynamically import PDF.js
        const pdfjsLib = await import('pdfjs-dist');
        
        // Configure worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        onLoadSuccess?.(pdf.numPages);
        
        // Render first page
        renderPage(pdf, currentPage);
      } catch (error) {
        console.error('PDF.js failed, falling back to iframe:', error);
        setUseFallback(true);
        onLoadError?.(error as Error);
      }
    };

    loadPdf();
  }, [url, onLoadSuccess, onLoadError]);

  useEffect(() => {
    if (pdfDoc && !useFallback) {
      renderPage(pdfDoc, currentPage);
    }
  }, [pdfDoc, currentPage, zoom, useFallback]);

  const renderPage = async (pdf: any, pageNumber: number) => {
    try {
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: zoom });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      onPageChange?.(pageNumber);
    } catch (error) {
      console.error('Error rendering PDF page:', error);
      setUseFallback(true);
    }
  };

  // Fallback to iframe if PDF.js fails
  if (useFallback) {
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
  }

  return (
    <div className={`bg-background rounded-lg overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto border border-border rounded"
        style={{
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  );
};