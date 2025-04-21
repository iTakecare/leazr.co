
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Check, Info } from 'lucide-react';
import { testClientCreationPermission, testAdminClientConfiguration } from "@/utils/testPermissions";
import { toast } from 'sonner';
import AmbassadorErrorHandler from './AmbassadorErrorHandler';

const PermissionsTest = () => {
  const [isTestingClient, setIsTestingClient] = useState(false);
  const [isTestingAdmin, setIsTestingAdmin] = useState(false);
  const [clientResult, setClientResult] = useState<any>(null);
  const [adminResult, setAdminResult] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

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

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Outils de diagnostic</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? 'Masquer' : 'Afficher'} les outils
        </Button>
      </div>
      
      {showDebug && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Button 
                onClick={handleTestClientCreation} 
                disabled={isTestingClient}
                className="w-full"
              >
                {isTestingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tester la création de client
              </Button>
              
              {clientResult && (
                <Alert 
                  variant={clientResult.success ? "default" : "destructive"}
                  className="mt-2"
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
            
            <div>
              <Button 
                onClick={handleTestAdminConfig} 
                disabled={isTestingAdmin}
                variant="outline"
                className="w-full"
              >
                {isTestingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tester la configuration admin
              </Button>
              
              {adminResult && (
                <Alert 
                  variant={adminResult.success ? "default" : "destructive"}
                  className="mt-2"
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
          </div>
          
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
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default PermissionsTest;
