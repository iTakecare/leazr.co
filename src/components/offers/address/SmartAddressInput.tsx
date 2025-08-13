import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

interface AddressSuggestion {
  id: string;
  full_address: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  frequency: number; // Nombre d'utilisations
  last_used: string;
  is_validated: boolean;
}

interface SmartAddressInputProps {
  value: {
    address: string;
    city: string;
    postal_code: string;
    country: string;
  };
  onChange: (address: {
    address: string;
    city: string;
    postal_code: string;
    country: string;
  }) => void;
  companyId?: string;
  placeholder?: string;
  disabled?: boolean;
}

const SmartAddressInput: React.FC<SmartAddressInputProps> = ({
  value,
  onChange,
  companyId,
  placeholder = "Commencez à taper une adresse...",
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [recentAddresses, setRecentAddresses] = useState<AddressSuggestion[]>([]);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const debouncedInputValue = useDebounce(inputValue, 300);

  // Charger les adresses récentes de l'entreprise
  const loadRecentAddresses = async () => {
    if (!companyId) return;

    try {
      // Dans un vrai projet, ces données viendraient d'une table dédiée aux adresses fréquentes
      // Ici on simule avec les adresses de livraison existantes
      const { data, error } = await supabase
        .from('offer_equipment')
        .select('delivery_address, delivery_city, delivery_postal_code, delivery_country')
        .eq('delivery_type', 'specific_address')
        .not('delivery_address', 'is', null)
        .limit(10);

      if (error) {
        console.error('Erreur lors du chargement des adresses récentes:', error);
        return;
      }

      // Grouper et compter les adresses similaires
      const addressMap = new Map<string, AddressSuggestion>();
      
      data?.forEach(item => {
        const key = `${item.delivery_address}-${item.delivery_city}`;
        if (addressMap.has(key)) {
          const existing = addressMap.get(key)!;
          addressMap.set(key, { ...existing, frequency: existing.frequency + 1 });
        } else {
          addressMap.set(key, {
            id: key,
            full_address: `${item.delivery_address}, ${item.delivery_city}`,
            street: item.delivery_address || '',
            city: item.delivery_city || '',
            postal_code: item.delivery_postal_code || '',
            country: item.delivery_country || 'BE',
            frequency: 1,
            last_used: new Date().toISOString(),
            is_validated: true
          });
        }
      });

      const recent = Array.from(addressMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      setRecentAddresses(recent);
    } catch (error) {
      console.error('Erreur lors du chargement des adresses récentes:', error);
    }
  };

  // Rechercher des suggestions d'adresses
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Recherche dans les adresses existantes
      const localSuggestions = recentAddresses.filter(addr =>
        addr.full_address.toLowerCase().includes(query.toLowerCase())
      );

      // Dans un vrai projet, on ferait aussi appel à une API de géocodage
      // comme Google Places API, HERE API, ou OpenStreetMap Nominatim
      const mockApiSuggestions: AddressSuggestion[] = [
        {
          id: `api-1-${query}`,
          full_address: `${query} 123, 1000 Bruxelles`,
          street: `${query} 123`,
          city: 'Bruxelles',
          postal_code: '1000',
          country: 'BE',
          frequency: 0,
          last_used: new Date().toISOString(),
          is_validated: false
        },
        {
          id: `api-2-${query}`,
          full_address: `${query} 456, 2000 Anvers`,
          street: `${query} 456`,
          city: 'Anvers',
          postal_code: '2000',
          country: 'BE',
          frequency: 0,
          last_used: new Date().toISOString(),
          is_validated: false
        }
      ];

      setSuggestions([...localSuggestions, ...mockApiSuggestions]);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresses:', error);
      toast.error('Erreur lors de la recherche d\'adresses');
    } finally {
      setLoading(false);
    }
  };

  // Valider une adresse
  const validateAddress = async (address: AddressSuggestion) => {
    setValidationStatus('validating');
    
    try {
      // Simulation de validation d'adresse
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dans un vrai projet, on validerait l'adresse via une API de géocodage
      const isValid = Math.random() > 0.2; // 80% de chance d'être valide
      
      setValidationStatus(isValid ? 'valid' : 'invalid');
      
      if (isValid) {
        // Sauvegarder l'adresse validée
        await saveValidatedAddress(address);
      } else {
        toast.warning('Adresse non valide ou introuvable');
      }
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      setValidationStatus('invalid');
    }
  };

  // Sauvegarder une adresse validée
  const saveValidatedAddress = async (address: AddressSuggestion) => {
    if (!companyId) return;

    try {
      // Dans un vrai projet, on sauvegarderait dans une table d'historique
      console.log('Adresse validée et sauvegardée:', address);
      
      // Mettre à jour la fréquence d'utilisation
      const updatedRecent = recentAddresses.map(addr =>
        addr.id === address.id 
          ? { ...addr, frequency: addr.frequency + 1, last_used: new Date().toISOString() }
          : addr
      );
      
      if (!recentAddresses.find(addr => addr.id === address.id)) {
        updatedRecent.unshift({ ...address, frequency: 1, is_validated: true });
      }
      
      setRecentAddresses(updatedRecent.slice(0, 5));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handleAddressSelect = async (address: AddressSuggestion) => {
    onChange({
      address: address.street,
      city: address.city,
      postal_code: address.postal_code,
      country: address.country
    });
    
    setInputValue(address.full_address);
    setOpen(false);
    
    if (!address.is_validated) {
      await validateAddress(address);
    }
  };

  const currentFullAddress = useMemo(() => {
    if (value.address && value.city) {
      return `${value.address}, ${value.postal_code} ${value.city}`;
    }
    return '';
  }, [value]);

  useEffect(() => {
    setInputValue(currentFullAddress);
  }, [currentFullAddress]);

  useEffect(() => {
    loadRecentAddresses();
  }, [companyId]);

  useEffect(() => {
    if (debouncedInputValue) {
      searchAddresses(debouncedInputValue);
    }
  }, [debouncedInputValue]);

  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <div className="w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />;
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setValidationStatus('idle');
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getValidationIcon()}
            </div>
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-[400px] p-0" side="bottom" align="start">
          <Command>
            <CommandInput 
              placeholder="Rechercher une adresse..." 
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList className="max-h-64">
              {loading && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Recherche en cours...
                </div>
              )}
              
              {recentAddresses.length > 0 && !inputValue && (
                <CommandGroup heading="Adresses récentes">
                  {recentAddresses.map((address) => (
                    <CommandItem
                      key={address.id}
                      value={address.full_address}
                      onSelect={() => handleAddressSelect(address)}
                      className="flex items-center gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{address.full_address}</div>
                          <div className="text-xs text-muted-foreground">
                            Utilisée {address.frequency} fois
                          </div>
                        </div>
                      </div>
                      {address.is_validated && (
                        <Badge variant="secondary" className="text-xs">
                          Validée
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((address) => (
                    <CommandItem
                      key={address.id}
                      value={address.full_address}
                      onSelect={() => handleAddressSelect(address)}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{address.full_address}</div>
                        {address.frequency > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Utilisée {address.frequency} fois
                          </div>
                        )}
                      </div>
                      {address.is_validated && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {!loading && inputValue.length >= 3 && suggestions.length === 0 && (
                <CommandEmpty>
                  Aucune adresse trouvée pour "{inputValue}"
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {validationStatus === 'invalid' && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Adresse non valide ou introuvable
        </p>
      )}
      
      {validationStatus === 'valid' && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Adresse validée et enregistrée
        </p>
      )}
    </div>
  );
};

export default SmartAddressInput;