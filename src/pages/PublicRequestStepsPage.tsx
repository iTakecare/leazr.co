import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, Phone, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestSteps from '@/components/checkout/RequestSteps';
import { useCart } from '@/context/CartContext';
import { supabase } from "@/integrations/supabase/client";
import CompanyCustomizationService from "@/services/companyCustomizationService";
import UnifiedNavigationBar from "@/components/layout/UnifiedNavigationBar";

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
      <UnifiedNavigationBar 
        mode="cart"
        company={{
          id: company?.id || '',
          name: company?.name || 'Catalogue',
          slug: company?.slug || '',
          logo_url: company?.logo_url,
          contact_phone: company?.contact_phone,
          contact_email: company?.contact_email,
        }}
        backButton={{
          label: "Retour au panier",
          url: `/public/${companyId}/panier`
        }}
        title="Introduire une demande"
      />
      
      <div className="container mx-auto px-4 py-8 mt-24">
        
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