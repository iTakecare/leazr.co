
import React from "react";
import { Building, MapPin } from "lucide-react";

interface CompanyInfoProps {
  company: string;
  vat_number?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

const CompanyInfoSection = ({
  company,
  vat_number,
  address,
  postal_code,
  city,
  country,
}: CompanyInfoProps) => {
  if (!company) return null;
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Informations entreprise
      </h3>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span>{company}</span>
        </div>
        {vat_number && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>TVA: {vat_number}</span>
          </div>
        )}
        {address && (
          <div className="text-sm text-muted-foreground mt-1">
            {address}
            <br />
            {postal_code} {city}
            {country && `, ${country}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyInfoSection;
