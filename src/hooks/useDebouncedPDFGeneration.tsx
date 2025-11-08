import { useState, useEffect } from 'react';
import { generateOfferPDFWithOverrides } from '@/services/clientPdfService';
import { OfferPDFData } from '@/components/pdf/templates/OfferPDFDocument';

export const useDebouncedPDFGeneration = (
  offerId: string,
  pdfType: 'client' | 'internal',
  editedData: Partial<OfferPDFData>,
  delay: number = 500
) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsGenerating(true);
      setError(null);
      try {
        const blob = await generateOfferPDFWithOverrides(offerId, pdfType, editedData);
        setPdfBlob(blob);
      } catch (err) {
        console.error('[PDF-PREVIEW-EDITOR] Generation error:', err);
        setError(err instanceof Error ? err.message : 'Erreur de génération du PDF');
      } finally {
        setIsGenerating(false);
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [offerId, pdfType, JSON.stringify(editedData), delay]);
  
  return { pdfBlob, isGenerating, error };
};
