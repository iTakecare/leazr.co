import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle } from "lucide-react";
import { validateIBAN, formatIBAN, getIBANCountry } from "@/utils/ibanValidator";

interface IBANInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
  label?: string;
  required?: boolean;
  showBIC?: boolean;
  bicValue?: string;
  onBICChange?: (value: string) => void;
}

const IBANInput: React.FC<IBANInputProps> = ({
  value,
  onChange,
  error,
  label = "IBAN",
  required = false,
  showBIC = false,
  bicValue = "",
  onBICChange
}) => {
  const [displayValue, setDisplayValue] = useState(formatIBAN(value));
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    country: string;
    countryName: string;
    error?: string;
  } | null>(null);
  const [isTouched, setIsTouched] = useState(false);
  const [isInternalChange, setIsInternalChange] = useState(false);

  useEffect(() => {
    // Ne synchroniser displayValue que si le changement vient de l'extérieur (pas de l'input)
    if (!isInternalChange && value) {
      setDisplayValue(formatIBAN(value));
    }
    setIsInternalChange(false);
    
    // Mettre à jour la validation
    if (value) {
      const result = validateIBAN(value);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '').toUpperCase();
    setDisplayValue(formatIBAN(rawValue));
    setIsInternalChange(true);
    
    if (rawValue.length >= 5) {
      const result = validateIBAN(rawValue);
      setValidationResult(result);
      onChange(rawValue, result.isValid);
    } else {
      setValidationResult(null);
      onChange(rawValue, false);
    }
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  const showError = isTouched && validationResult && !validationResult.isValid;
  const showSuccess = validationResult?.isValid;
  const country = getIBANCountry(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="iban" className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {country && (
          <Badge variant="outline" className="text-xs">
            {country.name}
          </Badge>
        )}
      </div>
      
      <div className="relative">
        <Input
          id="iban"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="BE00 0000 0000 0000"
          className={`pr-10 font-mono text-sm ${
            showError ? 'border-destructive focus-visible:ring-destructive' : ''
          } ${showSuccess ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {showSuccess && (
            <Check className="h-4 w-4 text-green-500" />
          )}
          {showError && (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      
      {showError && validationResult?.error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {validationResult.error}
        </p>
      )}
      
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      
      {showSuccess && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          IBAN valide ({validationResult?.countryName})
        </p>
      )}
      
      {showBIC && (
        <div className="mt-3 space-y-2">
          <Label htmlFor="bic">BIC / SWIFT (optionnel)</Label>
          <Input
            id="bic"
            value={bicValue}
            onChange={(e) => onBICChange?.(e.target.value.toUpperCase())}
            placeholder="GEBABEBB"
            className="font-mono text-sm"
            maxLength={11}
          />
          <p className="text-xs text-muted-foreground">
            Code d'identification de la banque (8 ou 11 caractères)
          </p>
        </div>
      )}
    </div>
  );
};

export default IBANInput;
