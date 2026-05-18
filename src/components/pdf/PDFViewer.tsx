import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  filename: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  isOpen,
  onClose,
  pdfBlob,
  filename,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Crée un URL de blob local (same-origin) — affichable nativement dans une
  // iframe sans dépendre du worker PDF.js ni de l'en-tête X-Frame-Options.
  useEffect(() => {
    if (!pdfBlob || !isOpen) {
      setBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(pdfBlob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBlob, isOpen]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span className="truncate">{filename}</span>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!blobUrl}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30 rounded-lg">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              title={filename}
              className="w-full h-full rounded-lg border-0 bg-white"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Chargement du PDF...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
