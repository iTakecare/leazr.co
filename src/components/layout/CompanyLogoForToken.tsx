import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import Logo from "./Logo";

interface CompanyLogoForTokenProps {
  companyId: string | null;
  className?: string;
  showText?: boolean;
  logoSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "avatar";
  textSize?: "xs" | "sm" | "base" | "lg";
}

const CompanyLogoForToken: React.FC<CompanyLogoForTokenProps> = ({ 
  companyId,
  className, 
  showText = false, 
  logoSize = "lg", 
  variant = "avatar",
  textSize = "lg"
}) => {
  const [companyData, setCompanyData] = useState<{
    logo_url?: string;
    company_name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32",
    xl: "w-40 h-40",
    "2xl": "w-48 h-48"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg"
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('company_customizations')
          .select('logo_url, company_name')
          .eq('company_id', companyId)
          .single();

        if (error) {
          console.error('Erreur lors de la récupération des données de l\'entreprise:', error);
          setCompanyData(null);
        } else {
          setCompanyData(data);
        }
      } catch (err) {
        console.error('Exception lors de la récupération des données de l\'entreprise:', err);
        setCompanyData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyId]);

  // Si on charge encore ou s'il n'y a pas de données d'entreprise, afficher le logo par défaut
  if (loading || !companyData?.logo_url) {
    return <Logo className={className} showText={showText} logoSize={logoSize} variant={variant} />;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative flex-shrink-0", sizeClasses[logoSize])}>
        <img 
          src={companyData.logo_url}
          alt={companyData.company_name || "Logo de l'entreprise"}
          className="w-full h-full object-contain"
          onError={(e) => {
            // En cas d'erreur de chargement, utiliser le logo par défaut
            const target = e.target as HTMLImageElement;
            target.src = "/leazr-logo.png";
            target.alt = "Leazr";
          }}
        />
      </div>
      {showText && companyData.company_name && (
        <span className={cn("font-semibold", textSizeClasses[textSize])}>
          {companyData.company_name}
        </span>
      )}
    </div>
  );
};

export default CompanyLogoForToken;