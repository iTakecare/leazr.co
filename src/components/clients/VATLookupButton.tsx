import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VATLookupButtonProps {
  vatNumber: string;
  onLookupSuccess: (data: {
    companyName: string;
    address: string;
  }) => void;
  disabled?: boolean;
}

export const VATLookupButton: React.FC<VATLookupButtonProps> = ({
  vatNumber,
  onLookupSuccess,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleVIESLookup = async () => {
    if (!vatNumber || vatNumber.length < 4) {
      toast.error('Veuillez saisir un numéro de TVA valide');
      return;
    }

    setIsLoading(true);
    
    try {
      // Parse country code and VAT number
      let countryCode = '';
      let cleanVatNumber = vatNumber.replace(/\s/g, '').toUpperCase();
      
      // Extract country code (first 2 letters)
      if (cleanVatNumber.length >= 4 && /^[A-Z]{2}/.test(cleanVatNumber)) {
        countryCode = cleanVatNumber.substring(0, 2);
        cleanVatNumber = cleanVatNumber.substring(2);
      } else {
        // Try to detect country from format
        if (cleanVatNumber.startsWith('BE')) {
          countryCode = 'BE';
          cleanVatNumber = cleanVatNumber.substring(2);
        } else {
          toast.error('Format du numéro de TVA non reconnu. Utilisez le format: BE0123456789');
          return;
        }
      }

      console.log('🔍 VIES Lookup:', { countryCode, cleanVatNumber });

      const { data, error } = await supabase.functions.invoke('vies-verify', {
        body: {
          country: countryCode,
          vatNumber: cleanVatNumber
        }
      });

      if (error) {
        console.error('VIES Error:', error);
        toast.error('Erreur lors de la vérification VIES');
        return;
      }

      console.log('📋 VIES Response:', data);

      if (data?.valid) {
        toast.success('Données récupérées avec succès depuis VIES');
        onLookupSuccess({
          companyName: data.companyName || '',
          address: data.address || ''
        });
      } else {
        toast.warning('Numéro de TVA non trouvé dans la base VIES');
      }
    } catch (error) {
      console.error('VIES Lookup error:', error);
      toast.error('Erreur lors de la recherche VIES');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleVIESLookup}
      disabled={disabled || isLoading || !vatNumber}
      className="shrink-0"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Search className="h-4 w-4" />
      )}
    </Button>
  );
};