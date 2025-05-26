
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, User } from "lucide-react";
import { toast } from "sonner";

const CreateLeazrAdmin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const createLeazrAdmin = async () => {
    try {
      setIsLoading(true);
      
      const adminData = {
        email: "ecommerce@itakecare.be",
        password: "Leazr2024#SecureAdmin!",
        first_name: "Admin",
        last_name: "Leazr",
        role: "admin"
      };

      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: adminData
      });

      if (error) {
        throw error;
      }

      setResult({
        success: true,
        email: adminData.email,
        password: adminData.password,
        message: "Utilisateur administrateur Leazr créé avec succès"
      });
      
      toast.success('Administrateur Leazr créé avec succès');
    } catch (error: any) {
      console.error('Error creating Leazr admin:', error);
      setResult({
        success: false,
        message: error.message || 'Erreur lors de la création de l\'administrateur Leazr'
      });
      toast.error(error.message || 'Erreur lors de la création de l\'administrateur Leazr');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold mb-6">Créer l'administrateur Leazr</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Administrateur Leazr
          </CardTitle>
          <CardDescription>
            Créer un compte administrateur pour la gestion des comptes et clients Leazr avec l'email ecommerce@itakecare.be
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              Cet utilisateur sera créé avec les privilèges d'administrateur pour gérer les comptes et clients Leazr.
              Email: ecommerce@itakecare.be
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardContent className="pt-0">
          <Button 
            onClick={createLeazrAdmin} 
            disabled={isLoading || result?.success}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : result?.success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Administrateur créé
              </>
            ) : (
              "Créer l'administrateur Leazr"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Résultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Succès</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {result.message}
                  </AlertDescription>
                </Alert>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Informations de connexion:</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Email:</span> {result.email}
                    </div>
                    <div>
                      <span className="font-medium">Mot de passe:</span> 
                      <code className="ml-2 bg-white px-2 py-1 rounded border">
                        {result.password}
                      </code>
                    </div>
                  </div>
                  
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Notez ces informations en lieu sûr. Le mot de passe généré est robuste et sécurisé.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Erreur</AlertTitle>
                <AlertDescription className="text-red-700">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default CreateLeazrAdmin;
