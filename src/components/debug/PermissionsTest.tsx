
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { testAdminClientConfiguration, testClientCreationPermission } from "@/utils/testPermissions";

const PermissionsTest = () => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [adminClientTest, setAdminClientTest] = useState<{ success: boolean; message: string } | null>(null);
  const [clientCreationTest, setClientCreationTest] = useState<{ success: boolean; message: string; clientId?: string } | null>(null);
  
  const runTests = async () => {
    setIsRunningTest(true);
    
    try {
      // Test de la configuration du client admin
      const adminClientResult = await testAdminClientConfiguration();
      setAdminClientTest(adminClientResult);
      
      // Si la configuration admin est correcte, tester la création de client
      if (adminClientResult.success) {
        const clientResult = await testClientCreationPermission();
        setClientCreationTest({
          success: clientResult.success,
          message: clientResult.success 
            ? "Test de création de client réussi!" 
            : clientResult.message || "Erreur inconnue",
          clientId: clientResult.clientId
        });
      }
    } catch (error) {
      console.error("Erreur lors des tests:", error);
    } finally {
      setIsRunningTest(false);
    }
  };
  
  const getStatusBadge = (success: boolean) => {
    if (success) {
      return <Badge className="bg-green-500">Réussi</Badge>;
    } else {
      return <Badge className="bg-red-500">Échoué</Badge>;
    }
  };
  
  const getStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test des permissions Supabase</CardTitle>
        <CardDescription>
          Cet outil permet de tester la configuration des permissions et des clés d'API Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(adminClientTest || clientCreationTest) && (
          <Alert className={adminClientTest?.success ? "bg-green-50" : "bg-red-50"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Résultat des tests</AlertTitle>
            <AlertDescription>
              {adminClientTest && !adminClientTest.success ? (
                "La configuration du client administrateur a échoué. Veuillez vérifier votre clé de service."
              ) : (
                clientCreationTest && !clientCreationTest.success ? (
                  "La création de client a échoué. Vérifiez les politiques RLS de votre base de données."
                ) : (
                  "Les tests ont réussi! Votre application devrait fonctionner correctement."
                )
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              {adminClientTest ? getStatusIcon(adminClientTest.success) : <AlertTriangle className="h-6 w-6 text-yellow-500" />}
              <div>
                <h3 className="font-medium">Configuration du client admin</h3>
                <p className="text-sm text-muted-foreground">
                  {adminClientTest ? adminClientTest.message : "Non testé"}
                </p>
              </div>
            </div>
            {adminClientTest && getStatusBadge(adminClientTest.success)}
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              {clientCreationTest ? getStatusIcon(clientCreationTest.success) : <AlertTriangle className="h-6 w-6 text-yellow-500" />}
              <div>
                <h3 className="font-medium">Création de client</h3>
                <p className="text-sm text-muted-foreground">
                  {clientCreationTest ? clientCreationTest.message : "Non testé"}
                </p>
              </div>
            </div>
            {clientCreationTest && getStatusBadge(clientCreationTest.success)}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={runTests} 
          disabled={isRunningTest}
          className="w-full"
        >
          {isRunningTest ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exécution des tests...
            </>
          ) : (
            "Tester les permissions"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PermissionsTest;
