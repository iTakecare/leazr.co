import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

// Set worker path
GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadingTask = getDocument(url);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        onLoadSuccess?.(pdf.numPages);
      } catch (err) {
        console.error('Error loading PDF:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF';
        setError(errorMessage);
        onLoadError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      loadPdf();
    }
  }, [url, onLoadSuccess, onLoadError]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || currentPage < 1 || currentPage > numPages) {
        return;
      }

      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) return;

        const viewport = page.getViewport({ scale: zoom });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        onPageChange?.(currentPage);
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render page');
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, zoom, numPages, onPageChange]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Chargement du PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="text-center text-destructive">
          <p className="text-sm">Erreur de chargement</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background rounded-lg overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto border border-border"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
};