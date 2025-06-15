import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, Phone, Mail, ExternalLink } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import CompanyCustomizationService from "@/services/companyCustomizationService";

const PublicCartPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();
  
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
  
  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
  };
  
  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      updateQuantity(productId, newQuantity);
    }
  };
  
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
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                asChild
                className="flex items-center gap-2"
              >
                <Link to={`/public/${companyId}/catalog`}>
                  <ArrowLeft className="h-4 w-4" />
                  Continuer mes achats
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Mon panier</h1>
        
        {items.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Votre panier est vide</h3>
            <p className="text-gray-500 mb-6">
              Parcourez notre catalogue pour trouver des équipements à louer.
            </p>
            <Button asChild>
              <Link to={`/public/${companyId}/catalog`}>Voir le catalogue</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-medium mb-4">Articles ({items.length})</h2>
                  
                  <div className="space-y-6">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          <img 
                            src={item.product.image_url || '/placeholder.svg'} 
                            alt={item.product.name}
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium">{item.product.name}</h3>
                              <p className="text-sm text-gray-500">
                                {item.product.brand && `${item.product.brand} • `}
                                {item.duration} mois
                              </p>
                              
                              {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {Object.entries(item.selectedOptions).map(([key, value], index, arr) => (
                                    <span key={key}>
                                      {key}: {value}
                                      {index < arr.length - 1 ? ' | ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <p className="font-medium text-blue-600">
                                {formatCurrency(item.product.monthly_price)} / mois
                              </p>
                              <div className="flex items-center mt-1">
                                <button 
                                  className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-l"
                                  onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                                >
                                  -
                                </button>
                                <span className="w-8 h-6 flex items-center justify-center border-t border-b border-gray-300">
                                  {item.quantity}
                                </span>
                                <button 
                                  className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded-r"
                                  onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveItem(item.product.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Supprimer
                            </Button>
                            
                            <p className="text-sm text-gray-500">
                              Sous-total: <span className="font-medium">{formatCurrency(item.product.monthly_price * item.quantity)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-4">
                <div className="p-6">
                  <h2 className="text-lg font-medium mb-4">Récapitulatif</h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sous-total mensuel</span>
                      <span className="font-medium">{formatCurrency(cartTotal)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frais de livraison</span>
                      <span className="font-medium">Gratuit</span>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="flex justify-between text-lg">
                      <span className="font-medium">Total mensuel</span>
                      <span className="font-bold text-blue-600">{formatCurrency(cartTotal)}</span>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Prix HT pour une durée de 36 mois. Engagement ferme.
                    </p>
                  </div>
                  
                  <Button className="w-full mt-6" size="lg" asChild>
                    <Link to={`/public/${companyId}/demande`}>
                      Passer ma demande
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCartPage;