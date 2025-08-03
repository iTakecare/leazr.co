import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { useQuery } from '@tanstack/react-query';
import { 
  searchPostalCodes, 
  searchPostalCodesUnlimited,
  getCitiesByPostalCode, 
  getDefaultCountryForCompany,
  PostalCodeResult 
} from '@/services/postalCodeService';
import { debounce } from 'lodash';
import { MapPin } from 'lucide-react';

interface PostalCodeInputProps {
  postalCode: string;
  city: string;
  country: string;
  onPostalCodeChange: (postalCode: string) => void;
  onCityChange: (city: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PostalCodeInput: React.FC<PostalCodeInputProps> = ({
  postalCode,
  city,
  country,
  onPostalCodeChange,
  onCityChange,
  disabled = false,
  className,
}) => {

  const [postalCodeQuery, setPostalCodeQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get default country for company (for fallback)
  const { data: defaultCountry } = useQuery({
    queryKey: ['default-country'],
    queryFn: getDefaultCountryForCompany,
  });

  // Debounced postal code search
  const debouncedPostalCodeSearch = useMemo(
    () => debounce((query: string) => {
      console.log('🕐 DEBOUNCE - Postal code search triggered:', {
        query,
        length: query.length,
        timestamp: new Date().toISOString()
      });
      setPostalCodeQuery(query);
    }, 300),
    []
  );

  // Debounced city search
  const debouncedCitySearch = useMemo(
    () => debounce((query: string) => {
      console.log('🕐 DEBOUNCE - City search triggered:', {
        query,
        length: query.length,
        timestamp: new Date().toISOString()
      });
      setCityQuery(query);
    }, 300),
    []
  );

  // Helper function to detect if input looks like a complete postal code
  const isLikelyPostalCode = (query: string): boolean => {
    // Check if it's mostly numbers and appropriate length for EU postal codes (2-5 digits)
    const cleanQuery = query.trim();
    const isPostalPattern = /^\d{2,5}$/.test(cleanQuery);
    console.log('🔍 isLikelyPostalCode check:', { query: cleanQuery, isPostalPattern });
    return isPostalPattern;
  };

  // Search postal codes - use unlimited search for postal code patterns
  const { data: postalCodeResults = [] } = useQuery<PostalCodeResult[]>({
    queryKey: ['postal-codes', postalCodeQuery, country || defaultCountry],
    queryFn: () => {
      const countryCode = country || defaultCountry || 'BE';
      console.log('🔍 USEQUERY - Postal codes query executing:', { 
        postalCodeQuery, 
        countryCode,
        isLikelyPostalCode: isLikelyPostalCode(postalCodeQuery),
        timestamp: new Date().toISOString()
      });
      
      if (isLikelyPostalCode(postalCodeQuery)) {
        console.log('🔍 USEQUERY - Using unlimited search for postal pattern');
        return searchPostalCodesUnlimited(postalCodeQuery, countryCode);
      }
      console.log('🔍 USEQUERY - Using limited search for general query');
      return searchPostalCodes(postalCodeQuery, countryCode, 50);
    },
    enabled: postalCodeQuery.length >= 2,
  });

  // Get cities by postal code
  const { data: citiesFromPostal = [] } = useQuery<PostalCodeResult[]>({
    queryKey: ['cities-by-postal', postalCode, country],
    queryFn: () => getCitiesByPostalCode(postalCode, country),
    enabled: postalCode.length >= 3,
  });

  // Search cities directly - use higher limit for city searches
  const { data: cityResults = [] } = useQuery<PostalCodeResult[]>({
    queryKey: ['cities', cityQuery, country],
    queryFn: () => searchPostalCodes(cityQuery, country, 100),
    enabled: cityQuery.length >= 2,
  });

  // Handle postal code input change
  const handlePostalCodeChange = (value: string) => {
    console.log('📝 POSTAL CODE CHANGE - handlePostalCodeChange called:', {
      value,
      length: value.length,
      timestamp: new Date().toISOString()
    });
    
    onPostalCodeChange(value);
    
    console.log('📝 POSTAL CODE CHANGE - Calling debounced search:', {
      value,
      debouncedFunction: typeof debouncedPostalCodeSearch,
      timestamp: new Date().toISOString()
    });
    debouncedPostalCodeSearch(value);
    
    // Auto-fill city if we have a match
    if (citiesFromPostal.length === 1) {
      console.log('📝 POSTAL CODE CHANGE - Auto-filling city:', citiesFromPostal[0].city);
      onCityChange(citiesFromPostal[0].city);
    }
  };

  // Handle city input change
  const handleCityChange = (value: string) => {
    onCityChange(value);
    debouncedCitySearch(value);
  };


  // Prepare postal code options
  const postalCodeOptions: ComboboxOption[] = useMemo(() => {
    return postalCodeResults.map(result => ({
      value: result.postal_code,
      label: result.postal_code,
      extra: `${result.city}, ${result.country_name}`
    }));
  }, [postalCodeResults]);

  // Prepare city options
  const cityOptions: ComboboxOption[] = [...citiesFromPostal, ...cityResults]
    .filter((result, index, self) => 
      self.findIndex(r => r.city === result.city && r.postal_code === result.postal_code) === index
    )
    .map(result => ({
      value: result.city,
      label: result.city,
      extra: `${result.postal_code}, ${result.country_name}`
    }));

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Postal Code */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            Code postal
          </Label>
          <div className="relative">
            <Input
              value={postalCode}
              onChange={(e) => {
                handlePostalCodeChange(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Tapez votre code postal..."
              disabled={disabled}
            />
            {/* Show suggestions dropdown if we have postal code options */}
            {showSuggestions && postalCodeOptions.length > 0 && postalCode.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {postalCodeOptions.map((option) => (
                  <div
                    key={option.value}
                    className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm"
                    onClick={() => {
                      handlePostalCodeChange(option.value);
                      // Auto-fill city if available
                      const selectedResult = postalCodeResults.find(r => r.postal_code === option.value);
                      if (selectedResult) {
                        onCityChange(selectedResult.city);
                      }
                      setShowSuggestions(false);
                    }}
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.extra && (
                      <div className="text-xs text-muted-foreground">{option.extra}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* City */}
        <div>
          <Label htmlFor="city" className="mb-2 block">Ville</Label>
          {cityOptions.length > 0 && city.length >= 2 ? (
            <Combobox
              options={cityOptions}
              value={city}
              onValueChange={(value) => {
                onCityChange(value);
                const selectedResult = [...citiesFromPostal, ...cityResults]
                  .find(r => r.city === value);
                if (selectedResult && !postalCode) {
                  onPostalCodeChange(selectedResult.postal_code);
                }
              }}
              placeholder="Sélectionner une ville..."
              searchPlaceholder="Rechercher une ville..."
              emptyMessage="Aucune ville trouvée."
              disabled={disabled}
            />
          ) : (
            <Input
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="Ex: Bruxelles"
              disabled={disabled}
            />
          )}
        </div>
      </div>
    </div>
  );
};