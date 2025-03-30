
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Building, ArrowRight, Loader2 } from "lucide-react";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SignupBusiness = () => {
  const [businessNumber, setBusinessNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const navigate = useNavigate();
  
  const validateBusinessNumber = () => {
    // Ceci est une validation simple - en production, nous aurions une API réelle pour vérifier
    return businessNumber.trim().length > 5;
  };
  
  const handleCheckBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateBusinessNumber()) {
      toast.error("Veuillez saisir un numéro d'entreprise valide");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Rechercher d'abord si l'entreprise existe déjà dans notre base
      const { data: existingCompany, error } = await supabase
        .from('clients')
        .select('*')
        .eq('business_number', businessNumber)
        .single();
      
      // Si nous trouvons une entreprise existante
      if (existingCompany) {
        setBusinessInfo(existingCompany);
        toast.success("Entreprise trouvée dans notre base de données");
      } else {
        // Simulation d'une recherche dans une API externe
        // Dans un environnement réel, nous utiliserions une API comme celle de la BCE
        setTimeout(() => {
          // Simuler une entreprise trouvée
          const mockedCompanyInfo = {
            name: `Entreprise ${businessNumber}`,
            address: "Rue Example 123, 1000 Bruxelles",
            vat_number: businessNumber
          };
          
          setBusinessInfo(mockedCompanyInfo);
          toast.success("Entreprise trouvée");
        }, 1500);
      }
    } catch (error) {
      console.error("Error checking business", error);
      toast.error("Une erreur s'est produite lors de la vérification");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleContinue = () => {
    // Stocker temporairement les informations de l'entreprise dans sessionStorage
    if (businessInfo) {
      sessionStorage.setItem('businessInfo', JSON.stringify(businessInfo));
      navigate('/signup', { state: { businessInfo } });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-8 text-center">Créer un compte entreprise</h1>
          
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">1</span>
              <span className="font-medium">Numéro d'entreprise</span>
              <span className="flex-1 border-t border-dashed border-gray-300 mx-2"></span>
              <span className="bg-gray-100 text-gray-400 px-2 py-1 rounded">2</span>
              <span className="text-gray-400">Informations</span>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Identifiez votre entreprise</CardTitle>
              <CardDescription>
                Entrez votre numéro d'entreprise (TVA ou BCE) pour commencer
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleCheckBusiness}>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessNumber">Numéro d'entreprise</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="businessNumber"
                        placeholder="BE0123456789"
                        value={businessNumber}
                        onChange={(e) => setBusinessNumber(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Format: BE + 10 chiffres sans espaces (ex: BE0123456789)
                    </p>
                  </div>
                  
                  {businessInfo && (
                    <div className="mt-6 p-4 border rounded-lg bg-blue-50 border-blue-100">
                      <h3 className="font-medium mb-2">Entreprise trouvée :</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Nom:</span> {businessInfo.name || businessInfo.company}</p>
                        <p><span className="font-medium">Adresse:</span> {businessInfo.address}</p>
                        <p><span className="font-medium">N° TVA:</span> {businessInfo.vat_number || businessInfo.business_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                {!businessInfo ? (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !businessNumber.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      "Vérifier l'entreprise"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleContinue}
                  >
                    Continuer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignupBusiness;
