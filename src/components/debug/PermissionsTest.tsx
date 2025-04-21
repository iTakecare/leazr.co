
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Check, Info, Database, Key, RefreshCw } from 'lucide-react';
import { testClientCreationPermission, testAdminClientConfiguration, testOffersRetrieval } from "@/utils/testPermissions";
import { toast } from 'sonner';
import AmbassadorErrorHandler from './AmbassadorErrorHandler';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PermissionsTest = () => {
  const [isTestingClient, setIsTestingClient] = useState(false);
  const [isTestingAdmin, setIsTestingAdmin] = useState(false);
  const [isTestingOffers, setIsTestingOffers] = useState(false);
  const [clientResult, setClientResult] = useState<any>(null);
  const [adminResult, setAdminResult] = useState<any>(null);
  const [offersResult, setOffersResult] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState("tests");

  const handleTestClientCreation = async () => {
    try {
      setIsTestingClient(true);
      setClientResult(null);
      const result = await testClientCreationPermission();
      setClientResult(result);
      if (result.success) {
        toast.success("Test de création client réussi");
      } else {
        toast.error("Échec du test de création client");
      }
    } catch (error) {
      console.error("Erreur lors du test:", error);
      setClientResult({ success: false, message: error instanceof Error ? error.message : "Erreur inconnue" });
      toast.error("Erreur lors du test de création client");
    } finally {
      setIsTestingClient(false);
    }
  };

  const handleTestAdminConfig = async () => {
    try {
      setIsTestingAdmin(true);
      setAdminResult(null);
      const result = await testAdminClientConfiguration();
      setAdminResult(result);
      if (result.success) {
        toast.success("Configuration admin valide");
      } else {
        toast.error("Configuration admin invalide");
      }
    } catch (error) {
      console.error("Erreur lors du test:", error);
      setAdminResult({ success: false, message: error instanceof Error ? error.message : "Erreur inconnue" });
      toast.error("Erreur lors du test de la configuration admin");
    } finally {
      setIsTestingAdmin(false);
    }
  };
  
  const handleTestOffers = async () => {
    try {
      setIsTestingOffers(true);
      setOffersResult(null);
      const result = await testOffersRetrieval();
      setOffersResult(result);
      if (result.success) {
        toast.success("Récupération des offres réussie");
      } else {
        toast.error("Échec de la récupération des offres");
      }
    } catch (error) {
      console.error("Erreur lors du test des offres:", error);
      setOffersResult({ success: false, message: error instanceof Error ? error.message : "Erreur inconnue" });
      toast.error("Erreur lors du test des offres");
    } finally {
      setIsTestingOffers(false);
    }
  };
  
  const handleRunAllTests = async () => {
    toast.info("Exécution de tous les tests...");
    await handleTestAdminConfig();
    await handleTestClientCreation();
    await handleTestOffers();
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-xl">Outils de diagnostic</CardTitle>
          <CardDescription>Vérification de la configuration Supabase</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? 'Masquer' : 'Afficher'} les outils
        </Button>
      </CardHeader>
      
      {showDebug && (
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="tests">Tests de connexion</TabsTrigger>
              <TabsTrigger value="info">Informations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tests" className="space-y-4">
              <div className="flex gap-4 mb-4">
                <Button 
                  onClick={handleRunAllTests} 
                  className="w-full"
                  disabled={isTestingAdmin || isTestingClient || isTestingOffers}
                >
                  {(isTestingAdmin || isTestingClient || isTestingOffers) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Exécuter tous les tests
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Button 
                    onClick={handleTestAdminConfig} 
                    disabled={isTestingAdmin}
                    variant="outline"
                    className="w-full"
                  >
                    {isTestingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Key className="mr-2 h-4 w-4" />
                    Tester la clé admin
                  </Button>
                  
                  {adminResult && (
                    <Alert 
                      variant={adminResult.success ? "default" : "destructive"}
                    >
                      {adminResult.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {adminResult.success ? "Configuration valide" : "Configuration invalide"}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {adminResult.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleTestClientCreation} 
                    disabled={isTestingClient}
                    variant="outline"
                    className="w-full"
                  >
                    {isTestingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Database className="mr-2 h-4 w-4" />
                    Tester création client
                  </Button>
                  
                  {clientResult && (
                    <Alert 
                      variant={clientResult.success ? "default" : "destructive"}
                    >
                      {clientResult.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {clientResult.success ? "Test réussi" : "Échec du test"}
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {clientResult.message || (clientResult.success 
                          ? "La création de client a réussi" 
                          : "La création de client a échoué")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleTestOffers} 
                    disabled={isTestingOffers}
                    variant="outline"
                    className="w-full"
                  >
                    {isTestingOffers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Tester récupération offres
                  </Button>
                  
                  {offersResult && (
                    <Alert 
                      variant={offersResult.success ? "default" : "destructive"}
                    >
                      {offersResult.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {offersResult.success ? "Récupération réussie" : "Échec de récupération"}
                      </AlertTitle>
                      <AlertDescription className="text-xs space-y-2">
                        <div>{offersResult.message}</div>
                        {offersResult.success && offersResult.data && (
                          <div className="mt-2">
                            <p className="font-medium text-xs">Offres récupérées:</p>
                            <ul className="pl-4 list-disc text-xs">
                              {offersResult.data.map((offer, index) => (
                                <li key={offer.id}>
                                  {offer.client_name || 'Sans nom'} 
                                  ({new Date(offer.created_at).toLocaleDateString()})
                                </li>
                              ))}
                              {offersResult.data.length === 0 && (
                                <li>Aucune offre trouvée</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
              
              {(adminResult?.success === false || clientResult?.success === false || offersResult?.success === false) && (
                <AmbassadorErrorHandler 
                  message="Des problèmes de connexion ont été détectés. Consultez l'outil de diagnostic pour plus d'informations."
                  showDiagnosticInfo={true} 
                />
              )}
            </TabsContent>
            
            <TabsContent value="info">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Informations</AlertTitle>
                <AlertDescription className="text-sm">
                  <p>Si vous ne voyez pas les offres dans la liste, vérifiez les points suivants :</p>
                  <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
                    <li>Les offres sont bien enregistrées en base de données (vérifiez dans la console Supabase)</li>
                    <li>Les politiques RLS permettent à votre utilisateur de lire les offres</li>
                    <li>Le type d'offre est correctement défini lors de la création</li>
                    <li>Le filtre actif dans la liste correspond au type d'offre recherché</li>
                    <li>La clé API Supabase est correcte et n'a pas expiré</li>
                    <li>Vous êtes bien connecté avec un compte ayant les bonnes permissions</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
      
      <CardFooter className="pt-0">
        <p className="text-xs text-muted-foreground">
          Ces outils vous aident à diagnostiquer les problèmes de connexion à Supabase
        </p>
      </CardFooter>
    </Card>
  );
};

export default PermissionsTest;
