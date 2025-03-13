
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface TestUser {
  email: string;
  status: string;
  password?: string;
  role?: string;
  message?: string;
}

const CreateTestUsers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestUser[]>([]);

  const createTestUsers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-test-users');

      if (error) {
        throw error;
      }

      setResults(data.users);
      toast.success('Utilisateurs de test créés avec succès');
    } catch (error: any) {
      console.error('Error creating test users:', error);
      toast.error(error.message || 'Erreur lors de la création des utilisateurs de test');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
  };

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold mb-6">Créer des utilisateurs de test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Utilisateurs de test</CardTitle>
          <CardDescription>
            Cette page vous permet de créer rapidement des utilisateurs de test avec différents rôles.
            Trois utilisateurs seront créés avec les rôles suivants: admin, partenaire et client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              Cette fonctionnalité est destinée uniquement à des fins de test et de développement.
              Ne l'utilisez pas en production.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={createTestUsers} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer les utilisateurs de test"
            )}
          </Button>
        </CardFooter>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
            <CardDescription>
              Les utilisateurs suivants ont été créés ou existaient déjà. Vous pouvez utiliser ces identifiants pour vous connecter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((user, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium flex items-center gap-2">
                      {user.status === 'created' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      {user.email}
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role || 'N/A'}
                      </span>
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(user.email)}
                      title="Copier l'email"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {user.status === 'created' && user.password && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Mot de passe: {user.password}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(user.password!)}
                        title="Copier le mot de passe"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {user.status === 'exists' && (
                    <p className="text-sm text-muted-foreground">{user.message}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default CreateTestUsers;
