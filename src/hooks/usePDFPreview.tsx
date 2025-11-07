import { useState, useCallback } from 'react';

interface PDFPreviewState {
  isOpen: boolean;
  pdfBlob: Blob | null;
  filename: string;
}

export function usePDFPreview() {
  const [state, setState] = useState<PDFPreviewState>({
    isOpen: false,
    pdfBlob: null,
    filename: '',
  });

  const openPDFPreview = useCallback((blob: Blob, filename: string) => {
    setState({
      isOpen: true,
      pdfBlob: blob,
      filename,
    });
  }, []);

  const closePDFPreview = useCallback(() => {
    // Clean up the blob URL if needed
    if (state.pdfBlob) {
      // The blob will be garbage collected
    }
    
    setState({
      isOpen: false,
      pdfBlob: null,
      filename: '',
    });
  }, [state.pdfBlob]);

  return {
    isOpen: state.isOpen,
    pdfBlob: state.pdfBlob,
    filename: state.filename,
    openPDFPreview,
    closePDFPreview,
  };
}
