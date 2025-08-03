import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { useQuery } from '@tanstack/react-query';
import { 
  searchPostalCodes, 
  getCitiesByPostalCode, 
  getCountries,
  getDefaultCountryForCompany,
  CountryOption,
  PostalCodeResult 
} from '@/services/postalCodeService';
import { debounce } from 'lodash';
import { MapPin, Flag } from 'lucide-react';

interface PostalCodeInputProps {
  postalCode: string;
  city: string;
  country: string;
  onPostalCodeChange: (postalCode: string) => void;
  onCityChange: (city: string) => void;
  onCountryChange: (country: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PostalCodeInput: React.FC<PostalCodeInputProps> = ({
  postalCode,
  city,
  country,
  onPostalCodeChange,
  onCityChange,
  onCountryChange,
  disabled = false,
  className,
}) => {
  const [postalCodeQuery, setPostalCodeQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  // Fetch available countries
  const { data: countries = [] } = useQuery<CountryOption[]>({
    queryKey: ['countries'],
    queryFn: getCountries,
  });

  // Get default country for company
  const { data: defaultCountry } = useQuery({
    queryKey: ['default-country'],
    queryFn: getDefaultCountryForCompany,
  });

  // Set default country when available
  useEffect(() => {
    if (defaultCountry && !country) {
      onCountryChange(defaultCountry);
    }
  }, [defaultCountry, country, onCountryChange]);

  // Debounced postal code search
  const debouncedPostalCodeSearch = useMemo(
    () => debounce((query: string) => setPostalCodeQuery(query), 300),
    []
  );

  // Debounced city search
  const debouncedCitySearch = useMemo(
    () => debounce((query: string) => setCityQuery(query), 300),
    []
  );

  // Search postal codes
  const { data: postalCodeResults = [] } = useQuery<PostalCodeResult[]>({
    queryKey: ['postal-codes', postalCodeQuery, country],
    queryFn: () => searchPostalCodes(postalCodeQuery, country),
    enabled: postalCodeQuery.length >= 2,
  });

  // Get cities by postal code
  const { data: citiesFromPostal = [] } = useQuery<PostalCodeResult[]>({
    queryKey: ['cities-by-postal', postalCode, country],
    queryFn: () => getCitiesByPostalCode(postalCode, country),
    enabled: postalCode.length >= 3,
  });

  // Search cities directly
  const { data: cityResults = [] } = useQuery<PostalCodeResult[]>({
    queryKey: ['cities', cityQuery, country],
    queryFn: () => searchPostalCodes(cityQuery, country),
    enabled: cityQuery.length >= 2,
  });

  // Handle postal code input change
  const handlePostalCodeChange = (value: string) => {
    onPostalCodeChange(value);
    debouncedPostalCodeSearch(value);
    
    // Auto-fill city if we have a match
    if (citiesFromPostal.length === 1) {
      onCityChange(citiesFromPostal[0].city);
    }
  };

  // Handle city input change
  const handleCityChange = (value: string) => {
    onCityChange(value);
    debouncedCitySearch(value);
  };

  // Prepare country options for combobox
  const countryOptions: ComboboxOption[] = countries.map(country => ({
    value: country.code,
    label: `${country.flag} ${country.name_fr}`,
    extra: country.name_en
  }));

  // Prepare postal code options
  const postalCodeOptions: ComboboxOption[] = postalCodeResults.map(result => ({
    value: result.postal_code,
    label: result.postal_code,
    extra: `${result.city}, ${result.country_name}`
  }));

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
      {/* Country Selection */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Flag className="h-4 w-4" />
          Pays
        </Label>
        <Combobox
          options={countryOptions}
          value={country}
          onValueChange={onCountryChange}
          placeholder="Sélectionner un pays..."
          searchPlaceholder="Rechercher un pays..."
          emptyMessage="Aucun pays trouvé."
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Postal Code */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            Code postal
          </Label>
          {postalCodeOptions.length > 0 && postalCode.length >= 2 ? (
            <Combobox
              options={postalCodeOptions}
              value={postalCode}
              onValueChange={(value) => {
                onPostalCodeChange(value);
                const selectedResult = postalCodeResults.find(r => r.postal_code === value);
                if (selectedResult) {
                  onCityChange(selectedResult.city);
                }
              }}
              placeholder="Sélectionner un code postal..."
              searchPlaceholder="Rechercher un code postal..."
              emptyMessage="Aucun code postal trouvé."
              disabled={disabled}
            />
          ) : (
            <Input
              value={postalCode}
              onChange={(e) => handlePostalCodeChange(e.target.value)}
              placeholder="Ex: 1000"
              disabled={disabled}
            />
          )}
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