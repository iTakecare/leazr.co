
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  testClientCreationPermission, 
  testOfferCreationPermission, 
  runAllPermissionsTests 
} from '@/utils/testPermissions';
import { Shield, User, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PermissionsTest = () => {
  const [isTestingClient, setIsTestingClient] = React.useState(false);
  const [isTestingOffer, setIsTestingOffer] = React.useState(false);
  const [isTestingAll, setIsTestingAll] = React.useState(false);
  const [clientTestResult, setClientTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [offerTestResult, setOfferTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [allTestsResult, setAllTestsResult] = React.useState<{ success: boolean; message: string } | null>(null);

  const handleTestClientPermission = async () => {
    setIsTestingClient(true);
    setClientTestResult(null);
    try {
      const result = await testClientCreationPermission();
      setClientTestResult({ 
        success: result, 
        message: result 
          ? "Test de création de client réussi!" 
          : "Échec du test de création de client."
      });
    } catch (error) {
      setClientTestResult({ 
        success: false, 
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setIsTestingClient(false);
    }
  };

  const handleTestOfferPermission = async () => {
    setIsTestingOffer(true);
    setOfferTestResult(null);
    try {
      const result = await testOfferCreationPermission();
      setOfferTestResult({ 
        success: result, 
        message: result 
          ? "Test de création d'offre réussi!" 
          : "Échec du test de création d'offre."
      });
    } catch (error) {
      setOfferTestResult({ 
        success: false, 
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setIsTestingOffer(false);
    }
  };

  const handleTestAllPermissions = async () => {
    setIsTestingAll(true);
    setAllTestsResult(null);
    setClientTestResult(null);
    setOfferTestResult(null);
    try {
      await runAllPermissionsTests();
      setAllTestsResult({ 
        success: true, 
        message: "Tous les tests ont été exécutés."
      });
    } catch (error) {
      setAllTestsResult({ 
        success: false, 
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setIsTestingAll(false);
    }
  };

  const renderTestResult = (result: { success: boolean; message: string } | null) => {
    if (!result) return null;
    
    return (
      <Alert className={`mt-2 ${result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        {result.success 
          ? <CheckCircle2 className="h-4 w-4 text-green-600" /> 
          : <XCircle className="h-4 w-4 text-red-600" />}
        <AlertTitle>{result.success ? 'Succès' : 'Échec'}</AlertTitle>
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Test des permissions Supabase
        </CardTitle>
        <CardDescription>
          Vérifiez si les permissions RLS sont correctement configurées
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <p className="text-sm text-muted-foreground">
            Ces tests vérifient si les permissions RLS permettent la création de clients et d'offres
            pour les utilisateurs non authentifiés (comme lors d'une demande public).
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 w-full">
        <div className="w-full">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleTestClientPermission}
            disabled={isTestingClient}
          >
            {isTestingClient ? (
              <>
                <User className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Tester la création de client
              </>
            )}
          </Button>
          {renderTestResult(clientTestResult)}
        </div>

        <div className="w-full">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={handleTestOfferPermission}
            disabled={isTestingOffer}
          >
            {isTestingOffer ? (
              <>
                <FileText className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Tester la création d'offre
              </>
            )}
          </Button>
          {renderTestResult(offerTestResult)}
        </div>

        <div className="w-full">
          <Button 
            className="w-full" 
            onClick={handleTestAllPermissions}
            disabled={isTestingAll}
          >
            {isTestingAll ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4 animate-spin" />
                Exécution de tous les tests...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Exécuter tous les tests
              </>
            )}
          </Button>
          {renderTestResult(allTestsResult)}
        </div>
      </CardFooter>
    </Card>
  );
};

export default PermissionsTest;
