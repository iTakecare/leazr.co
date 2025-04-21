
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Loader2, KeyRound, Database, Globe } from "lucide-react";
import { testAdminClientConfiguration, testClientCreationPermission } from "@/utils/testPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

const PermissionsTest = () => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [activeTab, setActiveTab] = useState("tests");
  const [adminClientTest, setAdminClientTest] = useState<{ success: boolean; message: string } | null>(null);
  const [clientCreationTest, setClientCreationTest] = useState<{ success: boolean; message: string; clientId?: string } | null>(null);
  
  const runTests = async () => {
    setIsRunningTest(true);
    
    try {
      // Reset previous results
      setAdminClientTest(null);
      setClientCreationTest(null);
      
      // Test de la configuration du client admin
      console.log("Démarrage des tests du client admin...");
      const adminClientResult = await testAdminClientConfiguration();
      setAdminClientTest(adminClientResult);
      console.log("Résultat des tests du client admin:", adminClientResult);
      
      // Si la configuration admin est correcte, tester la création de client
      if (adminClientResult.success) {
        console.log("Démarrage des tests de création de client...");
        const clientResult = await testClientCreationPermission();
        setClientCreationTest({
          success: clientResult.success,
          message: clientResult.success 
            ? "Test de création de client réussi!" 
            : clientResult.message || "Erreur inconnue",
          clientId: clientResult.clientId
        });
        console.log("Résultat des tests de création de client:", clientResult);
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
        <Tabs defaultValue="tests" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="help">Aide</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tests" className="space-y-4">
            {(adminClientTest || clientCreationTest) && (
              <Alert className={adminClientTest?.success ? "bg-green-50" : "bg-red-50"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Résultat des tests</AlertTitle>
                <AlertDescription>
                  {adminClientTest && !adminClientTest.success ? (
                    "La configuration du client administrateur a échoué. Veuillez vérifier votre clé de service et les paramètres d'accès."
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
          </TabsContent>
          
          <TabsContent value="config" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertTitle>Configuration des clés API</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-xs font-semibold">URL Supabase:</span>
                      <code className="text-xs ml-2 bg-muted px-1 py-0.5 rounded">
                        {SUPABASE_URL}
                      </code>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Clé publique:</span>
                      <code className="text-xs ml-2 bg-muted px-1 py-0.5 rounded">
                        {SUPABASE_PUBLISHABLE_KEY.substring(0, 10)}...{SUPABASE_PUBLISHABLE_KEY.substring(SUPABASE_PUBLISHABLE_KEY.length - 10)}
                      </code>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Clé service:</span>
                      <code className="text-xs ml-2 bg-muted px-1 py-0.5 rounded">
                        {SERVICE_ROLE_KEY && SERVICE_ROLE_KEY.length > 20 
                          ? `${SERVICE_ROLE_KEY.substring(0, 10)}...${SERVICE_ROLE_KEY.substring(SERVICE_ROLE_KEY.length - 10)}`
                          : "Invalide ou non définie"
                        }
                      </code>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert className="bg-blue-50">
                <Database className="h-4 w-4" />
                <AlertTitle>Vérification des politiques RLS</AlertTitle>
                <AlertDescription>
                  <p className="mt-2 text-sm">
                    Pour que la création de clients fonctionne avec la clé de service, assurez-vous que:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
                    <li>Votre clé de service (SERVICE_ROLE_KEY) est correcte</li>
                    <li>Aucune restriction IP n'est configurée dans les paramètres du projet Supabase</li>
                    <li>Les politiques RLS pour la table 'clients' autorisent les opérations avec la clé de service</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <Alert className="bg-amber-50">
                <Globe className="h-4 w-4" />
                <AlertTitle>Restrictions IP et Accès</AlertTitle>
                <AlertDescription>
                  <p className="mt-2 text-sm">
                    Si vous avez configuré des restrictions IP dans votre projet Supabase:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
                    <li>Vérifiez que l'adresse IP de votre serveur/hôte est autorisée</li>
                    <li>Essayez temporairement de désactiver les restrictions IP pour tester</li>
                    <li>Vérifiez que les requêtes ne sont pas bloquées par un pare-feu</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
          
          <TabsContent value="help" className="space-y-4">
            <Alert>
              <AlertTitle>Dépannage courant</AlertTitle>
              <AlertDescription>
                <ul className="list-disc ml-6 mt-2 text-sm space-y-2">
                  <li>
                    <strong>Erreur "JWT expired"</strong>: Vérifiez que votre clé de service est à jour. Si elle a expiré, 
                    régénérez-la dans le tableau de bord Supabase.
                  </li>
                  <li>
                    <strong>Erreur "Invalid API key"</strong>: Assurez-vous que la clé de service est correctement 
                    copiée sans espaces supplémentaires.
                  </li>
                  <li>
                    <strong>Erreur RLS</strong>: En tant qu'administrateur, vérifiez les politiques RLS pour la table clients
                    et assurez-vous qu'elles permettent les opérations avec la clé de service.
                  </li>
                  <li>
                    <strong>Problèmes d'authentification</strong>: Vérifiez que vous utilisez bien getAdminSupabaseClient() 
                    pour les opérations administratives sensibles, sans mélanger les sessions.
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="p-4 border rounded bg-slate-50">
              <h3 className="font-medium mb-2">Pourquoi ça fonctionne pour les ambassadeurs mais pas les admins?</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Si les ambassadeurs peuvent créer des clients mais pas les administrateurs, cela peut être dû à:
              </p>
              <ul className="list-disc ml-6 text-sm space-y-1">
                <li>Des politiques RLS différentes selon le rôle utilisateur</li>
                <li>Une configuration différente de la façon dont les clients sont créés</li>
                <li>Un problème avec la manière dont le client admin est utilisé dans le contexte administrateur</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
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
