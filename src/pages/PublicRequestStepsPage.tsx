import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, Phone, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestSteps from '@/components/checkout/RequestSteps';
import { useCart } from '@/context/CartContext';
import { supabase } from "@/integrations/supabase/client";
import CompanyCustomizationService from "@/services/companyCustomizationService";

const PublicRequestStepsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { items } = useCart();
  
  // Fetch company info with branding
  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      
      // Apply company branding
      if (data && (data.primary_color || data.secondary_color || data.accent_color)) {
        CompanyCustomizationService.applyCompanyBranding({
          company_id: companyId,
          primary_color: data.primary_color || "#3b82f6",
          secondary_color: data.secondary_color || "#64748b",
          accent_color: data.accent_color || "#8b5cf6",
          logo_url: data.logo_url || ""
        });
      }
      
      return data;
    },
    enabled: !!companyId,
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Company Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company?.logo_url && (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="h-10 w-auto"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{company?.name || "Catalogue"}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {company?.contact_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{company.contact_phone}</span>
                    </div>
                  )}
                  {company?.contact_email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{company.contact_email}</span>
                    </div>
                  )}
                  {company?.website_url && (
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <a 
                        href={company.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        Site web
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                asChild
                className="flex items-center gap-2"
              >
                <Link to={`/public/${companyId}/panier`}>
                  <ArrowLeft className="h-4 w-4" />
                  Retour au panier
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Introduire une demande</h1>
        
        {items.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
            <p className="text-gray-500 mb-6">
              Vous devez ajouter des produits à votre panier avant de faire une demande.
            </p>
            <Button asChild>
              <Link to={`/catalog/anonymous/${companyId}`}>Voir le catalogue</Link>
            </Button>
          </div>
        ) : (
          <RequestSteps companyId={companyId} />
        )}
      </div>
    </div>
  );
};

export default PublicRequestStepsPage;