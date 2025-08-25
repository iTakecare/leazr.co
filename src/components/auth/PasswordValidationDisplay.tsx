import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordValidation } from '@/hooks/usePasswordValidation';

interface PasswordValidationDisplayProps {
  validation: PasswordValidation;
  className?: string;
}

const PasswordValidationDisplay: React.FC<PasswordValidationDisplayProps> = ({ 
  validation, 
  className 
}) => {
  // Debug logging
  console.log("🎯 PasswordValidationDisplay render:", { validation, className });
  
  // Error boundary fallback
  if (!validation) {
    console.error("❌ PasswordValidationDisplay: No validation object provided");
    return (
      <div className={cn("text-red-500 text-sm", className)}>
        Erreur: Validation non disponible
      </div>
    );
  }
  const requirements = [
    { 
      key: 'minLength', 
      label: 'Au moins 6 caractères', 
      isValid: validation.minLength 
    },
    { 
      key: 'hasUppercase', 
      label: 'Une lettre majuscule (A-Z)', 
      isValid: validation.hasUppercase 
    },
    { 
      key: 'hasLowercase', 
      label: 'Une lettre minuscule (a-z)', 
      isValid: validation.hasLowercase 
    },
    { 
      key: 'hasNumber', 
      label: 'Un chiffre (0-9)', 
      isValid: validation.hasNumber 
    },
    { 
      key: 'hasSpecialChar', 
      label: 'Un caractère spécial (!@#$%^&*)', 
      isValid: validation.hasSpecialChar 
    },
  ];

  return (
    <div className={cn("space-y-2 text-sm", className)}>
      <p className="font-medium text-muted-foreground">Le mot de passe doit contenir :</p>
      <ul className="space-y-1">
        {requirements.map((requirement) => (
          <li key={requirement.key} className="flex items-center gap-2">
            {requirement.isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
            <span className={cn(
              "text-sm",
              requirement.isValid ? "text-green-700" : "text-red-700"
            )}>
              {requirement.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordValidationDisplay;