import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CompanyLookupButtonProps {
  companyNumber: string;
  onLookupSuccess: (data: {
    companyName: string;
    address: string;
    postalCode?: string;
    city?: string;
  }) => void;
  disabled?: boolean;
}

type IdentifierType = 'vat' | 'siren' | 'siret' | 'belgian_company' | 'rcs' | 'unknown';

export const CompanyLookupButton: React.FC<CompanyLookupButtonProps> = ({
  companyNumber,
  onLookupSuccess,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const detectIdentifierType = (input: string): { type: IdentifierType; country?: string } => {
    const clean = input.replace(/\s/g, '').toUpperCase();
    
    // VAT number detection (with country code)
    if (/^[A-Z]{2}\d+$/.test(clean)) {
      const country = clean.substring(0, 2);
      if (['BE', 'FR', 'LU'].includes(country)) {
        return { type: 'vat', country };
      }
    }
    
    // SIREN (9 digits exactly)
    if (/^\d{9}$/.test(clean)) {
      return { type: 'siren' };
    }
    
    // SIRET (14 digits exactly)
    if (/^\d{14}$/.test(clean)) {
      return { type: 'siret' };
    }
    
    // Belgian company number (10 digits, with or without dots)
    const belgianClean = clean.replace(/\./g, '');
    if (/^\d{10}$/.test(belgianClean)) {
      return { type: 'belgian_company' };
    }
    
    // RCS Luxembourg pattern (need to define specific format)
    if (/^[A-Z]\d{6,8}$/.test(clean)) {
      return { type: 'rcs' };
    }
    
    return { type: 'unknown' };
  };

  const handleLookup = async () => {
    if (!companyNumber || companyNumber.length < 4) {
      toast.error('Veuillez saisir un numéro d\'entreprise ou de TVA valide');
      return;
    }

    setIsLoading(true);
    
    try {
      const { type, country } = detectIdentifierType(companyNumber);
      console.log('🔍 Company Lookup:', { type, country, input: companyNumber });

      let lookupResult = null;

      // Try national APIs first
      switch (type) {
        case 'siren':
        case 'siret':
          lookupResult = await handleFranceLookup(companyNumber, type);
          break;
        case 'belgian_company':
          lookupResult = await handleBelgiumLookup(companyNumber);
          break;
        case 'rcs':
          lookupResult = await handleLuxembourgLookup(companyNumber);
          break;
        case 'vat':
          if (country) {
            lookupResult = await handleVATLookup(companyNumber, country);
          }
          break;
        default:
          toast.error('Format non reconnu. Formats acceptés: TVA (BE/FR/LU), SIREN (9 chiffres), SIRET (14 chiffres), N° entreprise belge (10 chiffres)');
          return;
      }

      if (lookupResult && lookupResult.success) {
        onLookupSuccess(lookupResult.data);
        toast.success(`Données récupérées avec succès`);
      } else {
        toast.warning('Aucune information trouvée pour ce numéro');
      }
    } catch (error) {
      console.error('Company lookup error:', error);
      toast.error('Erreur lors de la recherche d\'entreprise');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFranceLookup = async (number: string, type: 'siren' | 'siret') => {
    try {
      const { data, error } = await supabase.functions.invoke('france-company-lookup', {
        body: { number, type }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('France lookup error:', error);
      return null;
    }
  };

  const handleBelgiumLookup = async (number: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('belgium-company-lookup', {
        body: { number }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Belgium lookup error:', error);
      return null;
    }
  };

  const handleLuxembourgLookup = async (number: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('luxembourg-company-lookup', {
        body: { number }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Luxembourg lookup error:', error);
      return null;
    }
  };

  const handleVATLookup = async (vatNumber: string, country: string) => {
    try {
      const cleanVat = vatNumber.replace(/\s/g, '').toUpperCase().substring(2); // Remove country code
      
      const { data, error } = await supabase.functions.invoke('vies-verify', {
        body: {
          country,
          vatNumber: cleanVat
        }
      });

      if (error) throw error;
      
      if (data?.valid) {
        const parseAddress = (fullAddress: string) => {
          const lines = fullAddress.split('\n').filter(line => line.trim() !== '');
          
          let streetAddress = '';
          let postalCode = '';
          let city = '';
          
          if (lines.length >= 2) {
            streetAddress = lines[0].trim();
            
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              const match = line.match(/^(\d{4,5})\s+(.+)$/);
              if (match) {
                postalCode = match[1];
                city = match[2];
                break;
              }
            }
          }
          
          return {
            streetAddress: streetAddress || fullAddress,
            postalCode,
            city
          };
        };
        
        const parsedAddress = parseAddress(data.address || '');
        
        return {
          success: true,
          data: {
            companyName: data.companyName || '',
            address: parsedAddress.streetAddress,
            postalCode: parsedAddress.postalCode,
            city: parsedAddress.city
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('VIES lookup error:', error);
      return null;
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleLookup}
      disabled={disabled || isLoading || !companyNumber}
      className="shrink-0"
      title="Rechercher les informations de l'entreprise (TVA, SIREN, SIRET, CBE, RCS)"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Search className="h-4 w-4" />
      )}
    </Button>
  );
};